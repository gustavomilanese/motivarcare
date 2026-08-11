import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

type PromoBannerTone = "care" | "access" | "match";

type PromoBanner = {
  id: string;
  tone: PromoBannerTone;
  imageSrc?: string;
  kicker: LocalizedText;
  title: LocalizedText;
  body: LocalizedText;
  /** Si está, el cuerpo se muestra en líneas fijas (evita viudas / wraps raros). */
  bodyLines?: Record<AppLanguage, string[]>;
  badge: LocalizedText;
};

const PROMO_BANNERS: PromoBanner[] = [
  {
    id: "therapy-value",
    tone: "care",
    imageSrc: "/home/banner-therapy-value.png?v=therapy-flat-1",
    kicker: {
      es: "Habla con expertos",
      en: "Talk to experts",
      pt: "Fale com especialistas"
    },
    title: {
      es: "Hacer terapia es cuidarte",
      en: "Therapy is taking care of yourself",
      pt: "Fazer terapia e cuidar de voce"
    },
    body: {
      es: "Un espacio profesional para sostener cambios con claridad y acompañamiento real.",
      en: "A professional space to sustain change with clarity and real support.",
      pt: "Um espaco profissional para sustentar mudancas com clareza e acompanhamento real."
    },
    badge: {
      es: "Acompañamiento real",
      en: "Real support",
      pt: "Acompanhamento real"
    }
  },
  {
    id: "access-24h",
    tone: "access",
    imageSrc: "/home/banner-access-24h.png?v=clock-24h-white-2",
    kicker: {
      es: "Siempre disponible",
      en: "Always available",
      pt: "Sempre disponivel"
    },
    title: {
      es: "Tu proceso, 24 horas",
      en: "Your care, 24 hours",
      pt: "Seu processo, 24 horas"
    },
    body: {
      es: "Reservá, chatá y retomá tu acompañamiento a tu ritmo, cualquier día.",
      en: "Book, chat, and continue your care on your schedule, any day.",
      pt: "Agende, converse e retome seu acompanhamento no seu ritmo, qualquer dia."
    },
    bodyLines: {
      es: ["Reservá, chatá y retomá tu acompañamiento a tu ritmo,", "cualquier día."],
      en: ["Book, chat, and continue your care on your schedule,", "any day."],
      pt: ["Agende, converse e retome seu acompanhamento no seu ritmo,", "qualquer dia."]
    },
    badge: {
      es: "Acceso continuo",
      en: "Always on",
      pt: "Acesso continuo"
    }
  },
  {
    id: "specialist-match",
    tone: "match",
    imageSrc: "/home/banner-specialist-match.png?v=handshake-cutout-5",
    kicker: {
      es: "Matching inteligente",
      en: "Smart matching",
      pt: "Matching inteligente"
    },
    title: {
      es: "Especialistas en tu necesidad",
      en: "Specialists for your needs",
      pt: "Especialistas na sua necessidade"
    },
    body: {
      es: "Hacé matching con psicólogos alineados a tu motivo de consulta.",
      en: "Match with psychologists aligned to your reason for care.",
      pt: "Faca matching com psicologos alinhados ao seu motivo de consulta."
    },
    badge: {
      es: "Match personalizado",
      en: "Personalized match",
      pt: "Match personalizado"
    }
  }
];

const AUTO_MS = 6500;
const SWIPE_THRESHOLD_PX = 48;

