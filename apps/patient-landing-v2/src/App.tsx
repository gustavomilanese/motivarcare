import { LandingMacaChat } from "./LandingMacaChat";
import { Plv2ReviewsSection } from "./Plv2ReviewsSection";
import { Plv2SiteHeader } from "./Plv2SiteHeader";
import { QuienesSomosStrip } from "./QuienesSomosStrip";

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
  featAnywhereMobile: "/photos/feat-desde-cualquier-lugar-mobile.jpg",
  featMinutes: "/photos/feat-conecta-en-minutos.jpg",
  featLatam: "/photos/feat-latam-psicologos.jpg",
  featLatamMobile: "/photos/feat-psicologos-certificados-mobile.jpg",
  featCare: "/photos/feat-acompanamiento-bien.jpg",
  matchAvatar: "/photos/08-sesion-profesional-notas.jpg",
  /** Panel único: copy + retratos y sellos (todo en la imagen; no superponer texto en HTML). */
  psicologosPanel: "/photos/psicologos-verificados-panel.jpg",
  /** Videollamada terapia desde casa (¿Quiénes somos? — banda full width). */
  quienesSomosStrip: "/photos/quienes-somos-videollamada.png",
  /** Precios — lifestyle vertical (trabajo remoto / naturaleza). */
  pricingLifestyle: "/photos/precios-trabajo-remoto-vertical.png"
} as const;

