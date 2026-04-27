import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";

/**
 * Contexto que se inyecta en el system prompt del treatment-chat para que el
 * asistente pueda responder consultas operativas básicas ("¿cuándo es mi
 * próxima sesión?", "¿con qué profesional?", "¿cuántos créditos me quedan?")
 * y personalizar la conversación con el primer nombre del paciente.
 *
 * Diseño:
 * - Se calcula a partir de fuentes ya existentes en DB. Sin tablas nuevas.
 * - Es DATA-ONLY: no se persiste en DB propia; opcionalmente se cachea en memoria
 *   por `TREATMENT_CHAT_PATIENT_CONTEXT_TTL_MS` para no repetir 4 lecturas entre
 *   mensajes seguidos del mismo paciente.
 * - Si un dato falta, se omite del prompt en lugar de inventar valores.
 */
export interface TreatmentChatPatientContext {
  patientFirstName: string | null;
  /** IANA timezone (ej. "America/Argentina/Buenos_Aires"). */
  timezone: string;
  /** ISO 3166-1 alpha-2 (ej. "AR", "US", "BR"); útil para referencias de emergencia regionales. */
  residencyCountry: string | null;
  /** Profesional con el que el paciente tiene actividad reciente (último booking). */
  assignedProfessional: {
    fullName: string;
    professionalTitle: string | null;
  } | null;
  /** Próximo turno del paciente (REQUESTED o CONFIRMED) que aún no terminó. */
  nextSession: {
    startsAtIso: string;
    /** ISO 4-digit year-month-day-hour-minute, ya formateado en TZ del paciente. */
    startsAtLocalLabel: string;
    professionalFullName: string;
    /** "REQUESTED" | "CONFIRMED". */
    status: string;
  } | null;
  /** Total de créditos remanentes sumando todas las purchases activas. */
  creditsRemaining: number;
}

const patientContextCache = new Map<string, { fetchedAt: number; data: TreatmentChatPatientContext }>();

/** Solo tests o invalidación manual; no usar en producción salvo debugging. */
export function clearPatientContextCache(patientId?: string): void {
  if (patientId) {
    patientContextCache.delete(patientId);
    return;
  }
  patientContextCache.clear();
}

/**
 * Carga el contexto operativo del paciente (con caché en memoria acotada por TTL).
 */
export async function loadPatientContext(patientId: string): Promise<TreatmentChatPatientContext> {
  const ttl = env.TREATMENT_CHAT_PATIENT_CONTEXT_TTL_MS;
  if (ttl > 0) {
    const hit = patientContextCache.get(patientId);
    const nowMs = Date.now();
    if (hit && nowMs - hit.fetchedAt < ttl) {
      return hit.data;
    }
  }

  const data = await loadPatientContextFromDatabase(patientId);
  if (ttl > 0) {
    patientContextCache.set(patientId, { fetchedAt: Date.now(), data });
  }
  return data;
}

async function loadPatientContextFromDatabase(patientId: string): Promise<TreatmentChatPatientContext> {
  const now = new Date();

  const [patient, nextBooking, creditsAgg, mostRecentBookingProfessional] = await Promise.all([
    prisma.patientProfile.findUnique({
      where: { id: patientId },
      include: {
        user: { select: { firstName: true, fullName: true } }
      }
    }),
    /**
     * Próximo turno: el primero ordenado ASC con status REQUESTED o CONFIRMED y
     * que todavía no terminó. Cubre el caso "sesión hoy en 2 horas".
     */
    prisma.booking.findFirst({
      where: {
        patientId,
        status: { in: ["REQUESTED", "CONFIRMED"] },
        endsAt: { gte: now }
      },
      orderBy: { startsAt: "asc" },
      include: {
        professional: {
          include: {
            user: { select: { fullName: true } }
          }
        }
      }
    }),
    prisma.patientPackagePurchase.aggregate({
      where: { patientId },
      _sum: { remainingCredits: true }
    }),
    /**
     * Profesional "asignado": el último booking del paciente (cualquier estado).
     * No tenemos un campo dedicado en PatientProfile, así que lo inferimos.
     * Si hay nextBooking, eso ya tiene professional; si no, fallback a este.
     */
    prisma.booking.findFirst({
      where: { patientId },
      orderBy: { startsAt: "desc" },
      include: {
        professional: {
          include: {
            user: { select: { fullName: true } }
          }
        }
      }
    })
  ]);

  const timezone = patient?.lastSeenTimezone ?? patient?.timezone ?? "America/New_York";

  const assignedProfessional = nextBooking?.professional
    ? {
        fullName: nextBooking.professional.user.fullName,
        professionalTitle: nextBooking.professional.professionalTitle ?? null
      }
    : mostRecentBookingProfessional?.professional
      ? {
          fullName: mostRecentBookingProfessional.professional.user.fullName,
          professionalTitle: mostRecentBookingProfessional.professional.professionalTitle ?? null
        }
      : null;

  const nextSession = nextBooking
    ? {
        startsAtIso: nextBooking.startsAt.toISOString(),
        startsAtLocalLabel: formatDateInTimezone(nextBooking.startsAt, timezone),
        professionalFullName: nextBooking.professional.user.fullName,
        status: nextBooking.status
      }
    : null;

  const creditsRemaining = creditsAgg._sum.remainingCredits ?? 0;

  return {
    patientFirstName:
      patient?.user.firstName?.trim()?.length
        ? patient.user.firstName.trim()
        : (patient?.user.fullName?.split(" ")[0] ?? null),
    timezone,
    residencyCountry: patient?.residencyCountry ?? null,
    assignedProfessional,
    nextSession,
    creditsRemaining
  };
}

/**
 * Formato amigable en TZ del paciente. Ej "lunes 28 de abril, 18:30".
 *
 * Usamos `Intl.DateTimeFormat` con locale fijo `es-AR` porque el prompt es
 * neutro y el LLM se adapta al idioma del usuario; lo importante es que la
 * fecha sea correcta en el huso horario del paciente.
 */
function formatDateInTimezone(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone
    }).format(date);
  } catch {
    /** TZ inválida: degradamos a UTC en formato mínimo. */
    return new Intl.DateTimeFormat("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC"
    }).format(date);
  }
}
