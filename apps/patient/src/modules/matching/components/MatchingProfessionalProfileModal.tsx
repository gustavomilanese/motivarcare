import { useEffect, useState, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import {
  replaceTemplate,
  textByLanguage,
  type AppLanguage,
  type LocalizedText
} from "@therapy/i18n-config";
import { ProfessionalNameStack, professionalPhotoAlt } from "../../app/components/ProfessionalNameStack";
import { professionalAccessibleName } from "../../app/lib/professionalDisplayName";
import { professionalPhotoSrc } from "../../app/services/api";
import { countryToFlag } from "../utils/countryFlag";
import type { MatchCardProfessional } from "../types";
import { ProfessionalVideoModal } from "./ProfessionalVideoModal";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Ficha de descripción del profesional en matching (bio, enfoque, video). */
export function MatchingProfessionalProfileModal(props: {
  language: AppLanguage;
  professional: MatchCardProfessional;
  matchScore?: number;
  showScheduleAction: boolean;
  onClose: () => void;
  onShowSchedule: () => void;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
}) {
  const [videoOpen, setVideoOpen] = useState(false);
  const pro = props.professional;
  const photoUrl = professionalPhotoSrc(pro.photoUrl);
  const hasVideo = Boolean(pro.videoUrl);
  const flag = countryToFlag(pro.birthCountry);
  const specialties = [pro.specialization, pro.focusPrimary, ...(pro.focusAreas ?? [])]
    .filter((value): value is string => Boolean(value && value.trim()))
    .filter((value, index, list) => list.indexOf(value) === index);
  const languages = (pro.languages ?? []).filter(Boolean);
  const reviewCount = pro.reviewsCount ?? 0;
  const rating = pro.ratingAverage ?? 0;
  const showRating = rating > 0 || reviewCount > 0;
  const score = props.matchScore ?? pro.matchScore ?? pro.compatibilityBase;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (videoOpen) {
          setVideoOpen(false);
          return;
        }
        props.onClose();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [props.onClose, videoOpen]);

  return createPortal(
    <>
      <div
        className="matching-flow-backdrop dashboard-home-pro-profile-backdrop"
        role="presentation"
        onClick={props.onClose}
      >
        <section
          className="matching-flow-modal dashboard-home-pro-profile-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="matching-pro-profile-title"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="dashboard-home-pro-profile-head">
            <div className="dashboard-home-pro-profile-head-copy">
              <p className="dashboard-home-pro-profile-kicker">
                {t(props.language, {
                  es: "Perfil del profesional",
                  en: "Professional profile",
                  pt: "Perfil do profissional"
                })}
              </p>
              <h2 id="matching-pro-profile-title" className="dashboard-home-pro-profile-title">
                <ProfessionalNameStack professional={pro} as="span" />
                {flag ? <span aria-hidden="true"> {flag}</span> : null}
              </h2>
              {pro.title ? <p className="dashboard-home-pro-profile-role">{pro.title}</p> : null}
            </div>
            <button
              type="button"
              className="dashboard-home-pro-profile-close"
              onClick={props.onClose}
              aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
                <path
                  d="M6.5 6.5l11 11M17.5 6.5l-11 11"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </header>

          <div className="dashboard-home-pro-profile-body">
            <div className="dashboard-home-pro-profile-hero">
              <div className="matching-pro-profile-avatar-wrap">
                <img
                  className="dashboard-home-pro-profile-avatar"
                  src={photoUrl}
                  alt={professionalPhotoAlt(pro)}
                  onError={props.onImageFallback}
                />
                {hasVideo ? (
                  <button
                    type="button"
                    className="patient-therapist-video-trigger matching-pro-profile-video-trigger"
                    onClick={() => setVideoOpen(true)}
                    aria-label={t(props.language, {
                      es: `Ver video de ${professionalAccessibleName(pro)}`,
                      en: `Watch ${professionalAccessibleName(pro)}'s video`,
                      pt: `Ver vídeo de ${professionalAccessibleName(pro)}`
                    })}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.92" />
                      <path
                        d="M10 8.2v7.6c0 .5.55.8 1 .55l5.8-3.3a.65.65 0 0 0 0-1.12l-5.8-3.73A.65.65 0 0 0 10 8.2Z"
                        fill="#ffffff"
                      />
                    </svg>
                  </button>
                ) : null}
              </div>
              <div className="dashboard-home-pro-profile-hero-meta">
                {pro.stripeVerified ? (
                  <span className="dashboard-home-pro-profile-verified">
                    {t(props.language, { es: "Verificado", en: "Verified", pt: "Verificado" })}
                  </span>
                ) : null}
                {showRating ? (
                  <p className="dashboard-home-pro-profile-rating-empty">
                    <span aria-hidden="true">★</span> {rating.toFixed(1)} · {reviewCount}{" "}
                    {t(props.language, {
                      es: reviewCount === 1 ? "opinión" : "opiniones",
                      en: reviewCount === 1 ? "review" : "reviews",
                      pt: reviewCount === 1 ? "avaliação" : "avaliações"
                    })}
                  </p>
                ) : (
                  <p className="dashboard-home-pro-profile-rating-empty">
                    {t(props.language, {
                      es: "Sin opiniones todavía",
                      en: "No reviews yet",
                      pt: "Sem avaliações ainda"
                    })}
                  </p>
                )}
                <p className="dashboard-home-pro-profile-compat">
                  {replaceTemplate(
                    t(props.language, {
                      es: "{compat}% compatibilidad · {years} años de experiencia",
                      en: "{compat}% match · {years} years of experience",
                      pt: "{compat}% compatibilidade · {years} anos de experiencia"
                    }),
                    { compat: String(score ?? 0), years: String(pro.yearsExperience ?? 0) }
                  )}
                </p>
              </div>
            </div>

            <section
              className="dashboard-home-pro-profile-section"
              aria-label={t(props.language, { es: "Sobre", en: "About", pt: "Sobre" })}
            >
              <h3 className="dashboard-home-pro-profile-section-title">
                {t(props.language, {
                  es: "Sobre el profesional",
                  en: "About the professional",
                  pt: "Sobre o profissional"
                })}
              </h3>
              <p className="dashboard-home-pro-profile-bio">
                {pro.bio?.trim()
                  ? pro.bio.trim()
                  : t(props.language, {
                      es: "Sin descripción publicada todavía.",
                      en: "No description published yet.",
                      pt: "Sem descricao publicada ainda."
                    })}
              </p>
            </section>

            {pro.therapeuticApproach?.trim() ? (
              <section className="dashboard-home-pro-profile-section">
                <h3 className="dashboard-home-pro-profile-section-title">
                  {t(props.language, {
                    es: "Enfoque",
                    en: "Approach",
                    pt: "Abordagem"
                  })}
                </h3>
                <p className="dashboard-home-pro-profile-bio">{pro.therapeuticApproach.trim()}</p>
              </section>
            ) : null}

            {specialties.length > 0 ? (
              <section className="dashboard-home-pro-profile-section">
                <h3 className="dashboard-home-pro-profile-section-title">
                  {t(props.language, {
                    es: "Especialidades",
                    en: "Specialties",
                    pt: "Especialidades"
                  })}
                </h3>
                <ul className="dashboard-home-pro-profile-tags">
                  {specialties.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {languages.length > 0 ? (
              <section className="dashboard-home-pro-profile-section">
                <h3 className="dashboard-home-pro-profile-section-title">
                  {t(props.language, {
                    es: "Idiomas",
                    en: "Languages",
                    pt: "Idiomas"
                  })}
                </h3>
                <ul className="dashboard-home-pro-profile-tags">
                  {languages.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <footer className="dashboard-home-pro-profile-actions">
            {hasVideo ? (
              <button
                type="button"
                className="dashboard-home-pro-profile-action dashboard-home-pro-profile-action--secondary"
                onClick={() => setVideoOpen(true)}
              >
                {t(props.language, {
                  es: "Ver video de presentación",
                  en: "Watch intro video",
                  pt: "Ver vídeo de apresentação"
                })}
              </button>
            ) : null}
            {props.showScheduleAction ? (
              <button
                type="button"
                className="dashboard-home-pro-profile-action dashboard-home-pro-profile-action--primary"
                onClick={props.onShowSchedule}
              >
                {t(props.language, {
                  es: "Ver horarios disponibles",
                  en: "See available times",
                  pt: "Ver horários disponíveis"
                })}
              </button>
            ) : (
              <button
                type="button"
                className="dashboard-home-pro-profile-action dashboard-home-pro-profile-action--primary"
                onClick={props.onClose}
              >
                {t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
              </button>
            )}
          </footer>
        </section>
      </div>

      {videoOpen && hasVideo ? (
        <ProfessionalVideoModal
          language={props.language}
          professional={pro}
          onClose={() => setVideoOpen(false)}
        />
      ) : null}
    </>,
    document.body
  );
}
