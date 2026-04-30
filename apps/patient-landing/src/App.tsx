import { useCallback, useEffect, useRef, useState } from "react";
import { publicApiBase } from "./fetchLandingSessionPackages";
import {
  fetchLandingWebContent,
  resolveReviewAvatarUrl,
  type LandingWebReview
} from "./fetchLandingWebContent";
import { useScrollY } from "./useScrollMotion";
import { useRevealOnScroll } from "./useRevealOnScroll";

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

/** Fotos en public/photos: 15 = hero apaisado completo (contain + fondo oscuro). 16 = bento profesionales. */
const P = {
  heroWebp: "/photos/15-hero-balcon-valle.webp",
  heroJpg: "/photos/15-hero-balcon-valle.jpg",
  /** Bento “Profesionales verificados”: por defecto placeholder; podés sobreescribir este archivo en `public/photos/`. */
  bentoProfesionales: "/photos/16-bento-profesionales-verificado.jpg",
  /** Quiénes somos: asset visual (playa, laptop y café), exportado 2400×1371. */
  aboutAmbientWebp: "/photos/quienes-somos-premium.webp",
  aboutAmbientJpg: "/photos/quienes-somos-premium.jpg",
  /** Acento visual banner profesionales — paisaje suave, no protagonista. */
  bannerAccent: "/photos/04-estudio-montanas-niebla.jpg",
  /** Sección #precios: sesión online desde el living (imagen fija en public/photos). */
  videoHome: "/photos/precios-terapia-online.png",
  therapistNotes: "/photos/08-sesion-profesional-notas.jpg",
  beachLaptop: "/photos/10-playa-primer-plano.jpg",
  poolLaptop: "/photos/11-pool-desayuno-laptop.jpg",
  mountainBalcony: "/photos/12-montanas-balcon-trabajo.jpg"
} as const;

/** Respaldo si el API no responde o Admin no cargó reseñas (misma forma que `/api/public/web-content`). */
const FALLBACK_LANDING_REVIEWS: LandingWebReview[] = [
  {
    id: "fallback-ba",
    name: "María",
    role: "Paciente",
    relativeDate: "hace 2 semanas",
    text: "Pude comparar perfiles y reservar sin vueltas. La primera sesión me dio mucha claridad.",
    rating: 5,
    avatar: P.videoHome,
    accent: "#6d56ff"
  },
  {
    id: "fallback-cba",
    name: "Lucas",
    role: "Paciente",
    relativeDate: "hace 1 mes",
    text: "Ver precio y horarios antes de confirmar me dio confianza. Todo muy ordenado.",
    rating: 5,
    avatar: P.poolLaptop,
    accent: "#6d56ff"
  }
];

