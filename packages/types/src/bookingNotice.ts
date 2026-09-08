/** Antelación mínima para reservar un turno (alineada con availability + slot hold). */
export const MIN_BOOKING_NOTICE_HOURS = 24;

export function resolveMinimumBookingNoticeHours(configuredHours?: number | null): number {
  const safeHours = Number.isFinite(Number(configuredHours)) ? Number(configuredHours) : MIN_BOOKING_NOTICE_HOURS;
  return Math.max(MIN_BOOKING_NOTICE_HOURS, Math.round(safeHours));
}

export function earliestBookableAtMs(configuredHours?: number | null, nowMs = Date.now()): number {
  return nowMs + resolveMinimumBookingNoticeHours(configuredHours) * 60 * 60 * 1000;
}

export function isSlotBookableByNotice(
  startsAt: string | Date,
  configuredHours?: number | null,
  nowMs = Date.now()
): boolean {
  const t = new Date(startsAt).getTime();
  return Number.isFinite(t) && t >= earliestBookableAtMs(configuredHours, nowMs);
}

export function filterSlotsByBookingNotice<T extends { startsAt: string | Date }>(
  slots: T[],
  configuredHours?: number | null,
  nowMs = Date.now()
): T[] {
  const earliest = earliestBookableAtMs(configuredHours, nowMs);
  return [...slots]
    .filter((slot) => {
      const t = new Date(slot.startsAt).getTime();
      return Number.isFinite(t) && t >= earliest;
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}
