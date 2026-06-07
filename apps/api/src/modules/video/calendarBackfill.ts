import { BookingStatus } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import {
  createGoogleMeetForUserCalendar,
  createLinkedCalendarEventForUserCalendar
} from "./googleMeet.service.js";
import {
  decodeGoogleMeetSyncTargets,
  encodeGoogleMeetSyncTargets,
  type GoogleMeetOwnerTarget
} from "./meetSyncTargets.js";

/**
 * Después de que un usuario completa el OAuth de Google Calendar (paciente o
 * profesional), recorremos sus bookings CONFIRMED futuras y, para las que
 * todavía no tienen Meet en una cuenta de usuario, creamos el evento + Meet
 * usando los tokens recién obtenidos.
 *
 * Casos cubiertos:
 *   1. Booking sin VideoSession (p.ej. usuarios test seedeados): creamos la
 *      VideoSession con Meet del usuario que conecta.
 *   2. VideoSession con provider Daily o platform-meet: la reemplazamos por
 *      `google_meet_user` con el Meet recién creado.
 *   3. VideoSession con `google_meet_user` sin mirror y el usuario que recién
 *      conecta NO es el owner del primary: insertamos un evento mirror en su
 *      calendar (reusa el mismo joinUrl, no crea Meet duplicado).
 *
 * Casos NO tocados (idempotencia):
 *   - VideoSession con `google_meet_user` cuyo primary ya pertenece al usuario
 *     que conecta (no hace falta hacer nada).
 *   - VideoSession con `google_meet_user` que ya tiene mirror para el partner.
 *
 * Errores por booking: se loguean y NO se propagan; el resto del backfill
 * sigue. La idea es que el OAuth callback nunca falle por culpa de esto.
 */

export interface BackfillMeetResult {
  /** Cantidad de bookings procesadas (incluye skips). */
  processed: number;
  /** Bookings donde creamos Meet primario nuevo. */
  meetsCreated: number;
  /** Bookings donde agregamos solo el evento mirror para el partner. */
  mirrorsCreated: number;
  /** Bookings que no necesitaron cambios. */
  skipped: number;
  /** Errores capturados, sin emails para no inundar logs en producción. */
  errors: number;
}

const BACKFILL_MAX_BOOKINGS = 25;

