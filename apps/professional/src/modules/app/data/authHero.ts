import type { SyntheticEvent } from "react";

/** Misma imagen hero que el portal paciente (sesión online). */
export const PROFESSIONAL_AUTH_HERO_IMAGE =
  "https://images.unsplash.com/photo-1590166045671-9bb0c0a76ea4?auto=format&fit=crop&w=1600&q=80";

export function professionalAuthHeroFallback(event: SyntheticEvent<HTMLImageElement>): void {
  const img = event.currentTarget;
  img.onerror = null;
  img.src = "/images/dashboard-sunrise.svg";
}
