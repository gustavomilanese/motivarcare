import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import {
  cancelGoogleMeetEventForPlatformCalendar,
  cancelGoogleMeetEventForUserCalendar
} from "./googleMeet.service.js";
import { listGoogleMeetSyncTargets } from "./meetSyncTargets.js";

/**
 * Cancela eventos de Google Calendar / Meet asociados a la reserva.
 * Idempotente: si no hay videoSession o falla un owner, no bloquea la cancelación de la booking.
 */
export async function cancelBookingCalendarEvents(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { videoSession: true }
  });

  const session = booking?.videoSession;
  if (!session?.externalRoomId) {
    return;
  }

  if (session.provider === "google_meet_platform") {
    try {
      await cancelGoogleMeetEventForPlatformCalendar({
        eventId: session.externalRoomId
      });
    } catch (googleMeetError) {
      console.error("Could not cancel Google Meet event (platform calendar)", {
        bookingId,
        error: googleMeetError
      });
    }
    return;
  }

  if (session.provider !== "google_meet_user") {
    return;
  }

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return;
  }

  const targets = listGoogleMeetSyncTargets(session.externalRoomId);
  if (targets.length === 0) {
    console.error("Could not decode Google Meet sync targets for cancelled booking", {
      bookingId,
      externalRoomId: session.externalRoomId
    });
    return;
  }

  for (const target of targets) {
    const ownerConnection = await prisma.googleCalendarConnection.findUnique({
      where: { userId: target.ownerUserId }
    });
    if (!ownerConnection) {
      continue;
    }
    try {
      await cancelGoogleMeetEventForUserCalendar({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        refreshToken: ownerConnection.refreshToken,
        calendarId: ownerConnection.calendarId,
        eventId: target.eventId
      });
    } catch (googleMeetError) {
      console.error("Could not cancel Google Meet event (user calendar)", {
        bookingId,
        ownerUserId: target.ownerUserId,
        error: googleMeetError
      });
    }
  }
}