/** Carrusel promocional estilo marketplace (Mercado Libre) para Inicio next. */
export function DashboardHomePromoCarousel(props: {
  language: AppLanguage;
  onActiveToneChange?: (tone: PromoBannerTone) => void;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const swipeStartX = useRef<number | null>(null);
  const total = PROMO_BANNERS.length;
  const active = PROMO_BANNERS[index] ?? PROMO_BANNERS[0];

  useEffect(() => {
    props.onActiveToneChange?.(active.tone);
    // Solo reaccionar al tono activo; el callback del padre suele ser setState (estable).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tone-driven sync
  }, [active.tone]);

  useEffect(() => {
    if (paused || total <= 1) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % total);
    }, AUTO_MS);
    return () => window.clearInterval(timer);
  }, [paused, total]);

  const goPrev = () => setIndex((current) => (current - 1 + total) % total);
  const goNext = () => setIndex((current) => (current + 1) % total);

  const onSwipePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse") {
      return;
    }
    swipeStartX.current = event.clientX;
    setPaused(true);
  };

  const onSwipePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" || swipeStartX.current == null) {
      return;
    }
    const delta = event.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(delta) >= SWIPE_THRESHOLD_PX) {
      if (delta < 0) {
        goNext();
      } else {
        goPrev();
      }
    }
    setPaused(false);
  };

  const onSwipePointerCancel = () => {
    swipeStartX.current = null;
    setPaused(false);
  };

  return (
    <section
      className="dashboard-ml-promo"
      aria-roledescription="carousel"
      aria-label={t(props.language, {
        es: "Beneficios de MotivarCare",
        en: "MotivarCare benefits",
        pt: "Beneficios MotivarCare"
      })}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
      onPointerDown={onSwipePointerDown}
      onPointerUp={onSwipePointerUp}
      onPointerCancel={onSwipePointerCancel}
    >
      <div className="dashboard-ml-promo-viewport">
        <div
          className="dashboard-ml-promo-track"
          style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
        >
          {PROMO_BANNERS.map((banner, bannerIndex) => {
            const isActive = bannerIndex === index;
            const hasMedia = Boolean(banner.imageSrc);
            return (
              <article
                key={banner.id}
                className={`dashboard-ml-promo-slide dashboard-ml-promo-slide--${banner.tone}${isActive ? " is-active" : ""}${hasMedia ? " dashboard-ml-promo-slide--media" : ""}`}
                aria-hidden={!isActive}
                data-active={isActive ? "true" : "false"}
              >
                <div className="dashboard-ml-promo-orbs" aria-hidden="true" />
                <div className={`dashboard-ml-promo-frame${hasMedia ? " dashboard-ml-promo-frame--media" : ""}`}>
                  <div className="dashboard-ml-promo-copy">
                    <p className="dashboard-ml-promo-kicker">{t(props.language, banner.kicker)}</p>
                    <h2 className="dashboard-ml-promo-title">{t(props.language, banner.title)}</h2>
                    {banner.bodyLines ? (
                      <p className="dashboard-ml-promo-body dashboard-ml-promo-body--lines">
                        {banner.bodyLines[props.language].map((line, lineIndex) => (
                          <span
                            key={`${banner.id}-body-${lineIndex}`}
                            className={`dashboard-ml-promo-body-line${lineIndex === 0 ? " dashboard-ml-promo-body-line--lead" : ""}`}
                          >
                            {line}
                          </span>
                        ))}
                      </p>
                    ) : (
                      <p className="dashboard-ml-promo-body">{t(props.language, banner.body)}</p>
                    )}
                    <span className="dashboard-ml-promo-badge">{t(props.language, banner.badge)}</span>
                  </div>
                  {banner.imageSrc ? (
                    <div className="dashboard-ml-promo-media" aria-hidden="true">
                      <img
                        className="dashboard-ml-promo-photo"
                        src={banner.imageSrc}
                        alt=""
                        decoding="async"
                      />
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        className="dashboard-ml-promo-arrow dashboard-ml-promo-arrow--prev"
        aria-label={t(props.language, { es: "Banner anterior", en: "Previous banner", pt: "Banner anterior" })}
        onClick={goPrev}
      >
        ‹
      </button>
      <button
        type="button"
        className="dashboard-ml-promo-arrow dashboard-ml-promo-arrow--next"
        aria-label={t(props.language, { es: "Banner siguiente", en: "Next banner", pt: "Proximo banner" })}
        onClick={goNext}
      >
        ›
      </button>

      <div className="dashboard-ml-promo-dots" role="tablist" aria-label={t(props.language, { es: "Banners", en: "Banners", pt: "Banners" })}>
        {PROMO_BANNERS.map((banner, bannerIndex) => (
          <button
            key={banner.id}
            type="button"
            role="tab"
            aria-selected={bannerIndex === index}
            className={`dashboard-ml-promo-dot${bannerIndex === index ? " is-active" : ""}`}
            aria-label={t(props.language, {
              es: `Ir al banner ${bannerIndex + 1}`,
              en: `Go to banner ${bannerIndex + 1}`,
              pt: `Ir ao banner ${bannerIndex + 1}`
            })}
            onClick={() => setIndex(bannerIndex)}
          />
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        {t(props.language, active.title)}
      </p>
    </section>
  );
}
