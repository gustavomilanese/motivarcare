import { filterUpcomingPatientBookings } from "@therapy/patient-core";

type BookingLike = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  bookingMode?: "credit" | "trial" | null;
  professionalId?: string;
};

/** Próximas que ya comieron crédito del paquete (no trial). */
export function countReservedPackageSessions(
  bookings: BookingLike[],
  nowMs: number,
  assignedProfessionalId?: string | null
): number {
  return filterUpcomingPatientBookings(bookings, nowMs, { assignedProfessionalId }).filter(
    (booking) => booking.bookingMode !== "trial"
  ).length;
}
