import { useEffect, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

type PromoBannerTone = "sage" | "navy" | "terracotta";

type PromoBanner = {
  id: string;
  tone: PromoBannerTone;
  imageSrc: string;
  kicker: LocalizedText;
  title: LocalizedText;
  body: LocalizedText;
};

const PROMO_BANNERS: PromoBanner[] = [
  {
    id: "therapy-value",
    tone: "sage",
    imageSrc: "/home/banner-therapy-value.png",
    kicker: {
      es: "Bienestar con propósito",
      en: "Purposeful wellbeing",
      pt: "Bem-estar com proposito"
    },
    title: {
      es: "Hacer terapia es cuidarte con constancia",
      en: "Therapy is consistent self-care",
      pt: "Fazer terapia e cuidar de voce com constancia"
    },
    body: {
      es: "Un espacio profesional para ordenar lo que sentís, sostener cambios y avanzar con más claridad.",
      en: "A professional space to make sense of what you feel, sustain change, and move forward with clarity.",
      pt: "Um espaco profissional para organizar o que voce sente, sustentar mudancas e avancar com mais clareza."
    }
  },
  {
    id: "access-24h",
    tone: "navy",
    imageSrc: "/home/banner-access-24h.png",
    kicker: {
      es: "Cuando lo necesités",
      en: "Whenever you need it",
      pt: "Quando voce precisar"
    },
    title: {
      es: "Acceso 24 horas a tu proceso",
      en: "24-hour access to your care",
      pt: "Acesso 24 horas ao seu processo"
    },
    body: {
      es: "Reservá, chatá con tu profesional y retomá tu acompañamiento a tu ritmo, cualquier día.",
      en: "Book, chat with your professional, and continue your care on your schedule, any day.",
      pt: "Agende, converse com seu profissional e retome seu acompanhamento no seu ritmo, qualquer dia."
    }
  },
  {
    id: "specialist-match",
    tone: "terracotta",
    imageSrc: "/home/banner-specialist-match.png",
    kicker: {
      es: "Matching inteligente",
      en: "Smart matching",
      pt: "Matching inteligente"
    },
    title: {
      es: "Profesionales especialistas en tu necesidad",
      en: "Specialists matched to your needs",
      pt: "Profissionais especialistas na sua necessidade"
    },
    body: {
      es: "Podés hacer matching con psicólogos alineados a tu motivo de consulta y encontrar el acompañamiento adecuado.",
      en: "Match with psychologists aligned to your reason for seeking care and find the right support.",
      pt: "Voce pode fazer matching com psicologos alinhados ao seu motivo de consulta e encontrar o acompanhamento certo."
    }
  }
];

const AUTO_MS = 6500;

/** Carrusel promocional estilo marketplace (Mercado Libre) para Inicio next. */
export function DashboardHomePromoCarousel(props: { language: AppLanguage }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = PROMO_BANNERS.length;
  const active = PROMO_BANNERS[index] ?? PROMO_BANNERS[0];

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
    >
      <div className="dashboard-ml-promo-viewport">
        {PROMO_BANNERS.map((banner, bannerIndex) => {
          const isActive = bannerIndex === index;
          return (
            <article
              key={banner.id}
              className={`dashboard-ml-promo-slide dashboard-ml-promo-slide--${banner.tone}${isActive ? " is-active" : ""}`}
              aria-hidden={!isActive}
              data-active={isActive ? "true" : "false"}
            >
              <img className="dashboard-ml-promo-photo" src={banner.imageSrc} alt="" loading={bannerIndex === 0 ? "eager" : "lazy"} />
              <div className="dashboard-ml-promo-scrim" aria-hidden="true" />
              <div className="dashboard-ml-promo-copy">
                <p className="dashboard-ml-promo-kicker">{t(props.language, banner.kicker)}</p>
                <h2 className="dashboard-ml-promo-title">{t(props.language, banner.title)}</h2>
                <p className="dashboard-ml-promo-body">{t(props.language, banner.body)}</p>
              </div>
            </article>
          );
        })}
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
