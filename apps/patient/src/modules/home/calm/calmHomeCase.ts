export type CalmHomeCase = "new" | "assigned" | "upcoming";

/** Sin profesional, el inicio es la bienvenida. El listado se abre solo si la persona lo pide. */
export function calmHomeSurface(input: { hasProfessional: boolean; pickOpen: boolean }): "home" | "pick" {
  if (!input.hasProfessional && input.pickOpen) return "pick";
  return "home";
}

export function resolveCalmHomeCase(input: {
  hasProfessional: boolean;
  hasUpcomingBooking: boolean;
}): CalmHomeCase {
  if (input.hasUpcomingBooking) return "upcoming";
  if (input.hasProfessional) return "assigned";
  return "new";
}

export type RankedProfessional = {
  id: string;
  fullName: string;
  title: string;
  specialties: string[];
  compatibility: number;
  sessionPriceUsd?: number;
};

export function rankSuggestedProfessionals<T extends RankedProfessional>(professionals: T[], limit = 3): T[] {
  return [...professionals]
    .sort((a, b) => b.compatibility - a.compatibility || a.fullName.localeCompare(b.fullName))
    .slice(0, limit);
}

export function upcomingProfessionalSlots<T extends { id: string; startsAt: string }>(
  slots: T[],
  now: Date,
  limit = 4
): T[] {
  const nowMs = now.getTime();
  return [...slots]
    .filter((slot) => {
      const starts = new Date(slot.startsAt).getTime();
      return Number.isFinite(starts) && starts > nowMs;
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, limit);
}
