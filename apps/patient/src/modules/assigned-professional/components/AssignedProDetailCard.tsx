import { useState, type SyntheticEvent } from "react";
import {
  replaceTemplate,
  type AppLanguage,
  type LocalizedText,
  textByLanguage
} from "@therapy/i18n-config";
import { ProfessionalNameStack, professionalPhotoAlt } from "../../app/components/ProfessionalNameStack";
import { professionalAccessibleName } from "../../app/lib/professionalDisplayName";
import { professionalPhotoSrc } from "../../app/services/api";
import type { Professional } from "../../app/types";
import { ProfileExpandableText } from "../../home/ml/ProfileExpandableText";
import { ProfessionalReviewsModal } from "../../reviews/components/ProfessionalReviewsModal";
import { resolveProfessionalRoleLabel } from "../lib/resolveProfessionalRoleLabel";
import { AssignedProRoleChip } from "./AssignedProRoleChip";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function initials(name: string): string {
  const parts = name
    .split(/\s+/)
    .filter((token) => !/^(dr|dra|lic|licda|psic|mr|mrs|ms|sr|sra)\.?$/i.test(token));
  return parts
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join("")
    .toUpperCase();
}

/** Ficha completa del profesional del vínculo — estética calm de matching. */
export function AssignedProDetailCard(props: {
  language: AppLanguage;
  professional: Professional;
  photoUrl: string | null;
  onChat: () => void;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
}) {
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const pro = props.professional;
  const name = professionalAccessibleName(pro);
  const photo = professionalPhotoSrc(props.photoUrl);
  const rating = pro.rating ?? 0;
  const reviewCount = pro.reviewsCount ?? 0;
  const showRating = rating > 0 || reviewCount > 0;
  const filledStars = Math.round(rating);
  const ratingText = rating.toFixed(1).replace(".", props.language === "en" ? "." : ",");
  const specialties = (pro.specialties ?? []).filter(Boolean);
  const languages = (pro.languages ?? []).filter(Boolean);
  const roleLabel = resolveProfessionalRoleLabel(pro, props.language);

  return (
    <>
      <article className="assigned-pro-card patient-therapist-card patient-therapist-card--calm is-best">
        <span className="patient-therapist-best">
          {t(props.language, { es: "Tu profesional", en: "Your professional", pt: "Seu profissional" })}
        </span>
        <AssignedProRoleChip label={roleLabel} />
        <div className="calm-pro-top">
          <div className="calm-pro-who">
            {photo ? (
              <img
                className="patient-therapist-avatar"
                src={photo}
                alt={professionalPhotoAlt(pro)}
                onError={props.onImageFallback}
              />
            ) : (
              <span className="calm-pro-initials" aria-hidden="true">
                {initials(name)}
              </span>
            )}
            <div className="calm-pro-id">
              <h2 className="patient-therapist-name-single">
                <ProfessionalNameStack professional={pro} as="span" />
              </h2>
              <p className="calm-pro-rating">
                {showRating ? (
                  <button
                    type="button"
                    className="assigned-pro-rating-btn"
                    onClick={() => setReviewsOpen(true)}
                  >
                    <span className="calm-pro-stars" aria-hidden="true">
                      {[0, 1, 2, 3, 4].map((index) => (
                        <i key={index} className={index < filledStars ? "is-on" : ""}>
                          ★
                        </i>
                      ))}
                    </span>
                    <span className="rating-value">{ratingText}</span>
                    {reviewCount > 0 ? (
                      <span className="assigned-pro-reviews">
                        · {reviewCount}{" "}
                        {t(props.language, {
                          es: reviewCount === 1 ? "opinión" : "opiniones",
                          en: reviewCount === 1 ? "review" : "reviews",
                          pt: reviewCount === 1 ? "avaliação" : "avaliações"
                        })}
                      </span>
                    ) : null}
                  </button>
                ) : (
                  <span className="assigned-pro-rating-empty">
                    {t(props.language, {
                      es: "Sin opiniones todavía",
                      en: "No reviews yet",
                      pt: "Sem avaliações ainda"
                    })}
                  </span>
                )}
              </p>
              {typeof pro.yearsExperience === "number" && pro.yearsExperience > 0 ? (
                <p className="calm-pro-years">
                  {t(props.language, {
                    es: `${pro.yearsExperience} años de experiencia`,
                    en: `${pro.yearsExperience} years of experience`,
                    pt: `${pro.yearsExperience} anos de experiencia`
                  })}
                </p>
              ) : null}
              {pro.verified ? (
                <p className="assigned-pro-verified">
                  {t(props.language, { es: "Verificado", en: "Verified", pt: "Verificado" })}
                </p>
              ) : null}
              {typeof pro.compatibility === "number" && pro.compatibility > 0 ? (
                <p className="assigned-pro-compat">
                  {replaceTemplate(
                    t(props.language, {
                      es: "{compat}% compatibilidad",
                      en: "{compat}% match",
                      pt: "{compat}% compatibilidade"
                    }),
                    { compat: String(pro.compatibility) }
                  )}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <section className="assigned-pro-section">
          <h3>
            {t(props.language, {
              es: "Sobre el profesional",
              en: "About the professional",
              pt: "Sobre o profissional"
            })}
          </h3>
          <ProfileExpandableText
            language={props.language}
            lines={6}
            text={
              pro.bio?.trim()
                ? pro.bio.trim()
                : t(props.language, {
                    es: "Sin descripción publicada todavía.",
                    en: "No description published yet.",
                    pt: "Sem descricao publicada ainda."
                  })
            }
          />
        </section>

        {pro.approach?.trim() ? (
          <section className="assigned-pro-section">
            <h3>
              {t(props.language, { es: "Enfoque", en: "Approach", pt: "Abordagem" })}
            </h3>
            <ProfileExpandableText language={props.language} text={pro.approach.trim()} lines={5} />
          </section>
        ) : null}

        {specialties.length > 0 ? (
          <section className="assigned-pro-section">
            <h3>
              {t(props.language, { es: "Especialidades", en: "Specialties", pt: "Especialidades" })}
            </h3>
            <ul className="assigned-pro-tags">
              {specialties.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {languages.length > 0 ? (
          <section className="assigned-pro-section">
            <h3>{t(props.language, { es: "Idiomas", en: "Languages", pt: "Idiomas" })}</h3>
            <ul className="assigned-pro-tags">
              {languages.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="patient-therapist-calm-actions">
          <button type="button" className="patient-therapist-choose" onClick={props.onChat}>
            {t(props.language, {
              es: `Escribile a ${name}`,
              en: `Message ${name}`,
              pt: `Escreva para ${name}`
            })}
          </button>
        </div>
      </article>

      <ProfessionalReviewsModal
        open={reviewsOpen}
        language={props.language}
        professional={pro}
        onClose={() => setReviewsOpen(false)}
      />
    </>
  );
}
