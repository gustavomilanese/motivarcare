/** Alineado con PATIENT_RESCHEDULE_NOTICE_HOURS en API (24h). */
export const PATIENT_RESCHEDULE_NOTICE_HOURS = 24;

export function canPatientRescheduleBooking(startsAt: string): boolean {
  const minimumStartMs = Date.now() + PATIENT_RESCHEDULE_NOTICE_HOURS * 60 * 60 * 1000;
  return new Date(startsAt).getTime() >= minimumStartMs;
}

export function bookingJoinUrl(booking: { joinUrl?: string | null }): string {
  return typeof booking.joinUrl === "string" ? booking.joinUrl.trim() : "";
}

/** Misma regla que patient-mobile: sesión vigente hasta 1 min después de endsAt. */
export function isPatientBookingUpcoming(params: {
  startsAt: string;
  endsAt: string;
  nowMs?: number;
}): boolean {
  const nowMs = params.nowMs ?? Date.now();
  const grace = nowMs - 60_000;
  const endMs = new Date(params.endsAt).getTime();
  const startMs = new Date(params.startsAt).getTime();
  if (!Number.isNaN(endMs)) {
    return endMs >= grace;
  }
  if (!Number.isNaN(startMs)) {
    return startMs >= grace;
  }
  return false;
}

export function isPatientBookingLiveStatus(status: string): boolean {
  const normalized = status.toLowerCase();
  return normalized === "confirmed" || normalized === "requested";
}
