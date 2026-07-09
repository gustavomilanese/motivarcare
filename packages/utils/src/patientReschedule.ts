/** Valor por defecto y tope de antelación para cancelar/reprogramar (alineado con API). */
export const PATIENT_RESCHEDULE_NOTICE_HOURS = 24;
export const MAX_PATIENT_CHANGE_NOTICE_HOURS = 24;

/** Antelación mínima que el paciente debe respetar para cancelar o reprogramar. */
export function resolvePatientChangeNoticeHours(configuredHours?: number | null): number {
  const safeHours = Number.isFinite(Number(configuredHours))
    ? Number(configuredHours)
    : PATIENT_RESCHEDULE_NOTICE_HOURS;
  return Math.min(MAX_PATIENT_CHANGE_NOTICE_HOURS, Math.max(0, Math.round(safeHours)));
}

export function canPatientChangeBooking(startsAt: string, noticeHours?: number | null): boolean {
  const hours = resolvePatientChangeNoticeHours(noticeHours);
  const minimumStartMs = Date.now() + hours * 60 * 60 * 1000;
  return new Date(startsAt).getTime() >= minimumStartMs;
}

export function canPatientRescheduleBooking(startsAt: string, noticeHours?: number | null): boolean {
  return canPatientChangeBooking(startsAt, noticeHours);
}

export function canPatientCancelBooking(startsAt: string, noticeHours?: number | null): boolean {
  return canPatientChangeBooking(startsAt, noticeHours);
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