export async function backfillMeetForUserAfterCalendarConnect(params: {
  userId: string;
  /** Cap defensivo de bookings a procesar por corrida. */
  maxBookings?: number;
}): Promise<BackfillMeetResult> {
  const result: BackfillMeetResult = {
    processed: 0,
    meetsCreated: 0,
    mirrorsCreated: 0,
    skipped: 0,
    errors: 0
  };

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return result;
  }

  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { userId: params.userId }
  });
  if (!connection) {
    return result;
  }

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      patient: { select: { id: true } },
      professional: { select: { id: true } }
    }
  });
  if (!user) {
    return result;
  }

  const now = new Date();
  const cap = Math.max(1, Math.min(params.maxBookings ?? BACKFILL_MAX_BOOKINGS, BACKFILL_MAX_BOOKINGS));

  /**
   * Solo bookings futuras CONFIRMED del usuario (como patient o pro). REQUESTED,
   * CANCELLED, COMPLETED quedan fuera del backfill para no resucitar sesiones
   * canceladas con un Meet nuevo.
   */
  const whereOr: Array<{ patientId?: string; professionalId?: string }> = [];
  if (user.patient?.id) whereOr.push({ patientId: user.patient.id });
  if (user.professional?.id) whereOr.push({ professionalId: user.professional.id });
  if (whereOr.length === 0) {
    return result;
  }

  const bookings = await prisma.booking.findMany({
    where: {
      OR: whereOr,
      status: BookingStatus.CONFIRMED,
      startsAt: { gte: now }
    },
    orderBy: { startsAt: "asc" },
    take: cap,
    include: {
      patient: {
        select: {
          id: true,
          user: { select: { id: true, email: true, fullName: true } }
        }
      },
      professional: {
        select: {
          id: true,
          user: { select: { id: true, email: true, fullName: true } }
        }
      },
      videoSession: true
    }
  });

  for (const booking of bookings) {
    result.processed += 1;
    try {
      const patientUserId = booking.patient.user.id;
      const professionalUserId = booking.professional.user.id;
      const isConnectorPatient = params.userId === patientUserId;
      const isConnectorProfessional = params.userId === professionalUserId;
      if (!isConnectorPatient && !isConnectorProfessional) {
        result.skipped += 1;
        continue;
      }

      const partnerUserId = isConnectorPatient ? professionalUserId : patientUserId;
      const partnerConnection = await prisma.googleCalendarConnection.findUnique({
        where: { userId: partnerUserId }
      });

      const session = booking.videoSession;
      const currentTargets = session?.provider === "google_meet_user" && session.externalRoomId
        ? decodeGoogleMeetSyncTargets(session.externalRoomId)
        : null;

      const primaryAlreadyForConnector = currentTargets?.primary.ownerUserId === params.userId;
      const mirrorAlreadyForConnector = currentTargets?.mirror?.ownerUserId === params.userId;
      if (primaryAlreadyForConnector || mirrorAlreadyForConnector) {
        result.skipped += 1;
        continue;
      }

      // CASO: ya existe primary (del partner) y solo nos falta el mirror para
      // este usuario. Reusamos joinUrl, no creamos Meet nuevo.
      if (currentTargets && !currentTargets.mirror && currentTargets.primary.ownerUserId === partnerUserId) {
        try {
          const mirrored = await createLinkedCalendarEventForUserCalendar({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            refreshToken: connection.refreshToken,
            calendarId: connection.calendarId,
            startsAt: booking.startsAt,
            endsAt: booking.endsAt,
            professionalName: booking.professional.user.fullName,
            patientName: booking.patient.user.fullName,
            joinUrl: session?.joinUrlPatient ?? session?.joinUrlProfessional ?? ""
          });
          const newTargets = encodeGoogleMeetSyncTargets({
            primary: currentTargets.primary,
            mirror: { ownerUserId: params.userId, eventId: mirrored.eventId }
          });
          await prisma.videoSession.update({
            where: { bookingId: booking.id },
            data: { externalRoomId: newTargets }
          });
          result.mirrorsCreated += 1;
        } catch (mirrorError) {
          console.error("[calendarBackfill] mirror failed", { bookingId: booking.id, error: mirrorError });
          result.errors += 1;
        }
        continue;
      }

      // CASO general: hay que crear (o reemplazar) el Meet primario en el calendar del usuario que conecta.
      // - Si el partner es el profesional Y tiene Calendar conectado, intentamos primero en el calendar del profesional
      //   (matchea la prioridad usada en `bookings.routes.ts` para mantener el evento en el calendar del pro).
      //   Esto solo aplica cuando el connector es el patient.
      let primary: GoogleMeetOwnerTarget | null = null;
      let mirror: GoogleMeetOwnerTarget | undefined;
      let joinUrl: string | null = null;

      const shouldUseProAsOwner = isConnectorPatient && Boolean(partnerConnection);
      if (shouldUseProAsOwner && partnerConnection) {
        try {
          const meet = await createGoogleMeetForUserCalendar({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            refreshToken: partnerConnection.refreshToken,
            calendarId: partnerConnection.calendarId,
            bookingId: booking.id,
            startsAt: booking.startsAt,
            endsAt: booking.endsAt,
            professionalName: booking.professional.user.fullName,
            patientName: booking.patient.user.fullName,
            participants: [
              { email: booking.patient.user.email, displayName: booking.patient.user.fullName },
              { email: booking.professional.user.email, displayName: booking.professional.user.fullName }
            ]
          });
          primary = { ownerUserId: professionalUserId, eventId: meet.eventId };
          joinUrl = meet.joinUrl;
          // Y reflejamos en el calendar del patient (= este connector).
          try {
            const mirrored = await createLinkedCalendarEventForUserCalendar({
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
              refreshToken: connection.refreshToken,
              calendarId: connection.calendarId,
              startsAt: booking.startsAt,
              endsAt: booking.endsAt,
              professionalName: booking.professional.user.fullName,
              patientName: booking.patient.user.fullName,
              joinUrl: meet.joinUrl
            });
            mirror = { ownerUserId: params.userId, eventId: mirrored.eventId };
          } catch (mirrorError) {
            console.error("[calendarBackfill] mirror after pro-owner failed", {
              bookingId: booking.id,
              error: mirrorError
            });
          }
        } catch (proOwnerError) {
          console.error("[calendarBackfill] pro-owner failed, falling back to connector", {
            bookingId: booking.id,
            error: proOwnerError
          });
        }
      }

      if (!primary) {
        // Creamos en el calendar del usuario que recién conectó.
        const meet = await createGoogleMeetForUserCalendar({
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          refreshToken: connection.refreshToken,
          calendarId: connection.calendarId,
          bookingId: booking.id,
          startsAt: booking.startsAt,
          endsAt: booking.endsAt,
          professionalName: booking.professional.user.fullName,
          patientName: booking.patient.user.fullName,
          participants: [
            { email: booking.patient.user.email, displayName: booking.patient.user.fullName },
            { email: booking.professional.user.email, displayName: booking.professional.user.fullName }
          ]
        });
        primary = { ownerUserId: params.userId, eventId: meet.eventId };
        joinUrl = meet.joinUrl;

        // Si el partner también está conectado, intentamos el mirror.
        if (partnerConnection) {
          try {
            const mirrored = await createLinkedCalendarEventForUserCalendar({
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
              refreshToken: partnerConnection.refreshToken,
              calendarId: partnerConnection.calendarId,
              startsAt: booking.startsAt,
              endsAt: booking.endsAt,
              professionalName: booking.professional.user.fullName,
              patientName: booking.patient.user.fullName,
              joinUrl: meet.joinUrl
            });
            mirror = { ownerUserId: partnerUserId, eventId: mirrored.eventId };
          } catch (mirrorError) {
            console.error("[calendarBackfill] mirror to partner failed", {
              bookingId: booking.id,
              error: mirrorError
            });
          }
        }
      }

      if (!primary || !joinUrl) {
        result.errors += 1;
        continue;
      }

      const externalRoomId = encodeGoogleMeetSyncTargets({ primary, mirror });
      // upsert porque la booking sembrada NO tiene VideoSession.
      await prisma.videoSession.upsert({
        where: { bookingId: booking.id },
        update: {
          provider: "google_meet_user",
          externalRoomId,
          joinUrlPatient: joinUrl,
          joinUrlProfessional: joinUrl
        },
        create: {
          bookingId: booking.id,
          provider: "google_meet_user",
          externalRoomId,
          joinUrlPatient: joinUrl,
          joinUrlProfessional: joinUrl
        }
      });
      result.meetsCreated += 1;
    } catch (perBookingError) {
      console.error("[calendarBackfill] booking failed", {
        bookingId: booking.id,
        error: perBookingError
      });
      result.errors += 1;
    }
  }

  return result;
}

