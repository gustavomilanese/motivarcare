import { isPatientBookingLiveStatus, isPatientBookingUpcoming } from "@therapy/i18n-config";

/** Reserva mínima compartida entre portal web y apps nativas. */
export type PatientPortalBooking = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  bookingMode?: "credit" | "trial" | null;
  /** Si hay lazo asignado, las próximas solo se muestran de ese profesional. */
  professionalId?: string;
};

export type FilterUpcomingPatientBookingsOptions = {
  /** Con vínculo activo: ocultar próximas de otro profesional (reservas huérfanas). */
  assignedProfessionalId?: string | null;
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

function matchesAssignedProfessional<T extends PatientPortalBooking>(
  booking: T,
  assignedProfessionalId: string
): boolean {
  if (!assignedProfessionalId) {
    return true;
  }
  const bookingPro = typeof booking.professionalId === "string" ? booking.professionalId.trim() : "";
  if (!bookingPro) {
    return true;
  }
  return bookingPro === assignedProfessionalId;
}

/** Próximas reservas vigentes: confirmadas o solicitadas, aún no finalizadas. */
export function filterUpcomingPatientBookings<T extends PatientPortalBooking>(
  bookings: T[],
  nowMs?: number,
  options?: FilterUpcomingPatientBookingsOptions
): T[] {
  const now = nowMs ?? Date.now();
  const assigned = options?.assignedProfessionalId?.trim() ?? "";
  return bookings
    .filter(
      (booking) =>
        isPatientBookingLiveStatus(booking.status)
        && isPatientBookingUpcoming({
          startsAt: booking.startsAt,
          endsAt: booking.endsAt,
          nowMs: now
        })
        && matchesAssignedProfessional(booking, assigned)
    )
    .sort(compareUpcomingPatientBookings);
}

export function countUpcomingPatientBookings(
  bookings: PatientPortalBooking[],
  nowMs?: number,
  options?: FilterUpcomingPatientBookingsOptions
): number {
  return filterUpcomingPatientBookings(bookings, nowMs, options).length;
}

export function pickNextPatientBooking<T extends PatientPortalBooking>(
  bookings: T[],
  nowMs?: number,
  options?: FilterUpcomingPatientBookingsOptions
): T | null {
  return filterUpcomingPatientBookings(bookings, nowMs, options)[0] ?? null;
}
