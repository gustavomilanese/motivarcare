import { useEffect, useState } from "react";
import {
  fetchLandingSessionPackages,
  formatPackageMoney,
  publicApiBase,
  type LandingSessionPackageRow
} from "./fetchLandingSessionPackages";
import { useScrollY } from "./useScrollMotion";

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

/** Fotos en public/photos: 15 = hero; 13 = banda editorial/parallax (v1). */
const P = {
  hero: "/photos/15-hero-trabajo-remoto-playa.jpg",
  parallaxStrip: "/photos/13-hero-panoramico.jpg",
  deskPanel: "/photos/03-escritorio-atardecer.jpg",
  studioMist: "/photos/04-estudio-montanas-niebla.jpg",
  mediterranean: "/photos/05-panorama-mediterraneo.jpg",
  podsOffice: "/photos/06-pods-oficina-premium.jpg",
  videoHome: "/photos/07-videollamada-desde-casa.jpg",
  therapistNotes: "/photos/08-sesion-profesional-notas.jpg",
  terracesNomad: "/photos/09-terrazas-arroz-nomada.jpg",
  beachLaptop: "/photos/10-playa-primer-plano.jpg",
  poolLaptop: "/photos/11-pool-desayuno-laptop.jpg",
  mountainBalcony: "/photos/12-montanas-balcon-trabajo.jpg"
} as const;

