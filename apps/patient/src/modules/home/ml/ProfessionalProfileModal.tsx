import { useEffect, useState, type SyntheticEvent } from "react";
import {
  replaceTemplate,
  textByLanguage,
  type AppLanguage,
  type LocalizedText
} from "@therapy/i18n-config";
import { ProfessionalReviewsModal } from "../../reviews/components/ProfessionalReviewsModal";
import { ProfessionalNameStack, professionalPhotoAlt } from "../../app/components/ProfessionalNameStack";
import { professionalAccessibleName } from "../../app/lib/professionalDisplayName";
import { professionalPhotoSrc } from "../../app/services/api";
import type { Professional } from "../../app/types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Ficha completa del profesional activo, sin salir de Inicio ni abrir Matching. */
export function DashboardHomeProfessionalProfileModal(props: {
  language: AppLanguage;
  professional: Professional;
  photoSrc: string | null | undefined;
  canSelfChangeProfessional: boolean;
  onClose: () => void;
  onChat: () => void;
  onChangeProfessional: () => void;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
}) {
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const pro = props.professional;
  const reviewCount = pro.reviewsCount ?? 0;
  const rating = pro.rating ?? 0;
  const showRating = rating > 0 || reviewCount > 0;
  const specialties = (pro.specialties ?? []).filter(Boolean);
  const languages = (pro.languages ?? []).filter(Boolean);
  const photoUrl = professionalPhotoSrc(props.photoSrc);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        if (reviewsOpen) {
          setReviewsOpen(false);
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
  }, [props.onClose, reviewsOpen]);

  return (
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
          aria-labelledby="dashboard-home-pro-profile-title"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="dashboard-home-pro-profile-head">
            <div className="dashboard-home-pro-profile-head-copy">
              <p className="dashboard-home-pro-profile-kicker">
                {t(props.language, {
                  es: "Tu profesional",
                  en: "Your professional",
                  pt: "Seu profissional"
                })}
              </p>
              <h2 id="dashboard-home-pro-profile-title" className="dashboard-home-pro-profile-title">
                <ProfessionalNameStack professional={pro} as="span" />
              </h2>
              {pro.title ? <p className="dashboard-home-pro-profile-role">{pro.title}</p> : null}
            </div>
            <button type="button" className="dashboard-home-pro-profile-close" onClick={props.onClose}>
              {t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
            </button>
          </header>

          <div className="dashboard-home-pro-profile-body">
            <div className="dashboard-home-pro-profile-hero">
              <img
                className="dashboard-home-pro-profile-avatar"
                src={photoUrl}
                alt={professionalPhotoAlt(pro)}
                onError={props.onImageFallback}
              />
              <div className="dashboard-home-pro-profile-hero-meta">
                {pro.verified ? (
                  <span className="dashboard-home-pro-profile-verified">
                    {t(props.language, { es: "Verificado", en: "Verified", pt: "Verificado" })}
                  </span>
                ) : null}
                {showRating ? (
                  <button
                    type="button"
                    className="dashboard-home-pro-profile-rating"
                    onClick={() => setReviewsOpen(true)}
                  >
                    <span aria-hidden="true">★</span> {rating.toFixed(1)} · {reviewCount}{" "}
                    {t(props.language, {
                      es: reviewCount === 1 ? "opinión" : "opiniones",
                      en: reviewCount === 1 ? "review" : "reviews",
                      pt: reviewCount === 1 ? "avaliação" : "avaliações"
                    })}
                  </button>
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
                    { compat: String(pro.compatibility ?? 0), years: String(pro.yearsExperience ?? 0) }
                  )}
                </p>
                {typeof pro.activePatients === "number" && pro.activePatients > 0 ? (
                  <p className="dashboard-home-pro-profile-patients">
                    {replaceTemplate(
                      t(props.language, {
                        es: "{count} pacientes activos",
                        en: "{count} active patients",
                        pt: "{count} pacientes ativos"
                      }),
                      { count: String(pro.activePatients) }
                    )}
                  </p>
                ) : null}
              </div>
            </div>

            <section className="dashboard-home-pro-profile-section" aria-label={t(props.language, { es: "Sobre", en: "About", pt: "Sobre" })}>
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

            {pro.approach?.trim() ? (
              <section className="dashboard-home-pro-profile-section">
                <h3 className="dashboard-home-pro-profile-section-title">
                  {t(props.language, {
                    es: "Enfoque",
                    en: "Approach",
                    pt: "Abordagem"
                  })}
                </h3>
                <p className="dashboard-home-pro-profile-bio">{pro.approach.trim()}</p>
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
            <button
              type="button"
              className="dashboard-home-pro-profile-action dashboard-home-pro-profile-action--primary"
              onClick={props.onChat}
            >
              {t(props.language, {
                es: `Chat con ${professionalAccessibleName(pro)}`,
                en: `Chat with ${professionalAccessibleName(pro)}`,
                pt: `Chat com ${professionalAccessibleName(pro)}`
              })}
            </button>
            {props.canSelfChangeProfessional ? (
              <button
                type="button"
                className="dashboard-home-pro-profile-action dashboard-home-pro-profile-action--secondary"
                onClick={props.onChangeProfessional}
              >
                {t(props.language, {
                  es: "Cambiar profesional",
                  en: "Change professional",
                  pt: "Trocar profissional"
                })}
              </button>
            ) : null}
          </footer>
        </section>
      </div>

      <ProfessionalReviewsModal
        open={reviewsOpen}
        language={props.language}
        professional={pro}
        onClose={() => setReviewsOpen(false)}
      />
    </>
  );
}
