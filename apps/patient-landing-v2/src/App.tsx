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

const PROFESSIONAL_PORTAL_URL = portalUrl(
  viteEnv.VITE_PROFESSIONAL_PORTAL_URL,
  "http://localhost:5174",
  "https://pro.motivarcare.com"
);

/** Host que mostramos en el CTA (siempre marca pública; el `href` sigue usando PATIENT_PORTAL_URL). */
const PORTAL_CTA_DISPLAY_HOST = "motivarcare.com";

/** Hero full-bleed (intrínsecos para CLS). */
const HERO_PHOTO = {
  jpg: "/photos/hero-quienes-somos-premium.jpg",
  width: 1024,
  height: 682
} as const;

const IMG = {
  featAnywhere: "/photos/feat-desde-cualquier-lugar.jpg",
  featMinutes: "/photos/feat-conecta-en-minutos.jpg",
  featLatam: "/photos/feat-latam-psicologos.jpg",
  featCare: "/photos/feat-acompanamiento-bien.jpg",
  matchAvatar: "/photos/08-sesion-profesional-notas.jpg",
  /** Panel único: copy + retratos y sellos (todo en la imagen; no superponer texto en HTML). */
  psicologosPanel: "/photos/psicologos-verificados-panel.jpg",
  /** Videollamada terapia desde casa (¿Quiénes somos? — banda full width). */
  quienesSomosStrip: "/photos/quienes-somos-videollamada.png",
  /** Precios — panel + lifestyle (misma composición que mock). */
  pricingLifestyle: "/photos/precios-terapia-online.png"
} as const;

const PLV2_FAQ_ITEMS = [
  {
    q: "¿Cómo sé qué psicólogo elegir?",
    a: "Revisá perfiles, años de experiencia y enfoque terapéutico. Si la primera opción no cierra, podés ajustar y probar con otro profesional sin dramas."
  },
  {
    q: "¿Las sesiones son confidenciales?",
    a: "Sí. Son privadas y se rigen por el secreto profesional que corresponde a cada matriculado."
  },
  {
    q: "¿Qué pasa si no conecto con el profesional?",
    a: "Podés cambiar de psicólogo cuando lo necesites. La idea es encontrar uno que te guste y te dé confianza."
  },
  {
    q: "¿Necesito experiencia previa en terapia?",
    a: "No. Podés empezar aunque sea tu primera vez en un proceso terapéutico."
  },
  {
    q: "¿Cómo es la sesión online?",
    a: "Videollamada en un entorno seguro de la plataforma. Solo necesitás internet y un lugar tranquilo."
  },
  {
    q: "¿Puedo elegir horario?",
    a: "Sí. Elegís día y franja según la disponibilidad que cada profesional publica."
  }
] as const;

