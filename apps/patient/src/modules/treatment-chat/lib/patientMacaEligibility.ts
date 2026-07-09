/** Reserva futura o en curso (confirmada o pendiente de confirmación). */
function isActivePatientBookingStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return normalized === "confirmed" || normalized === "requested";
}

export function patientHasUpcomingOrActiveBooking(
  bookings: Array<{ status: string; endsAt: string }>,
  nowMs = Date.now()
): boolean {
  return bookings.some((booking) => {
    if (!isActivePatientBookingStatus(booking.status)) {
      return false;
    }
    const endsAt = Date.parse(booking.endsAt);
    return Number.isFinite(endsAt) && endsAt > nowMs;
  });
}

/** Maca visible cuando hay créditos para usar o una sesión reservada/activa. */
export function patientMacaEligible(params: {
  creditsRemaining: number;
  bookings: Array<{ status: string; endsAt: string }>;
}): boolean {
  return params.creditsRemaining > 0 || patientHasUpcomingOrActiveBooking(params.bookings);
}