const meetBackfillCooldownUntil = new Map<string, number>();
const MEET_BACKFILL_COOLDOWN_MS = 5 * 60_000;

function bookingNeedsMeetBackfill(booking: {
  status: BookingStatus;
  startsAt: Date;
  videoSession: { provider: string; joinUrlPatient: string | null } | null;
}): boolean {
  if (booking.status !== BookingStatus.CONFIRMED) {
    return false;
  }
  if (booking.startsAt.getTime() <= Date.now()) {
    return false;
  }
  const session = booking.videoSession;
  if (!session) {
    return true;
  }
  if (session.provider === "daily") {
    return true;
  }
  const joinUrl = session.joinUrlPatient?.trim() ?? "";
  if (!joinUrl.includes("meet.google.")) {
    return session.provider !== "google_meet_user" && session.provider !== "google_meet_platform";
  }
  return false;
}

/**
 * Si el usuario tiene Calendar conectado y hay reservas futuras sin Meet real,
 * dispara backfill en background (con cooldown) — p. ej. tras reservar en mobile
 * antes de OAuth o si falló el callback.
 */
export function scheduleMeetBackfillIfNeeded(params: {
  userId: string;
  bookings: Array<{
    status: BookingStatus;
    startsAt: Date;
    videoSession: { provider: string; joinUrlPatient: string | null } | null;
  }>;
}): void {
  const now = Date.now();
  if (now < (meetBackfillCooldownUntil.get(params.userId) ?? 0)) {
    return;
  }
  if (!params.bookings.some(bookingNeedsMeetBackfill)) {
    return;
  }

  meetBackfillCooldownUntil.set(params.userId, now + MEET_BACKFILL_COOLDOWN_MS);
  void backfillMeetForUserAfterCalendarConnect({ userId: params.userId }).catch((error) => {
    console.error("[calendarBackfill] scheduled backfill failed", { userId: params.userId, error });
  });
}
