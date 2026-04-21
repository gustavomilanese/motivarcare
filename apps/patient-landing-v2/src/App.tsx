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
  "https://motivarcare-patient.vercel.app"
);

/** 14 = hero apaisado; 13 = banda editorial (y parallax v1 si copiás assets). */
const P = {
  hero: "/photos/14-banner-panoramico.jpg",
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
  const scrollY = useScrollY();
  const heroImgY = scrollY * 0.14;
  const parallaxBandY = scrollY * 0.06;
  const headerSolid = scrollY > 48;

  return (
    <div className="pl2-page">
      <header className={`pl2-header ${headerSolid ? "pl2-header--solid" : "pl2-header--airy"}`}>
        <div className="pl2-container pl2-header-inner">
          <a className="pl2-logo" href="/" aria-label="MotivarCare">
            <img src="/brand/motivarcare-wordmark.png" alt="" width={200} height={36} />
          </a>
          <nav className="pl2-nav" aria-label="Secciones">
            <a href="#beneficios">Por qué MotivarCare</a>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#precios">Precios</a>
            <a href="#faq">FAQ</a>
          </nav>
          <a className="pl2-btn pl2-btn--nav" href={PATIENT_PORTAL_URL} target="_blank" rel="noreferrer">
            Ingresar
          </a>
        </div>
      </header>

      <main>
        <section className="pl2-hero pl2-hero--panorama" aria-labelledby="pl2-hero-title">
          <div className="pl2-hero-layout pl2-container">
            <div className="pl2-hero-copy">
              <p className="pl2-kicker">Argentina · Terapia 100% online</p>
              <h1 id="pl2-hero-title">Encontrá tu psicólogo online con la claridad y el cuidado que buscás</h1>
              <p className="pl2-lead">
                Elegí al profesional que mejor encaje con vos, reservá en minutos y empezá tu proceso sin listas de espera. Todo
                desde un solo lugar, seguro y confidencial.
              </p>
              <div className="pl2-hero-actions">
                <a className="pl2-btn pl2-btn--primary" href={PATIENT_PORTAL_URL} target="_blank" rel="noreferrer">
                  Encontrar mi psicólogo
                </a>
                <a className="pl2-btn pl2-btn--outline" href="#como-funciona">
                  Ver cómo funciona
                </a>
              </div>
              <ul className="pl2-hero-tags" aria-label="Ventajas">
                <li>Matriculados</li>
                <li>Privado</li>
                <li>Tu horario</li>
                <li>Desde cualquier lugar</li>
              </ul>
            </div>
            <div className="pl2-hero-visual" aria-hidden="true">
              <div className="pl2-hero-frame">
                <div className="pl2-hero-img-wrap" style={{ transform: `translate3d(0, ${heroImgY}px, 0) scale(1.04)` }}>
                  <img src={P.hero} alt="" width={2000} height={850} fetchPriority="high" />
                </div>
                <div className="pl2-hero-float">
                  <span className="pl2-hero-float-label">Próxima sesión</span>
                  <span className="pl2-hero-float-stat">50′</span>
                  <span className="pl2-hero-float-note">videollamada segura</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="pl2-section pl2-section--cream" id="beneficios" aria-labelledby="pl2-benefits-title">
          <div className="pl2-container">
            <header className="pl2-section-head">
              <p className="pl2-eyebrow">Todo en un solo lugar</p>
              <h2 id="pl2-benefits-title">Pensado para que empieces sin fricción</h2>
              <p className="pl2-section-sub">
                Información clara, pasos simples y confianza antes de reservar: la experiencia que merecés al cuidar tu salud
                mental.
              </p>
            </header>
            <div className="pl2-cards-photo">
              <article className="pl2-cp-card">
                <div className="pl2-cp-photo">
                  <img src={P.studioMist} alt="" loading="lazy" width={800} height={520} />
                </div>
                <div className="pl2-cp-body">
                  <h3>Profesionales verificados</h3>
                  <p>Psicólogos y psicólogas matriculados, con experiencia en ansiedad, estrés, vínculos y más.</p>
                </div>
              </article>
              <article className="pl2-cp-card">
                <div className="pl2-cp-photo">
                  <img src={P.beachLaptop} alt="" loading="lazy" width={800} height={520} />
                </div>
                <div className="pl2-cp-body">
                  <h3>Reservá cuando quieras</h3>
                  <p>Elegís día y franja según la disponibilidad publicada. Sin intermediarios ni vueltas innecesarias.</p>
                </div>
              </article>
              <article className="pl2-cp-card">
                <div className="pl2-cp-photo">
                  <img src={P.podsOffice} alt="" loading="lazy" width={800} height={520} />
                </div>
                <div className="pl2-cp-body">
                  <h3>Sesión cómoda y privada</h3>
                  <p>Videollamada en entorno seguro de la plataforma. Solo necesitás conexión estable y un espacio tranquilo.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="pl2-editorial" aria-labelledby="pl2-about-title">
          <div className="pl2-editorial-bg" style={{ transform: `translate3d(0, ${parallaxBandY}px, 0)` }}>
            <img src={P.parallaxStrip} alt="" width={2000} height={1125} />
            <div className="pl2-editorial-scrim" />
          </div>
          <div className="pl2-container pl2-editorial-inner">
            <div className="pl2-editorial-card" id="quienes-somos">
              <p className="pl2-eyebrow pl2-eyebrow--on-dark">MotivarCare</p>
              <h2 id="pl2-about-title">¿Quiénes somos?</h2>
              <div className="pl2-prose pl2-prose--on-dark">
                <p>
                  Nacimos para acercarte a un acompañamiento psicológico de calidad, sin barreras innecesarias: accesible, cercano
                  y pensado para la vida real.
                </p>
                <p>
                  Nuestro objetivo es que encuentres rápido a un profesional con el que te sientas cómodo/a y puedas empezar tu
                  proceso sin vueltas. Apostamos a un enfoque humano y profesional, adaptado a lo que vos necesitás.
                </p>
              </div>
              <a className="pl2-btn pl2-btn--cream" href={PATIENT_PORTAL_URL} target="_blank" rel="noreferrer">
                Ir al portal
              </a>
            </div>
          </div>
        </section>

        <section className="pl2-section" id="como-funciona" aria-labelledby="pl2-how-title">
          <div className="pl2-container">
            <header className="pl2-section-head pl2-section-head--center">
              <p className="pl2-eyebrow">Cuatro pasos</p>
              <h2 id="pl2-how-title">¿Cómo funciona?</h2>
              <p className="pl2-section-sub">Simple como debería ser: elegís, reservás, conectás y continuás a tu ritmo.</p>
            </header>
            <ol className="pl2-timeline">
              <li>
                <span className="pl2-timeline-visual" style={{ backgroundImage: `url(${P.mountainBalcony})` }} aria-hidden="true" />
                <div className="pl2-timeline-body">
                  <span className="pl2-timeline-num">01</span>
                  <h3>Elegís tu psicólogo</h3>
                  <p>Perfiles, enfoques y experiencia para comparar y elegir con confianza.</p>
                </div>
              </li>
              <li>
                <span className="pl2-timeline-visual" style={{ backgroundImage: `url(${P.poolLaptop})` }} aria-hidden="true" />
                <div className="pl2-timeline-body">
                  <span className="pl2-timeline-num">02</span>
                  <h3>Reservás tu sesión</h3>
                  <p>Día y horario disponibles al instante. Sin idas y vueltas.</p>
                </div>
              </li>
              <li>
                <span className="pl2-timeline-visual" style={{ backgroundImage: `url(${P.videoHome})` }} aria-hidden="true" />
                <div className="pl2-timeline-body">
                  <span className="pl2-timeline-num">03</span>
                  <h3>Sesión online</h3>
                  <p>Privacidad y comodidad desde donde estés.</p>
                </div>
              </li>
              <li>
                <span className="pl2-timeline-visual" style={{ backgroundImage: `url(${P.therapistNotes})` }} aria-hidden="true" />
                <div className="pl2-timeline-body">
                  <span className="pl2-timeline-num">04</span>
                  <h3>Continuás tu proceso</h3>
                  <p>Mismo profesional o cambio si lo necesitás: vos decidís.</p>
                </div>
              </li>
            </ol>
            <div className="pl2-cta-center">
              <a className="pl2-btn pl2-btn--secondary" href={PATIENT_PORTAL_URL} target="_blank" rel="noreferrer">
                Ver profesionales disponibles
              </a>
            </div>
          </div>
        </section>

        <section className="pl2-zigzag" aria-labelledby="pl2-features-title">
          <div className="pl2-container">
            <header className="pl2-section-head pl2-section-head--center">
              <p className="pl2-eyebrow">Por qué elegirnos</p>
              <h2 id="pl2-features-title">Lo que ofrece MotivarCare</h2>
            </header>
          </div>
          <div className="pl2-zigzag-row">
            <div className="pl2-zigzag-img">
              <img src={P.terracesNomad} alt="Trabajo remoto con vista a terrazas y naturaleza" loading="lazy" width={900} height={600} />
            </div>
            <div className="pl2-zigzag-text">
              <h3>Un solo lugar para todo</h3>
              <p>Perfiles, agenda y videollamada en la misma plataforma, segura y confidencial.</p>
            </div>
          </div>
          <div className="pl2-zigzag-row pl2-zigzag-row--reverse">
            <div className="pl2-zigzag-img">
              <img src={P.deskPanel} alt="Escritorio moderno con vista al atardecer" loading="lazy" width={900} height={600} />
            </div>
            <div className="pl2-zigzag-text">
              <h3>Horarios que se adaptan a vos</h3>
              <p>Disponibilidad visible para elegir día y franja sin idas y vueltas.</p>
            </div>
          </div>
        </section>

        <section className="pl2-section pl2-section--pricing" id="precios" aria-labelledby="pl2-pricing-title">
          <div className="pl2-container">
            <header className="pl2-section-head pl2-section-head--center">
              <p className="pl2-eyebrow">Precios transparentes</p>
              <h2 id="pl2-pricing-title">Sesiones claras, sin sorpresas</h2>
              <p className="pl2-section-sub">Cada profesional define el valor de su sesión; vos ves el precio antes de confirmar.</p>
            </header>
            <div className="pl2-pricing-grid">
              <article className="pl2-price-card">
                <div className="pl2-price-top">
                  <img src={P.beachLaptop} alt="" loading="lazy" />
                </div>
                <div className="pl2-price-inner">
                  <h3>Sesión individual</h3>
                  <p className="pl2-price-tag">
                    Desde <strong>$40.000</strong> <span className="pl2-price-unit">ARS</span>
                  </p>
                  <ul>
                    <li>50 minutos por sesión</li>
                    <li>Precio según experiencia del profesional</li>
                    <li>Lo ves antes de confirmar</li>
                  </ul>
                  <a className="pl2-btn pl2-btn--block" href={PATIENT_PORTAL_URL} target="_blank" rel="noreferrer">
                    Reservar
                  </a>
                </div>
              </article>
              <article className="pl2-price-card pl2-price-card--featured">
                <div className="pl2-price-top">
                  <img src={P.studioMist} alt="" loading="lazy" />
                </div>
                <div className="pl2-price-inner">
                  <p className="pl2-price-badge">Popular</p>
                  <h3>Packs de sesiones</h3>
                  <p className="pl2-price-tag">4, 8 y 12 sesiones</p>
                  <ul>
                    <li>Descuentos cuando el profesional los ofrezca</li>
                    <li>Duración estándar: 50 minutos</li>
                    <li>Ideal para continuidad</li>
                  </ul>
                  <a className="pl2-btn pl2-btn--primary pl2-btn--block" href={PATIENT_PORTAL_URL} target="_blank" rel="noreferrer">
                    Ver opciones
                  </a>
                </div>
              </article>
              <article className="pl2-price-card">
                <div className="pl2-price-top">
                  <img src={P.podsOffice} alt="" loading="lazy" />
                </div>
                <div className="pl2-price-inner">
                  <h3>Sin suscripción</h3>
                  <p className="pl2-price-tag">
                    Pagás <strong>lo que usás</strong>
                  </p>
                  <ul>
                    <li>Sin cuota mensual obligatoria</li>
                    <li>Reservás cuando lo necesites</li>
                    <li>Cambiás de profesional si hace falta</li>
                  </ul>
                  <a className="pl2-btn pl2-btn--block" href={PATIENT_PORTAL_URL} target="_blank" rel="noreferrer">
                    Crear cuenta
                  </a>
                </div>
              </article>
            </div>
            <p className="pl2-pricing-footnote">
              Cada profesional define el valor de su sesión; los montos pueden variar según experiencia y orientación terapéutica.
            </p>
          </div>
        </section>

        <section className="pl2-section pl2-section--testimonials" aria-labelledby="pl2-testimonials-title">
          <div className="pl2-container">
            <header className="pl2-section-head pl2-section-head--center">
              <p className="pl2-eyebrow">Experiencias</p>
              <h2 id="pl2-testimonials-title">Voces reales, proceso humano</h2>
            </header>
            <div className="pl2-quote-grid">
              <figure className="pl2-quote">
                <blockquote>
                  <p>
                    “Pude comparar perfiles y elegir horario sin llamar a nadie. La primera sesión fue clara y sin presión.”
                  </p>
                </blockquote>
                <figcaption>
                  <span className="pl2-quote-av" style={{ backgroundImage: `url(${P.videoHome})` }} aria-hidden="true" />
                  <span>
                    Paciente <span className="pl2-quote-loc">· CABA</span>
                  </span>
                </figcaption>
              </figure>
              <figure className="pl2-quote">
                <blockquote>
                  <p>
                    “Me gustó ver el precio antes de reservar y hacer todo desde la compu, en un espacio que se siente privado.”
                  </p>
                </blockquote>
                <figcaption>
                  <span className="pl2-quote-av" style={{ backgroundImage: `url(${P.poolLaptop})` }} aria-hidden="true" />
                  <span>
                    Paciente <span className="pl2-quote-loc">· GBA</span>
                  </span>
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="pl2-cta-final" aria-labelledby="pl2-final-cta-title">
          <div className="pl2-cta-bg" style={{ transform: `translate3d(0, ${scrollY * 0.1}px, 0) scale(1.05)` }}>
            <img src={P.mediterranean} alt="" width={2000} height={1125} />
            <div className="pl2-cta-scrim" />
          </div>
          <div className="pl2-container pl2-cta-final-inner">
            <h2 id="pl2-final-cta-title">Encontrá tu psicólogo hoy</h2>
            <p>Creá tu cuenta, explorá perfiles y reservá tu primera sesión cuando quieras.</p>
            <a className="pl2-btn pl2-btn--light pl2-btn--lg" href={PATIENT_PORTAL_URL} target="_blank" rel="noreferrer">
              Reservar mi primera sesión
            </a>
          </div>
        </section>

        <section className="pl2-section" id="faq" aria-labelledby="pl2-faq-title">
          <div className="pl2-container">
            <header className="pl2-section-head pl2-section-head--center">
              <p className="pl2-eyebrow">Dudas comunes</p>
              <h2 id="pl2-faq-title">Preguntas frecuentes</h2>
            </header>
            <dl className="pl2-faq pl2-faq--grid">
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
        </section>
      </main>

      <footer className="pl2-footer">
        <div className="pl2-container pl2-footer-inner">
          <nav className="pl2-footer-legal" aria-label="Legal">
            <a href="/docs/privacy.html">Política de privacidad</a>
            <span aria-hidden="true">·</span>
            <a href="/docs/terms.html">Términos</a>
            <span aria-hidden="true">·</span>
            <a href="/docs/crisis.html">Líneas de apoyo</a>
          </nav>
          <p className="pl2-footer-copy">
            © {new Date().getFullYear()} MotivarCare · Argentina ·{" "}
            <a href="mailto:soporte@motivarcare.com">soporte@motivarcare.com</a>
          </p>
          <p className="pl2-footer-photo">
            Imágenes en <code>public/photos</code> (12 archivos). El mapa de uso está en el objeto <code>P</code> de{" "}
            <code>App.tsx</code>.
          </p>
        </div>
      </footer>
    </div>
  );
}
