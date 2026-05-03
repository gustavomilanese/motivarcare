const viteEnv = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};

function portalUrl(explicit: string | undefined, devUrl: string, prodDefault: string): string {
  const trimmed = explicit?.trim();
  const raw = trimmed && trimmed.length > 0 ? trimmed : import.meta.env.DEV ? devUrl : prodDefault;
  return raw.replace(/\/+$/, "");
}

const PATIENT_PORTAL_URL = portalUrl(
  viteEnv.VITE_PATIENT_PORTAL_URL,
  "http://localhost:5173",
  "https://app.motivarcare.com"
);

/** Host que mostramos en el CTA (siempre marca pública; el `href` sigue usando PATIENT_PORTAL_URL). */
const PORTAL_CTA_DISPLAY_HOST = "motivarcare.com";

/** Hero full-bleed: premium 2400×1371 + WebP para nitidez en pantallas grandes. */
const HERO_PHOTO = {
  webp: "/photos/hero-quienes-somos-premium.webp",
  jpg: "/photos/hero-quienes-somos-premium.jpg",
  width: 2400,
  height: 1371
} as const;

const IMG = {
  featAnywhere: "/photos/feat-desde-cualquier-lugar.jpg",
  featMinutes: "/photos/feat-conecta-en-minutos.jpg",
  featLatam: "/photos/feat-latam-psicologos.jpg",
  featCare: "/photos/feat-acompanamiento-bien.jpg",
  matchAvatar: "/photos/08-sesion-profesional-notas.jpg"
} as const;

function GlobeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.85" />
      <path
        d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AiOnboardingBubbles() {
  return (
    <>
      <p className="plv2-ai-bubble plv2-ai-bubble--user">¿Me ayudás a encontrar psicólogo?</p>
      <div className="plv2-ai-bot-row">
        <span className="plv2-ai-bot-avatar">
          <AiBotAvatar />
        </span>
        <p className="plv2-ai-bubble plv2-ai-bubble--bot">¿Qué te gustaría trabajar en terapia?</p>
      </div>
      <p className="plv2-ai-bubble plv2-ai-bubble--user">Ansiedad y que no duermo bien.</p>
      <p className="plv2-ai-bubble plv2-ai-bubble--bot plv2-ai-bubble--follow">¿Desde cuándo lo sentís así?</p>
      <p className="plv2-ai-bubble plv2-ai-bubble--user">Hace unos meses; peor los domingos.</p>
      <p className="plv2-ai-bubble plv2-ai-bubble--bot plv2-ai-bubble--follow">
        ¿Preferís sesiones por la mañana o por la tarde?
      </p>
      <p className="plv2-ai-bubble plv2-ai-bubble--user">Por la tarde.</p>
      <p className="plv2-ai-bubble plv2-ai-bubble--bot plv2-ai-bubble--follow plv2-ai-bubble--accent">
        Gracias — ya estoy buscando tu match ideal.
      </p>
    </>
  );
}

function AiBotAvatar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3c-2.2 0-4 1.6-4 3.6V9H8c-.6 0-1 .4-1 1v6c0 .6.4 1 1 1h8c.6 0 1-.4 1-1v-6c0-.6-.4-1-1-1h-.2V6.6C16 4.6 14.2 3 12 3z"
        fill="rgba(148, 163, 184, 0.95)"
      />
      <circle cx="9" cy="13" r="1.35" fill="#0f172a" />
      <circle cx="15" cy="13" r="1.35" fill="#0f172a" />
      <path d="M9 16.5h6" stroke="#45b8ad" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12 20v2M10 22h4" stroke="rgba(148,163,184,0.8)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

const FLAGS = ["🇲🇽", "🇦🇷", "🇺🇾", "🇨🇴", "🇪🇨", "🇻🇪", "🇨🇱", "🇵🇪"] as const;

function BrandWordmark(props: { className?: string; light?: boolean }) {
  return (
    <span className={props.className}>
      <span className={props.light ? "plv2-wm-motivar plv2-wm-motivar--light" : "plv2-wm-motivar"}>motivar</span>
      <span className={props.light ? "plv2-wm-care plv2-wm-care--light" : "plv2-wm-care"}>care</span>
    </span>
  );
}

