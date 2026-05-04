import { useMemo } from "react";
import { LandingMacaChat } from "./LandingMacaChat";

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

/** Fotos existentes en public/photos */
const IMG = {
  heroWomanPhone: "/photos/07-videollamada-desde-casa.jpg",
  featAnywhere: "/photos/06-pods-oficina-premium.jpg",
  featMinutes: "/photos/11-pool-desayuno-laptop.jpg",
  featNetwork: "/photos/psicologos-verificados.png",
  featCare: "/photos/03-escritorio-atardecer.jpg",
  matchAvatar: "/photos/08-sesion-profesional-notas.jpg"
} as const;

function MotivarCareLogoMark(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      width="44"
      height="44"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Burbujas de diálogo superpuestas (identidad) + acento corazón */}
      <rect
        x="5"
        y="11"
        width="20"
        height="16"
        rx="6"
        fill="rgba(64,193,172,0.18)"
        stroke="#40C1AC"
        strokeWidth="1.75"
      />
      <rect
        x="23"
        y="7"
        width="20"
        height="16"
        rx="6"
        fill="rgba(64,193,172,0.28)"
        stroke="#40C1AC"
        strokeWidth="1.75"
      />
      <path
        d="M24 38.5c-5.6-4.2-9.2-7.3-9.2-12.1 0-2.6 2-4.6 4.5-4.6 1.4 0 2.6.6 3.4 1.5.8-.9 2-1.5 3.4-1.5 2.5 0 4.5 2 4.5 4.6 0 4.8-3.6 7.9-9.2 12.1z"
        fill="#40C1AC"
        opacity="0.92"
      />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

const FLAGS = ["🇲🇽", "🇦🇷", "🇺🇾", "🇨🇴", "🇪🇨", "🇻🇪", "🇨🇱", "🇵🇪"] as const;

