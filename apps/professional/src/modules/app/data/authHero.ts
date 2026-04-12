import type { SyntheticEvent } from "react";

/**
 * Hero login profesional: laptop frente al mar (trabajo remoto en la costa).
 * Pexels 4350063 (mujer con notebook en playa / mar); evitar 3229984 u otros IDs que no correspondan.
 */
export const PROFESSIONAL_AUTH_HERO_IMAGE =
  "https://images.pexels.com/photos/4350063/pexels-photo-4350063.jpeg?auto=compress&cs=tinysrgb&w=1600";

export function professionalAuthHeroFallback(event: SyntheticEvent<HTMLImageElement>): void {
  const img = event.currentTarget;
  img.onerror = null;
  img.src = "/images/dashboard-sunrise.svg";
}