function Plv2FaqChevron() {
  return (
    <span className="plv2-faq-chevron" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M6 9l6 6 6-6"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

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
          <div className="plv2-hero-bg-scrim" />
        </div>
        <header className="plv2-header plv2-header--restyle">
          <div className="plv2-container plv2-header-inner">
            <a href="/" className="plv2-brand plv2-brand--official" aria-label="MotivarCare — inicio">
              <img
                src="/brand/motivarcare-logo-full.png"
                alt="MotivarCare"
                className="plv2-brand-lockup"
                width={172}
                height={53}
                decoding="async"
              />
            </a>
            <a className="plv2-cta-gradient plv2-cta-gradient--header" href={PATIENT_PORTAL_URL} target="_blank" rel="noreferrer">
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

      <section className="plv2-bento" aria-labelledby="plv2-bento-title">
        <div className="plv2-container plv2-bento-intro">
          <p className="plv2-bento-eyebrow">Todo en un solo lugar</p>
          <h2 id="plv2-bento-title" className="plv2-bento-heading">
            Pensado para que empieces sin fricción.
          </h2>
          <p className="plv2-bento-lead">
            La misma idea que guía sitios de servicios modernos: información clara, pasos simples y confianza antes de
            reservar.
          </p>
        </div>

        <div className="plv2-container">
          <figure className="plv2-bento-figure">
            <img
              src={IMG.psicologosPanel}
              alt="Psicólogos certificados: equipo profesional con sello por país."
              width={1024}
              height={682}
              loading="lazy"
              decoding="async"
              className="plv2-bento-figure-img"
            />
          </figure>
        </div>
      </section>

      <section className="plv2-steps" aria-labelledby="plv2-steps-title">
        <div className="plv2-container plv2-steps-inner">
          <h2 id="plv2-steps-title" className="plv2-steps-heading">
            Cuatro pasos para empezar
          </h2>
          <p className="plv2-steps-lead">Del registro a tu primera sesión, sin complicaciones.</p>
          <ol className="plv2-steps-list">
            <li className="plv2-steps-card">
              <span className="plv2-steps-num" aria-hidden="true">
                1
              </span>
              <div className="plv2-steps-card-body">
                <h3 className="plv2-steps-item-title">Registrate</h3>
                <p className="plv2-steps-item-text">Creá tu cuenta en el portal en minutos con tu correo.</p>
              </div>
            </li>
            <li className="plv2-steps-card">
              <span className="plv2-steps-num" aria-hidden="true">
                2
              </span>
              <div className="plv2-steps-card-body">
                <h3 className="plv2-steps-item-title">Contanos sobre vos</h3>
                <p className="plv2-steps-item-text">
                  Completá el informe o charlá con nuestra IA para entender qué necesitás.
                </p>
              </div>
            </li>
            <li className="plv2-steps-card">
              <span className="plv2-steps-num" aria-hidden="true">
                3
              </span>
              <div className="plv2-steps-card-body">
                <h3 className="plv2-steps-item-title">Conocé tu match</h3>
                <p className="plv2-steps-item-text">
                  Te mostramos profesionales que encajan con tu perfil y preferencias.
                </p>
              </div>
            </li>
            <li className="plv2-steps-card">
              <span className="plv2-steps-num" aria-hidden="true">
                4
              </span>
              <div className="plv2-steps-card-body">
                <h3 className="plv2-steps-item-title">Reservá y empezá</h3>
                <p className="plv2-steps-item-text">
                  Elegí horario y arrancá sesiones online cuando te quede cómodo.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className="plv2-photo-strip" aria-labelledby="plv2-photo-strip-title">
        <div className="plv2-photo-strip-frame">
          <img
            src={IMG.quienesSomosStrip}
            alt="Persona en una videollamada con una profesional, desde un espacio tranquilo en casa"
            width={1024}
            height={682}
            loading="lazy"
            decoding="async"
            className="plv2-photo-strip-bg"
          />
          <div className="plv2-photo-strip-scrim" aria-hidden="true" />
          <div className="plv2-photo-strip-content">
            <div className="plv2-container">
              <div className="plv2-hero-copy">
                <p className="plv2-photo-strip-kicker">MotivarCare</p>
                <h2 id="plv2-photo-strip-title">¿Quiénes somos?</h2>
                <p className="plv2-hero-lead">Terapia que se adapta a tu día, no al revés.</p>
                <p className="plv2-hero-lead">
                  Nacimos para acercarte a un{" "}
                  <span className="plv2-hl-blue plv2-hl-mark">acompañamiento psicológico de calidad</span>,{" "}
                  <br className="plv2-br-desktop" />
                  sin barreras innecesarias:{" "}
                  <span className="plv2-hl-blue plv2-hl-mark">accesible y cercano</span>, pensado para la vida real.
                </p>
                <a
                  className="plv2-cta-gradient plv2-photo-strip-cta"
                  href={PATIENT_PORTAL_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="plv2-cta-gradient-globe" aria-hidden="true">
                    <GlobeIcon />
                  </span>
                  <span className="plv2-cta-gradient-text">
                    Empezá hoy en <strong>{PORTAL_CTA_DISPLAY_HOST}</strong>
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="plv2-pricing-split" id="precios" aria-labelledby="plv2-pricing-title">
        <div className="plv2-container plv2-pricing-split-inner">
          <div className="plv2-pricing-split-copy">
            <p className="plv2-pricing-eyebrow">Precios transparentes</p>
            <h2 id="plv2-pricing-title" className="plv2-pricing-title">
              Sesiones claras, sin sorpresas
            </h2>
            <p className="plv2-pricing-lead">
              Cada profesional define el valor de su sesión; vos ves el precio antes de confirmar.
            </p>
            <ul className="plv2-pricing-cards" role="list">
              <li className="plv2-pricing-card">
                <p>
                  Desde <strong>$40.000 ARS</strong> por sesión, según experiencia y orientación terapéutica.
                </p>
              </li>
              <li className="plv2-pricing-card">
                <p>
                  Duración estándar: <strong>50 minutos</strong>.
                </p>
              </li>
              <li className="plv2-pricing-card">
                <p>
                  <strong>Descuentos en packs</strong> de 4, 8 o 12 sesiones cuando el profesional los ofrezca.
                </p>
              </li>
              <li className="plv2-pricing-card">
                <p>
                  <strong>Sin suscripción obligatoria:</strong> pagás por lo que usás.
                </p>
              </li>
            </ul>
            <div className="plv2-pricing-cta-block">
              <h3 className="plv2-pricing-cta-title">Listo para empezar</h3>
              <p className="plv2-pricing-cta-text">
                Creá tu cuenta, explorá perfiles y reservá tu primera sesión cuando quieras.
              </p>
              <a
                className="plv2-cta-gradient plv2-cta-gradient--header plv2-pricing-cta-btn"
                href={PATIENT_PORTAL_URL}
                target="_blank"
                rel="noreferrer"
              >
                Reservar mi primera sesión
              </a>
            </div>
          </div>
          <figure className="plv2-pricing-split-media">
            <img
              src={IMG.pricingLifestyle}
              alt="Persona en videollamada de terapia desde el sillón de casa, con la laptop."
              width={1024}
              height={682}
              loading="lazy"
              decoding="async"
              className="plv2-pricing-split-img"
            />
          </figure>
        </div>
      </section>

      <section className="plv2-faq" id="faq" aria-labelledby="plv2-faq-title">
        <div className="plv2-container plv2-faq-inner">
          <header className="plv2-faq-head">
            <p className="plv2-faq-eyebrow">Dudas comunes</p>
            <h2 id="plv2-faq-title" className="plv2-faq-title">
              Preguntas frecuentes
            </h2>
            <p className="plv2-faq-lead">
              Respuestas claras antes de tu primera sesión. Si necesitás algo más específico, escribinos desde el portal.
            </p>
          </header>
          <div className="plv2-faq-list" role="region" aria-label="Preguntas y respuestas">
            {PLV2_FAQ_ITEMS.map((item) => (
              <details key={item.q} className="plv2-faq-item">
                <summary className="plv2-faq-summary">
                  <span className="plv2-faq-q">{item.q}</span>
                  <Plv2FaqChevron />
                </summary>
                <div className="plv2-faq-answer">
                  <p>{item.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="plv2-footer-band">
        <div className="plv2-container plv2-footer-inner">
          <div className="plv2-footer-left">
            <img
              src="/brand/motivarcare-mark.png"
              alt=""
              className="plv2-footer-mark-img"
              width={96}
              height={96}
              decoding="async"
            />
          </div>

          <div className="plv2-footer-mid">
            <nav className="plv2-footer-portals" aria-label="Acceso a portales">
              <a
                className="plv2-footer-portal-link"
                href={PATIENT_PORTAL_URL}
                target="_blank"
                rel="noreferrer"
              >
                Portal pacientes
              </a>
              <a
                className="plv2-footer-portal-link"
                href={PROFESSIONAL_PORTAL_URL}
                target="_blank"
                rel="noreferrer"
              >
                Portal profesionales
              </a>
            </nav>
            <nav className="plv2-footer-legal" aria-label="Legal y apoyo">
              <a className="plv2-footer-legal-link" href="/docs/privacy.html">
                Política de privacidad
              </a>
              <span className="plv2-footer-sep" aria-hidden="true">
                ·
              </span>
              <a className="plv2-footer-legal-link" href="/docs/terms.html">
                Términos
              </a>
              <span className="plv2-footer-sep" aria-hidden="true">
                ·
              </span>
              <a className="plv2-footer-legal-link" href="/docs/crisis.html">
                Líneas de apoyo
              </a>
            </nav>
            <p className="plv2-footer-copyline">
              © 2026 MotivarCare · Argentina ·{" "}
              <a className="plv2-footer-mail" href="mailto:soporte@motivarcare.com">
                soporte@motivarcare.com
              </a>
            </p>
          </div>

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
