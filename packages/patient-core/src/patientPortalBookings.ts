import { isPatientBookingLiveStatus, isPatientBookingUpcoming } from "@therapy/i18n-config";

/** Reserva mínima compartida entre portal web y apps nativas. */
export type PatientPortalBooking = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  bookingMode?: "credit" | "trial" | null;
};

export function isLivePatientBookingStatus(status: string): boolean {
  return isPatientBookingLiveStatus(status);
}

export function compareUpcomingPatientBookings<T extends PatientPortalBooking>(a: T, b: T): number {
  const aTrial = a.bookingMode === "trial" ? 0 : 1;
  const bTrial = b.bookingMode === "trial" ? 0 : 1;
  if (aTrial !== bTrial) {
    return aTrial - bTrial;
  }
  return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
}

/** Próximas reservas vigentes: confirmadas o solicitadas, aún no finalizadas. */
export function filterUpcomingPatientBookings<T extends PatientPortalBooking>(
  bookings: T[],
  nowMs?: number
): T[] {
  const now = nowMs ?? Date.now();
  return bookings
    .filter(
      (booking) =>
        isPatientBookingLiveStatus(booking.status)
        && isPatientBookingUpcoming({
          startsAt: booking.startsAt,
          endsAt: booking.endsAt,
          nowMs: now
        })
    )
    .sort(compareUpcomingPatientBookings);
}

export function countUpcomingPatientBookings(bookings: PatientPortalBooking[], nowMs?: number): number {
  return filterUpcomingPatientBookings(bookings, nowMs).length;
}

export function pickNextPatientBooking<T extends PatientPortalBooking>(
  bookings: T[],
  nowMs?: number
): T | null {
  return filterUpcomingPatientBookings(bookings, nowMs)[0] ?? null;
}
