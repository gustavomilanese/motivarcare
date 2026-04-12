import type { SyntheticEvent } from "react";

/** Hero login profesional: asset en `public/images/auth-hero-professional.png`. */
export const PROFESSIONAL_AUTH_HERO_IMAGE = "/images/auth-hero-professional.png";

export function professionalAuthHeroFallback(event: SyntheticEvent<HTMLImageElement>): void {
  const img = event.currentTarget;
  img.onerror = null;
  img.src = "/images/dashboard-sunrise.svg";
}
