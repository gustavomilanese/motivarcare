/** Alineado con PATIENT_RESCHEDULE_NOTICE_HOURS en API (24h). */
export const PATIENT_RESCHEDULE_NOTICE_HOURS = 24;

export function canPatientRescheduleBooking(startsAt: string): boolean {
  const minimumStartMs = Date.now() + PATIENT_RESCHEDULE_NOTICE_HOURS * 60 * 60 * 1000;
  return new Date(startsAt).getTime() >= minimumStartMs;
}

/** Cancelar siempre que la sesión no haya empezado. */
export function canPatientCancelBooking(startsAt: string): boolean {
  return new Date(startsAt).getTime() > Date.now();
}

/** Menos de 24h → cancelar implica perder el crédito / sesión. */
export function willPatientLoseCreditOnCancel(startsAt: string): boolean {
  if (!canPatientCancelBooking(startsAt)) {
    return false;
  }
  return !canPatientRescheduleBooking(startsAt);
}