export function App() {
  const portalLabel = useMemo(() => {
    try {
      return new URL(PATIENT_PORTAL_URL).hostname.replace(/^www\./, "");
    } catch {
      return "motivarcare.com";
    }
  }, []);

  return (
    <div className="mc-page">
      <header className="mc-header">
        <div className="mc-container mc-header-inner">
          <a href="/" className="mc-brand" aria-label="MotivarCare — inicio">
            <MotivarCareLogoMark className="mc-brand-mark" />
            <div className="mc-brand-text">
              <span className="mc-brand-name">motivarcare</span>
              <span className="mc-brand-tagline">Bienestar, sin esperas</span>
            </div>
          </a>
          <nav className="mc-header-nav" aria-label="Secciones">
            <a className="mc-header-nav-link" href="#quienes-somos">
              Quiénes somos
            </a>
            <a className="mc-header-nav-link" href="#como-empezar">
              Cómo empezar
            </a>
            <a className="mc-header-nav-link" href="#reviews">
              Reviews
            </a>
            <a className="mc-header-nav-link" href="#faq">
              FAQs
            </a>
          </nav>
          <a className="mc-btn mc-btn--ghost" href={PATIENT_PORTAL_URL} target="_blank" rel="noreferrer">
            Ingresar
          </a>
        </div>
      </header>

      <main>
        <section className="mc-hero" aria-labelledby="mc-hero-title">
          <div className="mc-container mc-hero-grid">
            <div className="mc-hero-copy">
              <h1 id="mc-hero-title">
                <span className="mc-hero-title-line1">
                  Encuentra el <strong>psicólogo ideal en minutos</strong>
                </span>
                <br />
                <span className="mc-hero-title-line2">de forma simple y segura.</span>
                <br />
                <span className="mc-hero-title-line3">
                  <strong>¡Tu cambio empieza acá!</strong>
                </span>
              </h1>
              <p className="mc-hero-lead">
                Terapia en línea, fácil y rápida, pensada para quien la necesita. Desde cualquier lugar.
              </p>
              <a className="mc-btn mc-btn--primary mc-hero-cta" href={PATIENT_PORTAL_URL} target="_blank" rel="noreferrer">
                <GlobeIcon />
                <span>
                  Empiece hoy en <strong>{portalLabel}</strong>
                </span>
              </a>
            </div>

            <div className="mc-hero-visual">
              <div className="mc-hero-photo-wrap">
                <img
                  src={IMG.heroWomanPhone}
                  alt=""
                  width={900}
                  height={600}
                  className="mc-hero-photo"
                  decoding="async"
                  fetchPriority="high"
                />
                <div className="mc-hero-photo-scrim" aria-hidden="true" />
              </div>

              <aside className="mc-match-card" aria-label="Ejemplo de match">
                <div className="mc-match-card-photo">
                  <img src={IMG.matchAvatar} alt="" width={56} height={56} />
                </div>
                <div className="mc-match-card-body">
                  <p className="mc-match-card-name">Lic. Agustina Torres</p>
                  <p className="mc-match-card-meta">Psicóloga · MP 12345</p>
                  <p className="mc-match-card-stars" aria-label="Calificación cinco sobre cinco">
                    ★★★★★ <span>5.0</span>
                  </p>
                </div>
                <span className="mc-match-badge">¡Coincidencia ideal!</span>
              </aside>
            </div>
          </div>
        </section>

        <section className="mc-features" aria-labelledby="mc-features-title">
          <div className="mc-container">
            <h2 id="mc-features-title" className="mc-visually-hidden">
              Por qué elegir MotivarCare
            </h2>
            <ul className="mc-feature-grid">
              <li className="mc-feature-card">
                <div className="mc-feature-icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.75" />
                  </svg>
                </div>
                <div className="mc-feature-photo">
                  <img src={IMG.featAnywhere} alt="" loading="lazy" width={640} height={400} />
                </div>
                <h3 className="mc-feature-title">Desde cualquier lugar</h3>
                <p className="mc-feature-text">
                  Terapia desde el hogar, el trabajo o donde se encuentre. Sin traslados ni esperas.
                </p>
              </li>

              <li className="mc-feature-card">
                <div className="mc-feature-icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M13 2L3 14h8l-1 8 12-14h-8l1-6z"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="mc-feature-photo">
                  <img src={IMG.featMinutes} alt="" loading="lazy" width={640} height={400} />
                </div>
                <h3 className="mc-feature-title">Conexión en minutos</h3>
                <p className="mc-feature-text">
                  Encontramos el psicólogo ideal en tiempo récord.
                </p>
              </li>

              <li className="mc-feature-card">
                <div className="mc-feature-icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 3a7 7 0 00-7 7c0 3.5 2.5 6.5 6 7v3l3-2"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                    <path d="M9 10h.01M15 10h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="mc-feature-photo mc-feature-photo--phone">
                  <div className="mc-ai-phone">
                    <span className="mc-ai-phone-label">Buscando la mejor coincidencia…</span>
                    <span className="mc-ai-dots" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                  </div>
                </div>
                <h3 className="mc-feature-title">Inteligencia artificial a la medida</h3>
                <p className="mc-feature-text">
                  Nuestra IA analiza las necesidades de cada persona para el mejor match.
                </p>
              </li>

              <li className="mc-feature-card">
                <div className="mc-feature-icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <circle cx="9" cy="10" r="3" stroke="currentColor" strokeWidth="1.75" />
                    <circle cx="16" cy="10" r="3" stroke="currentColor" strokeWidth="1.75" />
                    <path
                      d="M4 19c1.5-3 4.5-5 9-5s7.5 2 9 5"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="mc-feature-photo">
                  <img src={IMG.featNetwork} alt="" loading="lazy" width={640} height={400} />
                </div>
                <div className="mc-flag-row" aria-label="Países de Latinoamérica">
                  {FLAGS.map((f) => (
                    <span key={f} className="mc-flag" role="img">
                      {f}
                    </span>
                  ))}
                </div>
                <h3 className="mc-feature-title">Miles de psicólogos en Latinoamérica</h3>
                <p className="mc-feature-text">
                  Contamos con la red de psicólogos certificados más grande de la región.
                </p>
              </li>

              <li className="mc-feature-card">
                <div className="mc-feature-icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 21s-7-4.35-7-10a5 5 0 019.09-2.91A5 5 0 0119 11c0 5.65-7 10-7 10z"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="mc-feature-photo">
                  <img src={IMG.featCare} alt="" loading="lazy" width={640} height={400} />
                </div>
                <h3 className="mc-feature-title">Acompañamiento que hace bien</h3>
                <p className="mc-feature-text">No hay que enfrentarlo solo: acompañamos en cada paso del proceso.</p>
              </li>
            </ul>
          </div>
        </section>

        <section className="mc-section mc-section--soft" id="quienes-somos" aria-labelledby="mc-quienes-title">
          <div className="mc-container">
            <h2 id="mc-quienes-title" className="mc-section-title">
              Quiénes somos
            </h2>
            <p className="mc-section-prose">
              <strong>Maca</strong> impulsó MotivarCare con la convicción de que pedir ayuda psicológica puede ser claro y
              cercano. Conectamos a personas con psicólogos matriculados en Latinoamérica, con procesos simples, terapia en
              línea y un enfoque humano. La relación clínica es entre usted y el profesional; nosotros facilitamos la
              reserva, la videollamada y el acompañamiento del servicio.
            </p>
          </div>
        </section>

        <section className="mc-section" id="como-empezar" aria-labelledby="mc-pasos-title">
          <div className="mc-container">
            <h2 id="mc-pasos-title" className="mc-section-title">
              Cómo empezar
            </h2>
            <ol className="mc-steps-list">
              <li>
                <strong>Registro.</strong> Cree la cuenta en el portal con su correo.
              </li>
              <li>
                <strong>Contexto.</strong> Complete el informe o use la guía con IA para acotar qué busca.
              </li>
              <li>
                <strong>Match.</strong> Revise la recomendación y perfiles alineados a sus preferencias.
              </li>
              <li>
                <strong>Reserva.</strong> Elija horario y comience las sesiones en línea.
              </li>
            </ol>
          </div>
        </section>

        <section className="mc-section mc-section--soft" id="reviews" aria-labelledby="mc-reviews-title">
          <div className="mc-container">
            <h2 id="mc-reviews-title" className="mc-section-title">
              Reviews
            </h2>
            <p className="mc-section-lead">Lo que dicen quienes ya usaron MotivarCare.</p>
            <ul className="mc-reviews-grid" role="list">
              <li className="mc-review-card">
                <p className="mc-review-stars" aria-label="Calificación cinco sobre cinco">
                  ★★★★★
                </p>
                <p className="mc-review-text">
                  Proceso claro y buena experiencia con el matching. Las sesiones en línea son cómodas.
                </p>
                <p className="mc-review-meta">Andrea R. · Buenos Aires</p>
              </li>
              <li className="mc-review-card">
                <p className="mc-review-stars" aria-label="Calificación cinco sobre cinco">
                  ★★★★★
                </p>
                <p className="mc-review-text">Se ve el precio antes de confirmar; eso genera confianza.</p>
                <p className="mc-review-meta">Luis M. · Monterrey</p>
              </li>
              <li className="mc-review-card">
                <p className="mc-review-stars" aria-label="Calificación cinco sobre cinco">
                  ★★★★★
                </p>
                <p className="mc-review-text">Plataforma simple y profesional con el que encajé bien.</p>
                <p className="mc-review-meta">Carla V. · Bogotá</p>
              </li>
            </ul>
          </div>
        </section>

        <section className="mc-section" id="faq" aria-labelledby="mc-faq-title">
          <div className="mc-container">
            <h2 id="mc-faq-title" className="mc-section-title">
              FAQs
            </h2>
            <div className="mc-faq-list">
              <details className="mc-faq-item">
                <summary>¿Las sesiones son confidenciales?</summary>
                <p>Sí. Son privadas y el profesional está sujeto al secreto profesional que corresponda según su matrícula.</p>
              </details>
              <details className="mc-faq-item">
                <summary>¿Necesito experiencia previa en terapia?</summary>
                <p>No. Puede empezar aunque sea la primera vez en un proceso terapéutico.</p>
              </details>
              <details className="mc-faq-item">
                <summary>¿Puedo elegir horario?</summary>
                <p>Sí. Puede elegir día y franja según la disponibilidad que cada profesional publique.</p>
              </details>
            </div>
          </div>
        </section>

        <footer className="mc-footer-band">
          <div className="mc-container mc-footer-inner">
            <div className="mc-footer-message">
              <span className="mc-footer-heart" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="11" fill="white" />
                  <path
                    d="M12 18.5c-4.5-3.8-7.5-6.5-7.5-10a4 4 0 017.5-2.2A4 4 0 0119.5 8.5c0 3.5-3 6.2-7.5 10z"
                    fill="#40C1AC"
                  />
                </svg>
              </span>
              <p>
                No hace falta estar bien para pedir ayuda. <strong>Estamos para acompañar.</strong>
              </p>
            </div>
            <div className="mc-footer-brand">
              <MotivarCareLogoMark className="mc-footer-logo-mark" />
              <div>
                <span className="mc-footer-brand-name">motivarcare</span>
                <span className="mc-footer-brand-tag">Bienestar, sin esperas</span>
              </div>
            </div>
          </div>
        </footer>
      </main>
      <LandingMacaChat portalUrl={PATIENT_PORTAL_URL} />
    </div>
  );
}