export function App() {
  const [catalogPackages, setCatalogPackages] = useState<LandingSessionPackageRow[]>([]);
  const [catalogFeaturedId, setCatalogFeaturedId] = useState<string | null>(null);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  useEffect(() => {
    const base = publicApiBase();
    if (!base) {
      setCatalogLoaded(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchLandingSessionPackages({
          apiBase: base,
          landingSlot: "patient_main",
          market: "AR"
        });
        if (!cancelled) {
          setCatalogPackages(data.sessionPackages ?? []);
          setCatalogFeaturedId(data.featuredPackageId ?? null);
        }
      } catch {
        if (!cancelled) {
          setCatalogPackages([]);
          setCatalogFeaturedId(null);
        }
      } finally {
        if (!cancelled) {
          setCatalogLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollY = useScrollY();
  const heroShift = scrollY * 0.28;
  const stripShift = scrollY * 0.12;
  const headerSolid = scrollY > 56;

  return (
    <div className="patient-ar-page">
      <header className={`patient-ar-header ${headerSolid ? "patient-ar-header--solid" : "patient-ar-header--hero"}`}>
        <div className="patient-ar-container patient-ar-header-inner">
          <a className="patient-ar-logo" href="/" aria-label="MotivarCare">
            {/* En hero oscuro el PNG+filtro falla en algunos navegadores (bloque blanco); el texto siempre lee bien. */}
            <span className="patient-ar-logo-text-mark">MotivarCare</span>
            <img
              className="patient-ar-logo-img"
              src="/brand/motivarcare-wordmark.png"
              alt=""
              width={220}
              height={40}
            />
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
        <section className="patient-ar-hero-shell patient-ar-hero-shell--panorama" aria-labelledby="hero-title">
          <div
            className="patient-ar-hero-media"
            style={{ transform: `translate3d(0, ${heroShift}px, 0) scale(1.06)` }}
            aria-hidden="true"
          >
            <img src={P.hero} alt="" className="patient-ar-hero-img patient-ar-hero-img--panorama" width={736} height={420} fetchPriority="high" />
            <div className="patient-ar-hero-scrim" />
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
                <a className="patient-ar-btn patient-ar-btn--ghost" href="#como-funciona">
                  Ver cómo funciona
                </a>
              </div>
              <ul className="patient-ar-checks" aria-label="Ventajas">
                <li>Psicólogos matriculados</li>
                <li>Atención online privada</li>
                <li>Elegís día y horario</li>
                <li>Desde cualquier lugar</li>
              </ul>
            </div>
            <div className="patient-ar-hero-panel-wrap">
              <div className="patient-ar-hero-panel" aria-hidden="true">
                <div className="patient-ar-hero-panel-visual">
                  <img src={P.deskPanel} alt="" width={800} height={533} />
                </div>
                <div className="patient-ar-hero-panel-inner">
                  <p className="patient-ar-hero-panel-label">Tu próximo paso</p>
                  <p className="patient-ar-hero-panel-text">
                    Perfiles reales, disponibilidad visible y sesiones por videollamada en la plataforma.
                  </p>
                  <div className="patient-ar-hero-stats">
                    <div>
                      <span className="patient-ar-stat-num">50′</span>
                      <span className="patient-ar-stat-label">sesión</span>
                    </div>
                    <div>
                      <span className="patient-ar-stat-num">100%</span>
                      <span className="patient-ar-stat-label">online</span>
                    </div>
                  </div>
                </div>
              </div>
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
            <div className="patient-ar-bento">
              <article className="patient-ar-bento-card patient-ar-bento-card--wide patient-ar-bento-card--img-team">
                <img src={P.podsOffice} alt="Espacio de trabajo moderno con cabinas de concentración" loading="lazy" />
                <div className="patient-ar-bento-scrim" />
                <div className="patient-ar-bento-copy">
                  <h3>Profesionales verificados</h3>
                  <p>Psicólogos y psicólogas matriculados, con experiencia en ansiedad, estrés, vínculos y más.</p>
                </div>
              </article>
              <article className="patient-ar-bento-card patient-ar-bento-card--tall patient-ar-bento-card--img-studio">
                <img src={P.studioMist} alt="Escritorio con vista a montañas y niebla" loading="lazy" />
                <div className="patient-ar-bento-scrim patient-ar-bento-scrim--soft" />
                <div className="patient-ar-bento-copy">
                  <h3>Reservá cuando quieras</h3>
                  <p>Elegís día y franja según la disponibilidad publicada.</p>
                </div>
              </article>
              <article className="patient-ar-bento-card patient-ar-bento-card--plain">
                <div className="patient-ar-card-icon patient-ar-card-icon--violet" aria-hidden="true" />
                <h3>Sesión cómoda y privada</h3>
                <p>Videollamada en entorno seguro de la plataforma. Solo necesitás conexión estable y un espacio tranquilo.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="patient-ar-section patient-ar-section--muted" id="quienes-somos" aria-labelledby="about-title">
          <div className="patient-ar-container patient-ar-about">
            <figure className="patient-ar-about-figure">
              <img src={P.terracesNomad} alt="Trabajo remoto con vista a terrazas y naturaleza" loading="lazy" width={900} height={600} />
              <figcaption className="patient-ar-about-caption">Terapia que se adapta a tu día, no al revés.</figcaption>
            </figure>
            <div className="patient-ar-about-copy">
              <p className="patient-ar-eyebrow">MotivarCare</p>
              <h2 id="about-title">¿Quiénes somos?</h2>
              <div className="patient-ar-prose">
                <p>
                  Nacimos para acercarte a un acompañamiento psicológico de calidad, sin barreras innecesarias: accesible, cercano
                  y pensado para la vida real.
                </p>
                <p>
                  Nuestro objetivo es que encuentres rápido a un profesional con el que te sientas cómodo/a y puedas empezar tu
                  proceso sin vueltas. Apostamos a un enfoque humano y profesional, adaptado a lo que vos necesitás.
                </p>
              </div>
              <a className="patient-ar-btn patient-ar-btn--secondary patient-ar-btn--inline" href={PATIENT_PORTAL_URL} target="_blank" rel="noreferrer">
                Empezar en el portal
              </a>
            </div>
          </div>
        </section>

        <section className="patient-ar-parallax-strip" aria-hidden="true">
          <div
            className="patient-ar-parallax-strip-inner"
            style={{ transform: `translate3d(0, ${stripShift * 0.4}px, 0) scale(1.08)` }}
          >
            <img src={P.parallaxStrip} alt="" width={2000} height={1125} />
          </div>
          <div className="patient-ar-parallax-strip-overlay" />
        </section>

        <section className="patient-ar-section" id="como-funciona" aria-labelledby="how-title">
          <div className="patient-ar-container">
            <div className="patient-ar-section-intro patient-ar-section-intro--center">
              <p className="patient-ar-eyebrow">Cuatro pasos</p>
              <h2 id="how-title">¿Cómo funciona?</h2>
              <p className="patient-ar-section-lead">Simple como debería ser: elegís, reservás, conectás y continuás a tu ritmo.</p>
            </div>
            <ol className="patient-ar-steps patient-ar-steps--visual">
              <li>
                <span className="patient-ar-step-thumb" style={{ backgroundImage: `url(${P.mountainBalcony})` }} aria-hidden="true" />
                <span className="patient-ar-step-num">1</span>
                <div>
                  <strong>Elegís tu psicólogo</strong>
                  <p>Perfiles, enfoques y experiencia para comparar y elegir con confianza.</p>
                </div>
              </li>
              <li>
                <span className="patient-ar-step-thumb" style={{ backgroundImage: `url(${P.beachLaptop})` }} aria-hidden="true" />
                <span className="patient-ar-step-num">2</span>
                <div>
                  <strong>Reservás tu sesión</strong>
                  <p>Día y horario disponibles al instante. Sin idas y vueltas.</p>
                </div>
              </li>
              <li>
                <span className="patient-ar-step-thumb" style={{ backgroundImage: `url(${P.videoHome})` }} aria-hidden="true" />
                <span className="patient-ar-step-num">3</span>
                <div>
                  <strong>Sesión online</strong>
                  <p>Privacidad y comodidad desde donde estés.</p>
                </div>
              </li>
              <li>
                <span className="patient-ar-step-thumb" style={{ backgroundImage: `url(${P.therapistNotes})` }} aria-hidden="true" />
                <span className="patient-ar-step-num">4</span>
                <div>
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

        <section className="patient-ar-section patient-ar-section--accent" id="precios" aria-labelledby="pricing-title">
          <div className="patient-ar-container patient-ar-pricing-layout">
            <div>
              <p className="patient-ar-eyebrow patient-ar-eyebrow--on-dark">Precios transparentes</p>
              <h2 id="pricing-title">Sesiones claras, sin sorpresas</h2>
              <p className="patient-ar-pricing-lead">Cada profesional define el valor de su sesión; vos ves el precio antes de confirmar.</p>
              {catalogLoaded && catalogPackages.length > 0 ? (
                <div className="patient-ar-catalog-strip" aria-label="Planes publicados">
                  {catalogPackages.map((pkg) => (
                    <article
                      key={pkg.id}
                      className={
                        "patient-ar-catalog-card" + (catalogFeaturedId === pkg.id ? " patient-ar-catalog-card--featured" : "")
                      }
                    >
                      {catalogFeaturedId === pkg.id ? <p className="patient-ar-catalog-badge">Destacado</p> : null}
                      <h3 className="patient-ar-catalog-name">{pkg.name}</h3>
                      <p className="patient-ar-catalog-meta">{`${pkg.credits} sesiones · ${pkg.discountPercent}% OFF`}</p>
                      <p className="patient-ar-catalog-price">{formatPackageMoney(pkg.priceCents, pkg.currency)}</p>
                      <a className="patient-ar-btn patient-ar-btn--light patient-ar-catalog-cta" href={PATIENT_PORTAL_URL} target="_blank" rel="noreferrer">
                        Comprar en el portal
                      </a>
                    </article>
                  ))}
                </div>
              ) : null}
              <ul className="patient-ar-pricing-list">
                <li>
                  <strong>Desde $40.000 ARS</strong> por sesión, según experiencia y orientación terapéutica.
                </li>
                <li>Duración estándar: <strong>50 minutos</strong>.</li>
                <li>Descuentos en packs de 4, 8 o 12 sesiones cuando el profesional los ofrezca.</li>
                <li>Sin suscripción obligatoria: pagás por lo que usás.</li>
              </ul>
            </div>
            <div className="patient-ar-pricing-card">
              <div className="patient-ar-pricing-card-visual">
                <img src={P.mediterranean} alt="" loading="lazy" width={400} height={267} />
              </div>
              <p className="patient-ar-pricing-card-title">Listo para empezar</p>
              <p className="patient-ar-pricing-card-text">Creá tu cuenta, explorá perfiles y reservá tu primera sesión cuando quieras.</p>
              <a className="patient-ar-btn patient-ar-btn--light" href={PATIENT_PORTAL_URL} target="_blank" rel="noreferrer">
                Reservar mi primera sesión
              </a>
            </div>
          </div>
        </section>

        <section className="patient-ar-pro-banner-wrap" id="portal-profesionales" aria-labelledby="patient-ar-pro-cta-title">
          <div className="patient-ar-container">
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
          </div>
        </section>

        <section className="patient-ar-section patient-ar-section--quotes" aria-labelledby="quotes-title">
          <div className="patient-ar-container">
            <h2 id="quotes-title" className="patient-ar-visually-hidden">
              Voces de quienes usan terapia online
            </h2>
            <div className="patient-ar-quote-row">
              <figure className="patient-ar-quote-card">
                <blockquote>
                  <p>“Pude comparar perfiles y reservar sin vueltas. La primera sesión me dio mucha claridad.”</p>
                </blockquote>
                <figcaption>
                  <span className="patient-ar-quote-avatar" style={{ backgroundImage: `url(${P.videoHome})` }} aria-hidden="true" />
                  <span>
                    <strong>Paciente</strong>
                    <span className="patient-ar-quote-meta">Buenos Aires</span>
                  </span>
                </figcaption>
              </figure>
              <figure className="patient-ar-quote-card">
                <blockquote>
                  <p>“Ver precio y horarios antes de confirmar me dio confianza. Todo muy ordenado.”</p>
                </blockquote>
                <figcaption>
                  <span className="patient-ar-quote-avatar" style={{ backgroundImage: `url(${P.poolLaptop})` }} aria-hidden="true" />
                  <span>
                    <strong>Paciente</strong>
                    <span className="patient-ar-quote-meta">Córdoba</span>
                  </span>
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="patient-ar-section" id="faq" aria-labelledby="faq-title">
          <div className="patient-ar-container">
            <div className="patient-ar-section-intro patient-ar-section-intro--center">
              <p className="patient-ar-eyebrow">Dudas comunes</p>
              <h2 id="faq-title">Preguntas frecuentes</h2>
            </div>
            <div className="patient-ar-faq-grid">
              <dl className="patient-ar-faq-list patient-ar-faq-list--grid">
                <div>
                  <dt>¿Cómo sé qué psicólogo elegir?</dt>
                  <dd>
                    Revisá perfiles, años de experiencia y enfoque. Si la primera opción no cierra, podés ajustar y probar con otro
                    profesional.
                  </dd>
                </div>
                <div>
                  <dt>¿Las sesiones son confidenciales?</dt>
                  <dd>Sí. Son privadas y se rigen por el secreto profesional que corresponde a cada matriculado.</dd>
                </div>
                <div>
                  <dt>¿Qué pasa si no conecto con el profesional?</dt>
                  <dd>Podés cambiar de psicólogo cuando lo necesites. Buscamos un encaje que te dé confianza.</dd>
                </div>
                <div>
                  <dt>¿Necesito experiencia previa en terapia?</dt>
                  <dd>No. Podés empezar aunque sea tu primera vez en un proceso terapéutico.</dd>
                </div>
                <div>
                  <dt>¿Cómo es la sesión online?</dt>
                  <dd>Videollamada en un entorno seguro de la plataforma. Solo necesitás internet y un lugar tranquilo.</dd>
                </div>
                <div>
                  <dt>¿Puedo elegir horario?</dt>
                  <dd>Sí. Elegís día y franja según disponibilidad del profesional.</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>
      </main>

      <footer className="patient-ar-footer">
        <div className="patient-ar-container patient-ar-footer-inner">
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
          <p className="patient-ar-footer-photo">
            Imágenes en <code className="patient-ar-footer-code">public/photos</code> (12 archivos renombrados). Ajustá nombres o
            reemplazá archivos y actualizá el objeto <code className="patient-ar-footer-code">P</code> en{" "}
            <code className="patient-ar-footer-code">App.tsx</code> si cambiás convenciones.
          </p>
        </div>
      </footer>
    </div>
  );
}
