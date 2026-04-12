import type { SyntheticEvent } from "react";

/**
 * Hero login profesional: MacBook + entorno abierto / montaña (Pexels, CDN estable).
 * El paciente usa Unsplash mar + laptop; acá otro asset para contraste y menos riesgo de hotlink.
 */
export const PROFESSIONAL_AUTH_HERO_IMAGE =
  "https://images.pexels.com/photos/3229984/pexels-photo-3229984.jpeg?auto=compress&cs=tinysrgb&w=1600";

export function professionalAuthHeroFallback(event: SyntheticEvent<HTMLImageElement>): void {
  const img = event.currentTarget;
  img.onerror = null;
  img.src = "/images/dashboard-sunrise.svg";
}
