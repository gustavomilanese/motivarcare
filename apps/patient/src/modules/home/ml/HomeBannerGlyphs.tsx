import type { ReactNode } from "react";

/** Íconos flat modernos para cabeceras Home ML (mismo lenguaje que Sesiones). */

function BannerGlyphShell(props: { children: ReactNode; className?: string }) {
  return (
    <div className={`dashboard-ml-banner-glyph${props.className ? ` ${props.className}` : ""}`} aria-hidden="true">
      {props.children}
    </div>
  );
}

/** Diario: cuaderno + pluma. */
export function DiaryBannerIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="9" y="7" width="24" height="34" rx="5" stroke="currentColor" strokeWidth="2.4" />
      <path d="M9 14h24" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M15 20.5h12M15 26h12M15 31.5h8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity="0.75" />
      <path
        d="M30.5 28.5l8.2-8.2c.8-.8 2-.8 2.8 0l1.2 1.2c.8.8.8 2 0 2.8L34.5 32.5l-4.2 1.2 1.2-4.2Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M37.5 22.5l2.8 2.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** CTA compacto: solo pluma. */
export function DiaryWriteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M14.5 4.5l5 5L8 21H3v-5L14.5 4.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12.5 6.5l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function DiaryBannerGlyph() {
  return (
    <BannerGlyphShell className="dashboard-ml-diary-banner-glyph">
      <DiaryBannerIcon />
    </BannerGlyphShell>
  );
}

/** Ejercicios: figura en movimiento / estiramiento. */
export function ExercisesBannerIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="24" cy="11.5" r="4.2" stroke="currentColor" strokeWidth="2.4" />
      <path
        d="M16 22.5c2.8-3.2 6-4.8 8-4.8s5.2 1.6 8 4.8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="M24 20.5v10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M14.5 28.5 24 30.5l9.5-2"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 40.5 24 31l6 9.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="38.5" cy="16.5" r="3.2" fill="currentColor" opacity="0.35" />
      <circle cx="9.5" cy="24.5" r="2.4" fill="currentColor" opacity="0.25" />
    </svg>
  );
}

export function ExercisesBannerGlyph() {
  return (
    <BannerGlyphShell className="dashboard-ml-feature-banner-glyph">
      <ExercisesBannerIcon />
    </BannerGlyphShell>
  );
}

/** CTA compacto: ver / abrir. */
export function ExercisesOpenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M5 12h12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Música: auriculares + nota. */
export function MusicBannerIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M12 24v6.5c0 2.5 2 4.5 4.5 4.5S21 33 21 30.5V24"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M36 24v6.5c0 2.5-2 4.5-4.5 4.5S27 33 27 30.5V24"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M12 24c0-6.6 5.4-12 12-12s12 5.4 12 12"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="16.5" cy="31" r="3.4" fill="currentColor" opacity="0.9" />
      <circle cx="31.5" cy="31" r="3.4" fill="currentColor" opacity="0.9" />
      <path
        d="M29 10.5v9.2c0 1.4-1.1 2.5-2.5 2.5S24 21.1 24 19.7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="24" cy="19.5" r="2.4" fill="currentColor" />
    </svg>
  );
}

export function MusicBannerGlyph() {
  return (
    <BannerGlyphShell className="dashboard-ml-feature-banner-glyph">
      <MusicBannerIcon />
    </BannerGlyphShell>
  );
}

/** CTA compacto: abrir música (misma flecha que ejercicios). */
export function MusicOpenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M5 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Promo banners mobile: line-art (mismo lenguaje que el reloj 24h).
 * Solo stroke / currentColor — sin rellenos saturados.
 */
export function PromoCareLineIcon() {
  return (
    <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="48" cy="48" r="36" stroke="currentColor" strokeWidth="2.4" />
      <path
        d="M48 66.5c-1.2 0-18-11.2-18-23.2 0-6.4 5-10.8 10.6-10.8 3.8 0 6.6 2.2 7.4 5.2.8-3 3.6-5.2 7.4-5.2 5.6 0 10.6 4.4 10.6 10.8 0 12-16.8 23.2-18 23.2Z"
        fill="#ef4444"
        stroke="#dc2626"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M33 30.5c2.2-3.6 6.2-5.2 10-4.2"
        stroke="#fecaca"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}

export function PromoMatchLineIcon() {
  return (
    <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="48" cy="48" r="36" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="36.5" cy="40" r="7.2" stroke="currentColor" strokeWidth="2.3" />
      <circle cx="59.5" cy="40" r="7.2" stroke="currentColor" strokeWidth="2.3" />
      <path
        d="M24.5 62.5c2.8-8.2 8.6-12.2 15.5-12.2 3.2 0 6 .8 8.3 2.3"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <path
        d="M71.5 62.5c-2.8-8.2-8.6-12.2-15.5-12.2-3.2 0-6 .8-8.3 2.3"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <path
        d="M42 54.5c1.6 1.8 3.6 2.8 6 2.8s4.4-1 6-2.8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}
