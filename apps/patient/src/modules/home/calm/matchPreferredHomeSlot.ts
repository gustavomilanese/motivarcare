import type { TimeSlot } from "../../app/types";

/** Coincide por ISO exacto o por el mismo minuto (ids de directorio vs availability pueden diferir). */
export function matchPreferredHomeSlot(
  slots: TimeSlot[],
  preferredStartsAt: string | null | undefined
): TimeSlot | undefined {
  const preferred = preferredStartsAt?.trim();
  if (!preferred) return undefined;
  const targetMs = Date.parse(preferred);
  if (!Number.isFinite(targetMs)) return undefined;
  return slots.find((slot) => {
    if (slot.startsAt === preferred) return true;
    const slotMs = Date.parse(slot.startsAt);
    return Number.isFinite(slotMs) && Math.abs(slotMs - targetMs) < 60_000;
  });
}
