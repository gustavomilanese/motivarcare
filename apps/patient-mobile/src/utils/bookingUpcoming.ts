import type { BookingItem } from "../api/types";

export function isBookingUpcoming(item: BookingItem): boolean {
  const endMs = new Date(item.endsAt).getTime();
  const startMs = new Date(item.startsAt).getTime();
  const grace = Date.now() - 60000;
  if (!Number.isNaN(endMs)) {
    return endMs >= grace;
  }
  if (!Number.isNaN(startMs)) {
    return startMs >= grace;
  }
  return false;
}

/** Sesión de prueba primero; evita que quede fuera del top del Home (solo 3 ítems). */
export function compareUpcomingBookings(a: BookingItem, b: BookingItem): number {
  const aTrial = a.bookingMode === "trial" ? 0 : 1;
  const bTrial = b.bookingMode === "trial" ? 0 : 1;
  if (aTrial !== bTrial) {
    return aTrial - bTrial;
  }
  return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
}
