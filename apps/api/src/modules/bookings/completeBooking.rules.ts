const BOOKING_STATUS = {
  REQUESTED: "REQUESTED",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
  NO_SHOW: "NO_SHOW"
} as const;

export const COMPLETE_BOOKING_BATCH_MAX = 200;

export type CompleteBookingGate =
  | { ok: true }
  | { ok: false; httpStatus: number; error: string };

export function evaluateCompleteBooking(
  booking: { professionalId: string; status: string; startsAt: Date } | null,
  professionalProfileId: string,
  now: Date
): CompleteBookingGate {
  if (!booking) {
    return { ok: false, httpStatus: 404, error: "Booking not found" };
  }
  if (booking.professionalId !== professionalProfileId) {
    return { ok: false, httpStatus: 403, error: "Forbidden" };
  }
  if (booking.status === BOOKING_STATUS.CANCELLED || booking.status === BOOKING_STATUS.NO_SHOW) {
    return { ok: false, httpStatus: 409, error: "Booking cannot be completed in its current state" };
  }
  if (booking.status === BOOKING_STATUS.COMPLETED) {
    return { ok: false, httpStatus: 409, error: "Booking already completed" };
  }
  if (booking.startsAt.getTime() > now.getTime()) {
    return { ok: false, httpStatus: 409, error: "Booking has not started yet" };
  }
  return { ok: true };
}

export function evaluateUncompleteBooking(
  booking:
    | {
        professionalId: string;
        status: string;
        financeRecord?: { payoutLineId: string | null; submittedForPayoutAt?: Date | string | null } | null;
      }
    | null,
  professionalProfileId: string
): CompleteBookingGate {
  if (!booking) {
    return { ok: false, httpStatus: 404, error: "Booking not found" };
  }
  if (booking.professionalId !== professionalProfileId) {
    return { ok: false, httpStatus: 403, error: "Forbidden" };
  }
  if (booking.status !== BOOKING_STATUS.COMPLETED) {
    return { ok: false, httpStatus: 409, error: "Only completed sessions can be reverted" };
  }
  if (booking.financeRecord?.payoutLineId || booking.financeRecord?.submittedForPayoutAt) {
    return {
      ok: false,
      httpStatus: 409,
      error: "This session was already sent for payout and cannot be undone."
    };
  }
  return { ok: true };
}

export function evaluateSubmitForPayout(
  booking:
    | {
        professionalId: string;
        status: string;
        financeRecord?: { payoutLineId: string | null; submittedForPayoutAt?: Date | string | null } | null;
      }
    | null,
  professionalProfileId: string
): CompleteBookingGate {
  if (!booking) {
    return { ok: false, httpStatus: 404, error: "Booking not found" };
  }
  if (booking.professionalId !== professionalProfileId) {
    return { ok: false, httpStatus: 403, error: "Forbidden" };
  }
  if (booking.status !== BOOKING_STATUS.COMPLETED) {
    return { ok: false, httpStatus: 409, error: "Only completed sessions can be sent for payout" };
  }
  if (!booking.financeRecord) {
    return { ok: false, httpStatus: 409, error: "This session has no finance record yet" };
  }
  if (booking.financeRecord.payoutLineId) {
    return {
      ok: false,
      httpStatus: 409,
      error: "This session is already in a payout"
    };
  }
  if (booking.financeRecord.submittedForPayoutAt) {
    return {
      ok: false,
      httpStatus: 409,
      error: "This session was already sent for payout"
    };
  }
  return { ok: true };
}

export function uniqueBookingIds(bookingIds: string[], max = COMPLETE_BOOKING_BATCH_MAX): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const id of bookingIds) {
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    unique.push(trimmed);
    if (unique.length >= max) {
      break;
    }
  }
  return unique;
}
