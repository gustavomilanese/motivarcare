import type { MatchingSlot } from "../api/types";

/** Ordena y filtra slots futuros para elegir turno (usa el listado completo del API, no solo los 6 “sugeridos” del score). */
export function upcomingAvailabilitySlots(slots: MatchingSlot[]): MatchingSlot[] {
  const now = Date.now();
  return [...slots]
    .filter((s) => {
      const t = new Date(s.startsAt).getTime();
      return !Number.isNaN(t) && t > now;
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}