export function App() {
  return (
    <div className="plv2-page">
      <section className="plv2-hero-shell" aria-labelledby="plv2-hero-title">
        <div className="plv2-hero-bg" aria-hidden="true">
          <picture>
            <source type="image/webp" srcSet={HERO_PHOTO.webp} />
            <img
              src={HERO_PHOTO.jpg}
              alt=""
              className="plv2-hero-bg-img"
              width={HERO_PHOTO.width}
              height={HERO_PHOTO.height}
              sizes="100vw"
              fetchPriority="high"
              decoding="async"
            />
          </picture>
          <div className="plv2-hero-bg-scrim" />
        </div>
        <header className="plv2-header plv2-header--restyle">
          <div className="plv2-container plv2-header-inner">
            <a href="/" className="plv2-brand plv2-brand--official" aria-label="MotivarCare — inicio">
              <img
                src="/brand/motivarcare-logo-full.png"
                alt="MotivarCare"
                className="plv2-brand-lockup"
                width={236}
                height={72}
                decoding="async"
              />
            </a>
            <a className="plv2-btn plv2-btn--header" href={PATIENT_PORTAL_URL} target="_blank" rel="noreferrer">
              Ingresar
            </a>
          </div>
        </header>

        <div className="plv2-container plv2-hero-stage">
          <div className="plv2-hero-copy">
            <h1 id="plv2-hero-title">
              Encontrá el <span className="plv2-hl-blue plv2-hl-mark">psicólogo</span> ideal para vos,{" "}
              <span className="plv2-hl-blue plv2-hl-mark">en minutos</span>
            </h1>
            <p className="plv2-hero-lead">
              Terapia online, fácil, rápida y 100% pensada para vos. Desde cualquier lugar.
            </p>
            <a className="plv2-cta-gradient" href={PATIENT_PORTAL_URL} target="_blank" rel="noreferrer">
              <span className="plv2-cta-gradient-globe" aria-hidden="true">
                <GlobeIcon />
              </span>
              <span className="plv2-cta-gradient-text">
                Empezá hoy en <strong>{PORTAL_CTA_DISPLAY_HOST}</strong>
              </span>
            </a>
          </div>

          <div className="plv2-hero-media">
            <svg className="plv2-hero-connector" viewBox="0 0 420 360" preserveAspectRatio="none" aria-hidden="true">
              <path
                d="M 72 268 C 120 220 160 188 228 148 C 288 112 330 96 352 88"
                fill="none"
                stroke="rgba(255,255,255,0.82)"
                strokeWidth="2.25"
                strokeDasharray="7 9"
                strokeLinecap="round"
              />
            </svg>
            <aside className="plv2-match-card" aria-label="Ejemplo de match">
              <div className="plv2-match-card-top">
                <div className="plv2-match-card-photo plv2-match-anim-photo">
                  <img src={IMG.matchAvatar} alt="" width={56} height={56} />
                </div>
                <div className="plv2-match-card-copy">
                  <p className="plv2-match-card-name">
                    <span className="plv2-match-anim-text plv2-match-anim-text--name">Lic. Agustina Torres</span>
                  </p>
                  <p className="plv2-match-card-meta">
                    <span className="plv2-match-anim-text plv2-match-anim-text--meta">
                      Psicóloga<span className="plv2-match-meta-sep"> | </span>MP 12345
                    </span>
                  </p>
                  <p className="plv2-match-card-stars" aria-label="Calificación cinco sobre cinco">
                    <span className="plv2-match-stars-row" aria-hidden="true">
                      <span className="plv2-match-star">★</span>
                      <span className="plv2-match-star">★</span>
                      <span className="plv2-match-star">★</span>
                      <span className="plv2-match-star">★</span>
                      <span className="plv2-match-star">★</span>
                    </span>
                    <span className="plv2-match-rating plv2-match-anim-rating">5.0</span>
                  </p>
                </div>
              </div>
              <span className="plv2-match-badge plv2-match-anim-badge">
                <span className="plv2-match-badge-icon" aria-hidden="true">
                  ✓
                </span>
                <span className="plv2-match-anim-text plv2-match-anim-text--badge">¡Es tu match!</span>
              </span>
              <span className="plv2-match-card-heart plv2-match-anim-heart" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 21s-7-4.35-7-10a5 5 0 019.09-2.91A5 5 0 0119 11c0 5.65-7 10-7 10z"
                    fill="var(--plv2-blue)"
                  />
                </svg>
              </span>
            </aside>
          </div>
        </div>
      </section>

      <section className="plv2-features" aria-labelledby="plv2-features-title">
        <h2 id="plv2-features-title" className="plv2-visually-hidden">
          Por qué MotivarCare
        </h2>
        <ul className="plv2-feature-grid">
          <li className="plv2-feature-card plv2-feature-card--accent-blue">
            <div className="plv2-feature-card-media">
              <img src={IMG.featAnywhere} alt="" loading="lazy" width={1024} height={573} />
            </div>
            <div className="plv2-feature-card-body">
              <h3 className="plv2-feature-title">Desde cualquier lugar</h3>
              <p className="plv2-feature-text">
                Hacé terapia desde tu casa, tu trabajo o donde estés. Sin traslados, sin esperas.
              </p>
            </div>
          </li>

          <li className="plv2-feature-card plv2-feature-card--accent-teal">
            <div className="plv2-feature-card-media">
              <img src={IMG.featLatam} alt="" loading="lazy" width={735} height={490} />
              <div className="plv2-flag-overlay" aria-label="Países de Latinoamérica">
                {FLAGS.map((f) => (
                  <span key={f} className="plv2-flag" role="img">
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <div className="plv2-feature-card-body">
              <h3 className="plv2-feature-title">Conectá en minutos</h3>
              <p className="plv2-feature-text">Encontramos el psicólogo ideal para vos en tiempo récord.</p>
            </div>
          </li>

          <li className="plv2-feature-card plv2-feature-card--accent-violet">
            <div className="plv2-feature-card-media plv2-feature-card-media--ai">
              <div className="plv2-ai-showcase" aria-hidden="true">
                <div className="plv2-ai-showcase-bg" />
                <div className="plv2-ai-showcase-shine" />
                <div className="plv2-ai-glass">
                  <div className="plv2-ai-glass-inner">
                    <div className="plv2-ai-chat plv2-ai-chat--onboarding">
                      <div className="plv2-ai-chat-window">
                        <div className="plv2-ai-chat-marquee">
                          <div className="plv2-ai-chat-track">
                            <AiOnboardingBubbles />
                          </div>
                          <div className="plv2-ai-chat-track" aria-hidden="true">
                            <AiOnboardingBubbles />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="plv2-feature-card-body">
              <h3 className="plv2-feature-title">Inteligencia artificial que te entiende</h3>
              <p className="plv2-feature-text">Nuestra IA analiza tus necesidades para hacer el match perfecto.</p>
            </div>
          </li>

          <li className="plv2-feature-card plv2-feature-card--accent-amber">
            <div className="plv2-feature-card-media">
              <img src={IMG.featMinutes} alt="" loading="lazy" width={1024} height={682} />
            </div>
            <div className="plv2-feature-card-body">
              <h3 className="plv2-feature-title">Miles de psicólogos en Latinoamérica</h3>
              <p className="plv2-feature-text">
                Contamos con la red de psicólogos certificados más grande de la región.
              </p>
            </div>
          </li>

          <li className="plv2-feature-card plv2-feature-card--accent-rose">
            <div className="plv2-feature-card-media">
              <img src={IMG.featCare} alt="" loading="lazy" width={735} height={490} />
            </div>
            <div className="plv2-feature-card-body">
              <h3 className="plv2-feature-title">Acompañamiento que te hace bien</h3>
              <p className="plv2-feature-text">No estás solo. Te acompañamos en cada paso del proceso.</p>
            </div>
          </li>
        </ul>
      </section>

      <footer className="plv2-footer-band">
        <div className="plv2-container plv2-footer-inner">
          <div className="plv2-footer-left">
            <img
              src="/brand/motivarcare-mark.png"
              alt=""
              className="plv2-footer-mark-img"
              width={138}
              height={138}
              decoding="async"
            />
          </div>
          <p className="plv2-footer-center">
            No tenés que estar bien para pedir ayuda.
            <br />
            <strong>Estamos para acompañarte.</strong>
          </p>
          <div className="plv2-footer-right">
            <div className="plv2-footer-brand-text">
              <BrandWordmark light className="plv2-footer-wm" />
              <span className="plv2-footer-tag">TU BIENESTAR, SIN ESPERAS</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
