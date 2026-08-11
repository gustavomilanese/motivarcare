/** Ícono flat moderno para cabecera Sesiones (calendario + video). */

export function SessionsBannerIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="6" y="10" width="28" height="28" rx="7" stroke="currentColor" strokeWidth="2.4" />
      <path d="M6 18.5h28" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M14 7v6.5M26 7v6.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="12" y="23" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.9" />
      <rect x="20" y="23" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.55" />
      <rect x="12" y="30" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.55" />
      <circle cx="35.5" cy="33.5" r="9.25" fill="currentColor" opacity="0.22" />
      <circle cx="35.5" cy="33.5" r="9.25" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M32.2 31.2h4.1c.7 0 1.2.5 1.2 1.2v3.2c0 .7-.5 1.2-1.2 1.2h-4.1c-.7 0-1.2-.5-1.2-1.2v-3.2c0-.7.5-1.2 1.2-1.2Z"
        fill="currentColor"
      />
      <path d="M37.5 33.2l3.2-1.8v5.2l-3.2-1.8" fill="currentColor" />
    </svg>
  );
}

export function SessionsBannerGlyph() {
  return (
    <div className="dashboard-ml-sessions-banner-glyph" aria-hidden="true">
      <SessionsBannerIcon />
    </div>
  );
}