export function App() {
  const [landingReviews, setLandingReviews] = useState<LandingWebReview[]>(() => FALLBACK_LANDING_REVIEWS);
  const quotesScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const base = publicApiBase();
    if (!base) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchLandingWebContent(base);
        if (!cancelled && Array.isArray(data.reviews) && data.reviews.length > 0) {
          setLandingReviews(data.reviews);
        }
      } catch {
        // Mantener FALLBACK_LANDING_REVIEWS
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollLandingQuotes = useCallback((direction: "left" | "right") => {
    const viewport = quotesScrollRef.current;
    if (!viewport) {
      return;
    }
    const card = viewport.querySelector(".patient-ar-quote-card");
    const gap = 18;
    const step =
      card instanceof HTMLElement ? card.getBoundingClientRect().width + gap : Math.min(360, window.innerWidth * 0.88);
    viewport.scrollBy({
      left: direction === "left" ? -step : step,
      behavior: "smooth"
    });
  }, []);

  const scrollY = useScrollY();
  const heroShift = scrollY * 0.28;
  const headerSolid = scrollY > 56;
  const reviewApiBase = publicApiBase();
  const revealBento = useRevealOnScroll<HTMLDivElement>();
  const revealAbout = useRevealOnScroll<HTMLDivElement>();
  const revealPricing = useRevealOnScroll<HTMLDivElement>();
  const revealFaq = useRevealOnScroll<HTMLElement>();

  return (
    <div className="patient-ar-page">
      <header className={`patient-ar-header ${headerSolid ? "patient-ar-header--solid" : "patient-ar-header--hero"}`}>
        <div className="patient-ar-container patient-ar-header-inner">
          <a className="patient-ar-logo" href="/" aria-label="MotivarCare">
            <span className="patient-ar-logo-text-mark">MotivarCare</span>
          </a>
          <nav className="patient-ar-nav" aria-label="Secciones">
            <a href="#beneficios">Por qué MotivarCare</a>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#precios">Precios</a>
            <a href="#faq">FAQ</a>
          </nav>
          <a className="patient-ar-top-cta" href={PATIENT_PORTAL_URL} target="_blank" rel="noreferrer">
            Ingresar
          </a>
        </div>
      </header>

      <main>
        <section className="patient-ar-hero-shell patient-ar-hero-shell--fullimg" aria-labelledby="hero-title">
          <div
            className="patient-ar-hero-media patient-ar-hero-media--fullimg"
            style={{ transform: `translate3d(0, ${heroShift * 0.16}px, 0)` }}
            aria-hidden="true"
          >
            <picture className="patient-ar-hero-picture">
              <source srcSet={P.heroWebp} type="image/webp" />
              <img
                src={P.heroJpg}
                alt=""
                className="patient-ar-hero-img patient-ar-hero-img--fullimg patient-ar-photo-grade"
                width={2560}
                height={1462}
                fetchPriority="high"
                decoding="async"
              />
            </picture>
            <div className="patient-ar-hero-scrim patient-ar-hero-scrim--fullimg" />
            <div className="patient-ar-hero-grain" aria-hidden="true" />
          </div>
          <div className="patient-ar-container patient-ar-hero-grid">
            <div className="patient-ar-hero-copy">
              <p className="patient-ar-kicker">Argentina · Terapia 100% online</p>
              <h1 id="hero-title">Encontrá tu psicólogo online con la claridad y el cuidado que buscás</h1>
              <p className="patient-ar-lead">
                Elegí al profesional que mejor encaje con vos, reservá en minutos y empezá tu proceso sin listas de espera. Todo
                desde un solo lugar, seguro y confidencial.
              </p>
              <div className="patient-ar-hero-actions">
                <a className="patient-ar-btn patient-ar-btn--primary" href={PATIENT_PORTAL_URL} target="_blank" rel="noreferrer">
                  Encontrar mi psicólogo
                </a>
                <a
                  className="patient-ar-btn patient-ar-btn--hero-violet patient-ar-hero-actions__secondary"
                  href="#como-funciona"
                >
                  Ver cómo funciona
                </a>
              </div>
              <ul className="patient-ar-checks patient-ar-checks--premium" aria-label="Ventajas">
                <li>
                  <span className="patient-ar-check-title">Psicólogos colegiados</span>
                  <span className="patient-ar-check-desc">Matrícula al día y trayectoria en cada perfil.</span>
                </li>
                <li>
                  <span className="patient-ar-check-title">Sesiones privadas online</span>
                  <span className="patient-ar-check-desc">Videollamada en un entorno protegido de la plataforma.</span>
                </li>
                <li>
                  <span className="patient-ar-check-title">Tu agenda, tu ritmo</span>
                  <span className="patient-ar-check-desc">Reservás día y hora según la disponibilidad publicada.</span>
                </li>
                <li>
                  <span className="patient-ar-check-title">Donde estés</span>
                  <span className="patient-ar-check-desc">Solo necesitás buena conexión y un lugar tranquilo.</span>
                </li>
              </ul>
            </div>
          </div>
          <a className="patient-ar-scroll-hint" href="#beneficios" aria-label="Seguir leyendo">
            <span className="patient-ar-scroll-hint-line" />
          </a>
        </section>

        <section className="patient-ar-section patient-ar-section--tight" id="beneficios" aria-labelledby="benefits-title">
          <div className="patient-ar-container">
            <div className="patient-ar-section-intro patient-ar-section-intro--center">
              <p className="patient-ar-eyebrow">Todo en un solo lugar</p>
              <h2 id="benefits-title">Pensado para que empieces sin fricción</h2>
              <p className="patient-ar-section-lead">
                La misma idea que guía sitios de servicios modernos: información clara, pasos simples y confianza antes de
                reservar.
              </p>
            </div>
            <div className="patient-ar-bento patient-ar-reveal" ref={revealBento}>
              <article className="patient-ar-bento-card patient-ar-bento-card--wide patient-ar-bento-card--img-pros">
                <img
                  className="patient-ar-photo-grade"
                  src={P.bentoProfesionales}
                  alt="Profesionales de la salud mental en entorno de trabajo"
                  loading="lazy"
                />
                <div className="patient-ar-bento-scrim" />
                <div className="patient-ar-bento-copy">
                  <h3>Profesionales verificados</h3>
                  <p>Psicólogos y psicólogas matriculados, con experiencia en ansiedad, estrés, vínculos y más.</p>
                </div>
              </article>
              <article className="patient-ar-bento-card patient-ar-bento-card--rstack patient-ar-bento-card--r1 patient-ar-bento-card--surface patient-ar-bento-card--surface-a">
                <div className="patient-ar-bento-surface-inner">
                  <span className="patient-ar-bento-surface-icon" aria-hidden="true">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <rect x="4" y="5" width="16" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.75" />
                      <path d="M4 9h16M9 3v4M15 3v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div className="patient-ar-bento-surface-copy">
                    <h3>Reservá cuando quieras</h3>
                    <p>Elegís día y horario según la disponibilidad publicada. Sin idas y vueltas.</p>
                  </div>
                </div>
              </article>
              <article className="patient-ar-bento-card patient-ar-bento-card--rstack patient-ar-bento-card--r2 patient-ar-bento-card--surface patient-ar-bento-card--surface-b">
                <div className="patient-ar-bento-surface-inner">
                  <span className="patient-ar-bento-surface-icon" aria-hidden="true">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <div className="patient-ar-bento-surface-copy">
                    <h3>Maca, en tu portal</h3>
                    <p>
                      Tu asistente entre sesiones: respuestas claras y apoyo cuando lo necesités, siempre dentro de tu espacio privado en
                      MotivarCare.
                    </p>
                  </div>
                </div>
              </article>
              <article className="patient-ar-bento-card patient-ar-bento-card--rstack patient-ar-bento-card--r3 patient-ar-bento-card--surface patient-ar-bento-card--surface-c">
                <div className="patient-ar-bento-surface-inner">
                  <span className="patient-ar-bento-surface-icon" aria-hidden="true">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path d="M7 4h10v16l-3.5-2.5L10 20V4H7z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
                      <path d="M10 8h4M10 11.5h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div className="patient-ar-bento-surface-copy">
                    <h3>Contenido para vos</h3>
                    <p>
                      Ejercicios guiados, documentos útiles, música y playlists, videos y más — pensado para acompañarte cada día en el
                      portal.
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="patient-ar-about-band" id="quienes-somos" aria-labelledby="about-title">
          <div className="patient-ar-about-band__shell">
            <picture className="patient-ar-about-band__picture">
              <source srcSet={P.aboutAmbientWebp} type="image/webp" />
              <img
                className="patient-ar-about-band__img patient-ar-about-band__img--ambient"
                src={P.aboutAmbientJpg}
                alt="Laptop y café frente al mar al atardecer: terapia desde donde estés"
                loading="lazy"
                width={2400}
                height={1371}
                decoding="async"
              />
            </picture>
            <div className="patient-ar-about-band__scrim" aria-hidden="true" />
            <div className="patient-ar-container patient-ar-about-band__inner patient-ar-reveal" ref={revealAbout}>
              <div className="patient-ar-about-band__copy">
                <p className="patient-ar-eyebrow patient-ar-eyebrow--on-dark">MotivarCare</p>
                <h2 id="about-title">¿Quiénes somos?</h2>
                <p className="patient-ar-about-band__tagline">Terapia que se adapta a tu día, no al revés.</p>
                <div className="patient-ar-prose patient-ar-prose--on-dark">
                  <p>
                    Nacimos para acercarte a un <strong>acompañamiento psicológico de calidad</strong>, sin barreras innecesarias:{" "}
                    <strong>accesible y cercano</strong>, pensado para la vida real.
                  </p>
                  <p>
                    Queremos que <strong>encuentres rápido</strong> a un profesional con el que te sientas cómodo/a y empieces tu proceso sin vueltas.
                    Apostamos a un <strong>enfoque humano y profesional</strong>, adaptado a lo que vos necesitás.
                  </p>
                </div>
                <a className="patient-ar-btn patient-ar-btn--primary patient-ar-btn--inline" href={PATIENT_PORTAL_URL} target="_blank" rel="noreferrer">
                  Empezar en el portal
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="patient-ar-section patient-ar-section--how" id="como-funciona" aria-labelledby="how-title">
          <div className="patient-ar-container">
            <div className="patient-ar-section-intro patient-ar-section-intro--center">
              <p className="patient-ar-eyebrow">Cuatro pasos</p>
              <h2 id="how-title">¿Cómo funciona?</h2>
              <p className="patient-ar-section-lead">Simple como debería ser: elegís, reservás, conectás y continuás a tu ritmo.</p>
            </div>
            <ol className="patient-ar-steps patient-ar-steps--rail">
              <li>
                <div className="patient-ar-step-rail-node">
                  <span className="patient-ar-step-rail-icon" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
                      <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span className="patient-ar-step-rail-num">01</span>
                </div>
                <div className="patient-ar-step-rail-body">
                  <strong>Elegís tu psicólogo</strong>
                  <p>Perfiles, enfoques y experiencia para comparar y elegir con confianza.</p>
                </div>
              </li>
              <li>
                <div className="patient-ar-step-rail-node">
                  <span className="patient-ar-step-rail-icon" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <rect x="4" y="5" width="16" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.75" />
                      <path d="M4 9h16M9 3v4M15 3v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span className="patient-ar-step-rail-num">02</span>
                </div>
                <div className="patient-ar-step-rail-body">
                  <strong>Reservás tu sesión</strong>
                  <p>Día y horario disponibles al instante. Sin idas y vueltas.</p>
                </div>
              </li>
              <li>
                <div className="patient-ar-step-rail-node">
                  <span className="patient-ar-step-rail-icon" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <rect x="5" y="7" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.75" />
                      <path d="M9 18h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span className="patient-ar-step-rail-num">03</span>
                </div>
                <div className="patient-ar-step-rail-body">
                  <strong>Sesión online</strong>
                  <p>Privacidad y comodidad desde donde estés.</p>
                </div>
              </li>
              <li>
                <div className="patient-ar-step-rail-node">
                  <span className="patient-ar-step-rail-icon" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
                      <path d="M8 12l3 3 5-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="patient-ar-step-rail-num">04</span>
                </div>
                <div className="patient-ar-step-rail-body">
                  <strong>Continuás tu proceso</strong>
                  <p>Mismo profesional o cambio si lo necesitás: vos decidís.</p>
                </div>
              </li>
            </ol>
            <div className="patient-ar-cta-row">
              <a className="patient-ar-btn patient-ar-btn--secondary" href={PATIENT_PORTAL_URL} target="_blank" rel="noreferrer">
                Ver profesionales disponibles
              </a>
            </div>
          </div>
        </section>

        <section className="patient-ar-section patient-ar-pricing-section" id="precios" aria-labelledby="pricing-title">
          <div className="patient-ar-container patient-ar-pricing-violet__grid patient-ar-reveal" ref={revealPricing}>
            <div className="patient-ar-pricing-violet__copy">
              <p className="patient-ar-eyebrow">Precios transparentes</p>
              <h2 id="pricing-title">Sesiones claras, sin sorpresas</h2>
              <p className="patient-ar-pricing-violet__lead">Cada profesional define el valor de su sesión; vos ves el precio antes de confirmar.</p>
              <div className="patient-ar-pricing-violet__list-shell">
                <ul className="patient-ar-pricing-violet__list">
                  <li>
                    <strong>Desde $40.000 ARS</strong> por sesión, según experiencia y orientación terapéutica.
                  </li>
                  <li>
                    Duración estándar: <strong>50 minutos</strong>.
                  </li>
                  <li>Descuentos en packs de 4, 8 o 12 sesiones cuando el profesional los ofrezca.</li>
                  <li>Sin suscripción obligatoria: pagás por lo que usás.</li>
                </ul>
              </div>
              <div className="patient-ar-pricing-violet__footer">
                <p className="patient-ar-pricing-violet__footer-title">Listo para empezar</p>
                <p className="patient-ar-pricing-violet__footer-text">Creá tu cuenta, explorá perfiles y reservá tu primera sesión cuando quieras.</p>
                <a className="patient-ar-btn patient-ar-btn--primary" href={PATIENT_PORTAL_URL} target="_blank" rel="noreferrer">
                  Reservar mi primera sesión
                </a>
              </div>
            </div>
            <figure className="patient-ar-pricing-violet__visual">
              <img
                className="patient-ar-photo-grade"
                src={P.videoHome}
                alt="Persona en el sillón con laptop en videollamada de terapia online desde casa"
                loading="lazy"
                width={800}
                height={533}
              />
            </figure>
          </div>
        </section>

        <section className="patient-ar-pro-banner-wrap" id="portal-profesionales" aria-labelledby="patient-ar-pro-cta-title">
          <div className="patient-ar-container patient-ar-pro-banner-layout">
            <div className="patient-ar-pro-banner">
              <div className="patient-ar-pro-banner__main">
                <span className="patient-ar-pro-banner__icon" aria-hidden="true">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="11" y="6" width="26" height="34" rx="3.5" stroke="currentColor" strokeWidth="2.2" />
                    <path d="M17 15h14M17 22h14M17 29h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    <circle cx="34" cy="34" r="9" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M34 30v5M31 32.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </span>
                <div className="patient-ar-pro-banner__copy">
                  <p className="patient-ar-pro-banner__kicker">¿Sos parte del equipo?</p>
                  <h2 id="patient-ar-pro-cta-title">Si sos psicólogo/a, entrá acá</h2>
                  <p className="patient-ar-pro-banner__lead">
                    Gestioná agenda, videollamadas y pacientes en un solo lugar. Sumate al portal de profesionales MotivarCare.
                  </p>
                </div>
              </div>
              <div className="patient-ar-pro-banner__action">
                <a className="patient-ar-btn patient-ar-btn--pro-banner" href={PROFESSIONAL_PORTAL_URL} target="_blank" rel="noreferrer">
                  Ir al portal de profesionales <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
            <figure className="patient-ar-pro-banner__thumb">
              <img src={P.bannerAccent} alt="" width={640} height={400} loading="lazy" />
            </figure>
          </div>
        </section>

        <section className="patient-ar-section patient-ar-section--quotes" aria-labelledby="quotes-title">
          <div className="patient-ar-container">
            <div className="patient-ar-quotes-head">
              <div className="patient-ar-quotes-head-copy">
                <p className="patient-ar-eyebrow">Experiencias</p>
                <h2 id="quotes-title">Voces de quienes usan terapia online</h2>
              </div>
              {landingReviews.length > 1 ? (
                <div className="patient-ar-quotes-nav" aria-label="Navegar opiniones">
                  <button
                    type="button"
                    className="patient-ar-quote-nav-btn"
                    onClick={() => scrollLandingQuotes("left")}
                    aria-label="Opiniones anteriores"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="patient-ar-quote-nav-btn"
                    onClick={() => scrollLandingQuotes("right")}
                    aria-label="Opiniones siguientes"
                  >
                    →
                  </button>
                </div>
              ) : null}
            </div>
            <div className="patient-ar-quotes-viewport" ref={quotesScrollRef}>
              <div className="patient-ar-quote-track">
                {landingReviews.map((review) => {
                  const avatarSrc =
                    reviewApiBase.length > 0
                      ? resolveReviewAvatarUrl(review.avatar, reviewApiBase) || review.avatar
                      : review.avatar;
                  const borderAccent = (review.accent ?? "#6d56ff").trim();
                  return (
                    <figure
                      key={review.id}
                      className="patient-ar-quote-card"
                      style={{ borderColor: `${borderAccent}33` }}
                    >
                      <div className="patient-ar-quote-rating" aria-label={`${review.rating} de 5 estrellas`}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <span key={i} className={i < review.rating ? "patient-ar-quote-star is-on" : "patient-ar-quote-star"}>
                            ★
                          </span>
                        ))}
                      </div>
                      <blockquote>
                        <p>“{review.text}”</p>
                      </blockquote>
                      <figcaption>
                        <span className="patient-ar-quote-avatar-wrap">
                          <img className="patient-ar-quote-avatar-img" src={avatarSrc} alt="" loading="lazy" />
                        </span>
                        <span>
                          <strong>{review.name}</strong>
                          <span className="patient-ar-quote-meta">
                            {review.role} · {review.relativeDate}
                          </span>
                        </span>
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section
          className="patient-ar-section patient-ar-section--faq patient-ar-reveal"
          id="faq"
          aria-labelledby="faq-title"
          ref={revealFaq}
        >
          <div className="patient-ar-container">
            <div className="patient-ar-section-intro patient-ar-section-intro--center">
              <p className="patient-ar-eyebrow">Dudas comunes</p>
              <h2 id="faq-title">Preguntas frecuentes</h2>
              <p className="patient-ar-section-lead patient-ar-faq-deck">
                Respuestas claras antes de tu primera sesión. Si necesitás algo más específico, escribinos desde el portal.
              </p>
            </div>
            <div className="patient-ar-faq-acc" role="list">
              <details className="patient-ar-faq-item" role="listitem">
                <summary>¿Cómo sé qué psicólogo elegir?</summary>
                <div className="patient-ar-faq-body">
                  <p>
                    Revisá perfiles, años de experiencia y enfoque terapéutico. Si la primera opción no cierra, podés ajustar y probar con
                    otro profesional sin dramas.
                  </p>
                </div>
              </details>
              <details className="patient-ar-faq-item" role="listitem">
                <summary>¿Las sesiones son confidenciales?</summary>
                <div className="patient-ar-faq-body">
                  <p>Sí. Son privadas y se rigen por el secreto profesional que corresponde a cada matriculado.</p>
                </div>
              </details>
              <details className="patient-ar-faq-item" role="listitem">
                <summary>¿Qué pasa si no conecto con el profesional?</summary>
                <div className="patient-ar-faq-body">
                  <p>Podés cambiar de psicólogo cuando lo necesites. La idea es encontrar un encaje que te dé confianza.</p>
                </div>
              </details>
              <details className="patient-ar-faq-item" role="listitem">
                <summary>¿Necesito experiencia previa en terapia?</summary>
                <div className="patient-ar-faq-body">
                  <p>No. Podés empezar aunque sea tu primera vez en un proceso terapéutico.</p>
                </div>
              </details>
              <details className="patient-ar-faq-item" role="listitem">
                <summary>¿Cómo es la sesión online?</summary>
                <div className="patient-ar-faq-body">
                  <p>Videollamada en un entorno seguro de la plataforma. Solo necesitás internet y un lugar tranquilo.</p>
                </div>
              </details>
              <details className="patient-ar-faq-item" role="listitem">
                <summary>¿Puedo elegir horario?</summary>
                <div className="patient-ar-faq-body">
                  <p>Sí. Elegís día y franja según la disponibilidad que cada profesional publica.</p>
                </div>
              </details>
            </div>
          </div>
        </section>
      </main>

      <footer className="patient-ar-footer">
        <div className="patient-ar-container patient-ar-footer-inner">
          <nav className="patient-ar-footer-portals" aria-label="Portales MotivarCare">
            <a className="patient-ar-footer-portal patient-ar-footer-portal--patient" href={PATIENT_PORTAL_URL} target="_blank" rel="noreferrer">
              Portal pacientes
            </a>
            <a className="patient-ar-footer-portal patient-ar-footer-portal--pro" href={PROFESSIONAL_PORTAL_URL} target="_blank" rel="noreferrer">
              Portal profesionales
            </a>
          </nav>
          <nav className="patient-ar-footer-legal" aria-label="Legal">
            <a href="/docs/privacy.html">Política de privacidad</a>
            <span aria-hidden="true">·</span>
            <a href="/docs/terms.html">Términos</a>
            <span aria-hidden="true">·</span>
            <a href="/docs/crisis.html">Líneas de apoyo</a>
          </nav>
          <p className="patient-ar-footer-copy">
            © {new Date().getFullYear()} MotivarCare · Argentina ·{" "}
            <a href="mailto:soporte@motivarcare.com">soporte@motivarcare.com</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