const PLV2_FAQ_ITEMS = [
  {
    q: "¿Cómo sé qué psicólogo elegir?",
    a: "Revise perfiles, años de experiencia y enfoque terapéutico. Si la primera opción no convence, puede ajustar y probar con otro profesional sin complicaciones."
  },
  {
    q: "¿Las sesiones son confidenciales?",
    a: "Sí. Son privadas y se rigen por el secreto profesional que corresponde a cada matriculado."
  },
  {
    q: "¿Qué pasa si no conecto con el profesional?",
    a: "Puede cambiar de psicólogo cuando lo necesite. La idea es encontrar a alguien con quien se sienta a gusto y le inspire confianza."
  },
  {
    q: "¿Necesito experiencia previa en terapia?",
    a: "No. Puede empezar aunque sea la primera vez en un proceso terapéutico."
  },
  {
    q: "¿Cómo es la sesión en línea?",
    a: "Videollamada en un entorno seguro de la plataforma. Solo se necesita internet y un lugar tranquilo."
  },
  {
    q: "¿Puedo elegir horario?",
    a: "Sí. Puede elegir día y franja según la disponibilidad que cada profesional publica."
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

function AiOnboardingBubbles() {
  return (
    <>
      <p className="plv2-ai-bubble plv2-ai-bubble--user">¿Me ayuda a encontrar un psicólogo?</p>
      <div className="plv2-ai-bot-row">
        <span className="plv2-ai-bot-avatar" aria-hidden="true">
          <AiBotAvatar />
        </span>
        <p className="plv2-ai-bubble plv2-ai-bubble--bot">Claro. ¿Qué le gustaría trabajar en terapia?</p>
      </div>
      <p className="plv2-ai-bubble plv2-ai-bubble--user">Ansiedad y que no duermo bien.</p>
      <div className="plv2-ai-bot-row">
        <span className="plv2-ai-bot-avatar" aria-hidden="true">
          <AiBotAvatar />
        </span>
        <p className="plv2-ai-bubble plv2-ai-bubble--bot">¿Desde cuándo se siente así?</p>
      </div>
      <p className="plv2-ai-bubble plv2-ai-bubble--user">Hace unos meses; peor los domingos.</p>
      <div className="plv2-ai-bot-row">
        <span className="plv2-ai-bot-avatar" aria-hidden="true">
          <AiBotAvatar />
        </span>
        <p className="plv2-ai-bubble plv2-ai-bubble--bot">¿Prefiere sesiones por la mañana o por la tarde?</p>
      </div>
      <p className="plv2-ai-bubble plv2-ai-bubble--user">Por la tarde.</p>
      <div className="plv2-ai-bot-row">
        <span className="plv2-ai-bot-avatar" aria-hidden="true">
          <AiBotAvatar />
        </span>
        <p className="plv2-ai-bubble plv2-ai-bubble--bot plv2-ai-bubble--accent">
          Gracias — ya estoy buscando la mejor coincidencia para usted.
        </p>
      </div>
    </>
  );
}

function MacaAvatar() {
  return (
    <span className="plv2-maca-avatar" aria-hidden="true">
      M
    </span>
  );
}

/** Diálogo demo (marquee duplicado para loop sin cortes). */
function MacaIaChatDialogue() {
  return (
    <div className="plv2-ai-chat">
      <p className="plv2-ai-bubble plv2-ai-bubble--user">Necesito ayuda para elegir psicólogo: no sé por dónde empezar.</p>
      <div className="plv2-ai-bot-row">
        <MacaAvatar />
        <p className="plv2-ai-bubble plv2-ai-bubble--bot">
          Hola, soy Maca. Estoy disponible las 24 horas para escuchar con calma y ordenar lo que siente.
        </p>
      </div>
      <p className="plv2-ai-bubble plv2-ai-bubble--user">¿La inteligencia artificial también ayuda con el match?</p>
      <div className="plv2-ai-bot-row">
        <MacaAvatar />
        <p className="plv2-ai-bubble plv2-ai-bubble--bot">
          Sí. Cruzo lo que me cuenta con sus preferencias para acercar opciones que encajen mejor —no al azar.
        </p>
      </div>
      <p className="plv2-ai-bubble plv2-ai-bubble--user">¿Puedo escribirle de madrugada?</p>
      <div className="plv2-ai-bot-row">
        <MacaAvatar />
        <p className="plv2-ai-bubble plv2-ai-bubble--bot plv2-ai-bubble--accent">
          Cuando quiera. Respondo al instante; el trabajo clínico lo hace un profesional matriculado en la sesión.
        </p>
      </div>
    </div>
  );
}

function MacaIaChatShowcase() {
  return (
    <div className="plv2-maca-phone" aria-hidden="true">
      <div className="plv2-maca-phone-header">
        <span className="plv2-maca-phone-dot plv2-maca-phone-dot--on" />
        <span className="plv2-maca-phone-title">Maca · asistente IA</span>
        <span className="plv2-maca-phone-badge">24/7</span>
      </div>
      <div className="plv2-maca-chat-window">
        <div className="plv2-maca-chat-marquee">
          <div className="plv2-maca-chat-track">
            <MacaIaChatDialogue />
          </div>
          <div className="plv2-maca-chat-track" aria-hidden="true">
            <MacaIaChatDialogue />
          </div>
        </div>
      </div>
    </div>
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
      <Plv2SiteHeader patientPortalUrl={PATIENT_PORTAL_URL} />

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

        <div className="plv2-container plv2-hero-stage">
          <div className="plv2-hero-copy">
            <h1 id="plv2-hero-title">
              <span className="plv2-hero-title-line1">
                Encuentra el <span className="plv2-hl-blue plv2-hl-mark">psicólogo</span> ideal{" "}
                <span className="plv2-hl-blue plv2-hl-mark">en&nbsp;minutos</span>
              </span>
              <br />
              <span className="plv2-hero-title-line2">
                de forma simple{" "}
                <span className="plv2-hero-nb">y&nbsp;segura.</span>
              </span>
              <br />
              <span className="plv2-hero-title-line3">
                <span className="plv2-hl-blue plv2-hl-mark">
                  ¡Tu cambio empieza&nbsp;acá!
                </span>
              </span>
            </h1>
            <p className="plv2-hero-lead">
              Terapia en línea, fácil y rápida, pensada para quien la necesita. Desde cualquier lugar.
            </p>
            <a className="plv2-cta-gradient" href={PATIENT_PORTAL_URL} target="_blank" rel="noreferrer">
              <span className="plv2-cta-gradient-text">
                Empiece hoy en <strong>{PORTAL_CTA_DISPLAY_HOST}</strong>
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
                <span className="plv2-match-anim-text plv2-match-anim-text--badge">¡Coincidencia ideal!</span>
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
            <div className="plv2-feature-card-media plv2-feature-card-media--anywhere">
              <picture>
                <source media="(max-width: 960px)" srcSet={IMG.featAnywhereMobile} />
                <img src={IMG.featAnywhere} alt="" loading="lazy" width={1024} height={573} />
              </picture>
            </div>
            <div className="plv2-feature-card-body">
              <h3 className="plv2-feature-title">Desde cualquier lugar</h3>
              <p className="plv2-feature-text">
                Terapia desde el hogar, el trabajo o donde se encuentre. Sin traslados ni esperas.
              </p>
            </div>
          </li>

          <li className="plv2-feature-card plv2-feature-card--accent-teal">
            <div className="plv2-feature-card-media plv2-feature-card-media--connect">
              <picture>
                <source media="(max-width: 960px)" srcSet={IMG.featLatamMobile} />
                <img src={IMG.featLatam} alt="" loading="lazy" width={735} height={490} />
              </picture>
              <div className="plv2-flag-overlay" aria-label="Países de Latinoamérica">
                {FLAGS.map((f) => (
                  <span key={f} className="plv2-flag" role="img">
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <div className="plv2-feature-card-body">
              <h3 className="plv2-feature-title">Conexión en minutos</h3>
              <p className="plv2-feature-text">Encontramos el psicólogo ideal en tiempo récord.</p>
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
              <h3 className="plv2-feature-title">Inteligencia artificial a la medida</h3>
              <p className="plv2-feature-text">Nuestra IA analiza las necesidades de cada persona para el mejor match.</p>
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
              <h3 className="plv2-feature-title">Acompañamiento que hace bien</h3>
              <p className="plv2-feature-text">No hay que enfrentarlo solo: acompañamos en cada paso del proceso.</p>
            </div>
          </li>
        </ul>
      </section>

      <section className="plv2-bento" aria-labelledby="plv2-bento-title">
        <div className="plv2-container plv2-bento-intro">
          <p className="plv2-bento-eyebrow">Todo en un solo lugar</p>
          <h2 id="plv2-bento-title" className="plv2-bento-heading">
            Pensado para empezar sin fricción.
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

      <section className="plv2-steps" id="como-empezar" aria-labelledby="plv2-steps-title">
        <div className="plv2-container plv2-steps-inner">
          <h2 id="plv2-steps-title" className="plv2-steps-heading">
            Cuatro pasos para empezar
          </h2>
          <p className="plv2-steps-lead">Del registro a la primera sesión, sin complicaciones.</p>
          <ol className="plv2-steps-list">
            <li className="plv2-steps-card">
              <span className="plv2-steps-num" aria-hidden="true">
                1
              </span>
              <div className="plv2-steps-card-body">
                <h3 className="plv2-steps-item-title">Registro</h3>
                <p className="plv2-steps-item-text">Cree la cuenta en el portal en minutos con el correo electrónico.</p>
              </div>
            </li>
            <li className="plv2-steps-card">
              <span className="plv2-steps-num" aria-hidden="true">
                2
              </span>
              <div className="plv2-steps-card-body">
                <h3 className="plv2-steps-item-title">Cuéntenos lo que necesita</h3>
                <p className="plv2-steps-item-text">
                  Complete el informe o converse con nuestra IA para acotar lo que busca.
                </p>
              </div>
            </li>
            <li className="plv2-steps-card">
              <span className="plv2-steps-num" aria-hidden="true">
                3
              </span>
              <div className="plv2-steps-card-body">
                <h3 className="plv2-steps-item-title">Conozca el match</h3>
                <p className="plv2-steps-item-text">
                  Mostramos profesionales acordes al perfil y las preferencias.
                </p>
              </div>
            </li>
            <li className="plv2-steps-card">
              <span className="plv2-steps-num" aria-hidden="true">
                4
              </span>
              <div className="plv2-steps-card-body">
                <h3 className="plv2-steps-item-title">Reserve y comience</h3>
                <p className="plv2-steps-item-text">
                  Elija horario y comience sesiones en línea cuando le convenga.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <QuienesSomosStrip
        imageSrc={IMG.quienesSomosStrip}
        patientPortalUrl={PATIENT_PORTAL_URL}
        portalDisplayHost={PORTAL_CTA_DISPLAY_HOST}
      />

      <section className="plv2-maca-ia" id="maca-ia" aria-labelledby="plv2-maca-ia-title">
        <div className="plv2-container plv2-maca-ia-inner">
          <div className="plv2-maca-ia-copy">
            <p className="plv2-maca-ia-eyebrow">Maca · cuando necesite hablar</p>
            <h2 id="plv2-maca-ia-title" className="plv2-maca-ia-title">
              Una conversación que la escucha y la acompaña hasta el siguiente paso.
            </h2>
            <p className="plv2-maca-ia-lead">
              Acá no hace falta hablar como en un manual: usted cuenta lo que le pasa y cómo quiere que sea la terapia.
              Con eso, la plataforma le acerca profesionales que tienen más chances de encajar con usted —no al azar— y{" "}
              <strong>Maca</strong> queda en el chat las 24 horas para cuando la cabeza no para: para poner en palabras lo
              que siente, ganar un poco de aire y llegar con más tranquilidad a la videollamada con su psicólogo o
              psicóloga.
            </p>
            <ul className="plv2-maca-ia-points">
              <li>
                <strong>Profesionales que tienen sentido para usted:</strong> según lo que cuenta y lo que prefiere
                (horario, enfoque, idioma…), le mostramos opciones más acordes a su historia.
              </li>
              <li>
                <strong>Maca a cualquier hora:</strong> charla por chat cuando necesite ordenar emociones o bajar la
                ansiedad antes del primer turno.
              </li>
              <li>
                <strong>La terapia la hace una persona:</strong> el acompañamiento clínico lo realiza un psicólogo o
                psicóloga matriculado.
              </li>
            </ul>
            <p className="plv2-maca-ia-disclaimer">
              Maca no reemplaza una emergencia ni el criterio de un profesional. Si cree que está en peligro o en crisis,
              llame a emergencias o a una línea de ayuda en su zona.
            </p>
          </div>
          <div className="plv2-maca-ia-visual">
            <MacaIaChatShowcase />
          </div>
        </div>
      </section>

      <section className="plv2-pricing-split" id="precios" aria-labelledby="plv2-pricing-title">
        <div className="plv2-container plv2-pricing-split-inner">
          <div className="plv2-pricing-split-copy">
            <p className="plv2-pricing-eyebrow">Precios transparentes</p>
            <h2 id="plv2-pricing-title" className="plv2-pricing-title">
              Sesiones claras y{" "}
              <span className="plv2-pricing-title-accent">sin sorpresas</span>
            </h2>
            <div className="plv2-pricing-cards-media-row">
              <ul className="plv2-pricing-cards" role="list">
                <li className="plv2-pricing-card plv2-pricing-card--featured">
                  <span className="plv2-pricing-card-kicker">Referencia en Argentina</span>
                  <p className="plv2-pricing-card-line">
                    <span className="plv2-pricing-card-price">Desde $40.000 ARS</span>
                    <span className="plv2-pricing-card-unit"> / sesión</span>
                  </p>
                  <p className="plv2-pricing-card-sub">Varía según experiencia y enfoque del profesional.</p>
                </li>
                <li className="plv2-pricing-card">
                  <span className="plv2-pricing-card-kicker">Duración habitual</span>
                  <p className="plv2-pricing-card-line">
                    <strong>50 minutos</strong> por encuentro
                  </p>
                  <p className="plv2-pricing-card-sub">Tiempo estándar en la plataforma.</p>
                </li>
                <li className="plv2-pricing-card">
                  <span className="plv2-pricing-card-kicker">Si quiere ahorrar</span>
                  <p className="plv2-pricing-card-line">
                    <strong>Packs con descuento</strong> cuando el profesional los publique
                  </p>
                  <p className="plv2-pricing-card-sub">Por ejemplo 4, 8 o 12 sesiones.</p>
                </li>
                <li className="plv2-pricing-card">
                  <span className="plv2-pricing-card-kicker">Sin atarlo</span>
                  <p className="plv2-pricing-card-line">
                    <strong>Sin suscripción obligatoria</strong>
                  </p>
                  <p className="plv2-pricing-card-sub">Paga solo lo que use.</p>
                </li>
              </ul>
              <figure className="plv2-pricing-split-media">
                <img
                  src={IMG.pricingLifestyle}
                  alt="Persona con auriculares trabajando con laptop frente a arrozales y palmeras al atardecer."
                  width={576}
                  height={1024}
                  loading="lazy"
                  decoding="async"
                  className="plv2-pricing-split-img"
                />
              </figure>
            </div>
            <div className="plv2-pricing-cta-block">
              <h3 className="plv2-pricing-cta-title">Listo para empezar</h3>
              <p className="plv2-pricing-cta-text">
                Cree la cuenta, explore perfiles y reserve la primera sesión con todo claro desde el inicio.
              </p>
              <a
                className="plv2-cta-gradient plv2-cta-gradient--header plv2-pricing-cta-btn"
                href={PATIENT_PORTAL_URL}
                target="_blank"
                rel="noreferrer"
              >
                Reservar la primera sesión
              </a>
            </div>
          </div>
        </div>
      </section>

      <Plv2ReviewsSection />

      <section className="plv2-faq" id="faq" aria-labelledby="plv2-faq-title">
        <div className="plv2-container plv2-faq-inner">
          <header className="plv2-faq-head">
            <p className="plv2-faq-eyebrow">Dudas comunes</p>
            <h2 id="plv2-faq-title" className="plv2-faq-title">
              Preguntas frecuentes
            </h2>
            <p className="plv2-faq-lead">
              Respuestas claras antes de la primera sesión. Si necesita algo más específico, escríbanos desde el portal.
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
              <span className="plv2-footer-tag">BIENESTAR, SIN ESPERAS</span>
            </div>
          </div>
        </div>
      </footer>
      <LandingMacaChat portalUrl={PATIENT_PORTAL_URL} />
    </div>
  );
}
