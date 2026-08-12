import type { MatchingSlot } from "../api/types";

/**
 * Ordena y filtra slots futuros / bookables.
 * Si el API manda `minimumBookingNoticeHours`, respeta el aviso mínimo.
 */
export function upcomingAvailabilitySlots(
  slots: MatchingSlot[],
  options?: { minimumBookingNoticeHours?: number }
): MatchingSlot[] {
  const minHours = Number.isFinite(Number(options?.minimumBookingNoticeHours))
    ? Number(options?.minimumBookingNoticeHours)
    : 0;
  const earliestMs = Date.now() + Math.max(0, minHours) * 60 * 60 * 1000;

  return [...slots]
    .filter((s) => {
      const t = new Date(s.startsAt).getTime();
      return !Number.isNaN(t) && t >= earliestMs;
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}
