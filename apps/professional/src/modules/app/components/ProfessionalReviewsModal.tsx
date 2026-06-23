import { useMemo } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { useProfessionalReviews } from "../hooks/useProfessionalReviews";
import {
  buildProfessionalReviewsSummaryLabel,
  formatProfessionalReviewDate,
  renderProfessionalReviewStars,
  resolveProfessionalDisplayRating
} from "../lib/professionalReviewsDisplay";
import { ProPageLoader } from "./ProPageLoader";
import { ProfessionalReviewStarsRow } from "./ProfessionalReviewStarsRow";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

type ReviewsProfessional = {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
};

function professionalDisplayName(professional: ReviewsProfessional): string {
  const fromParts = [professional.firstName, professional.lastName].filter(Boolean).join(" ").trim();
  return fromParts || professional.fullName.trim();
}

export function ProfessionalReviewsModal(props: {
  open: boolean;
  language: AppLanguage;
  professional: ReviewsProfessional | null;
  onClose: () => void;
}) {
  const professionalId = props.open && props.professional ? props.professional.id : null;
  const { reviews, stats, loading, error } = useProfessionalReviews(professionalId, { limit: 20 });

  const averageRating = stats?.averageRating ?? null;
  const reviewCount = stats?.reviewCount ?? 0;
  const displayRating = resolveProfessionalDisplayRating(averageRating, reviewCount);

  const summaryLabel = useMemo(
    () => buildProfessionalReviewsSummaryLabel(props.language, averageRating, reviewCount),
    [averageRating, props.language, reviewCount]
  );

  if (!props.open || !props.professional) {
    return null;
  }

  const professionalName = professionalDisplayName(props.professional);
  const title = t(props.language, {
    es: "Opiniones",
    en: "Reviews",
    pt: "Avaliações"
  });

  return (
    <div className="pro-reviews-backdrop" role="presentation" onClick={props.onClose}>
      <section
        className="pro-reviews-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-reviews-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="pro-reviews-modal-head">
          <div className="pro-reviews-modal-head-copy">
            <p className="pro-reviews-modal-eyebrow">{title}</p>
            <h3 id="pro-reviews-modal-title" className="pro-reviews-modal-title">
              {professionalName}
            </h3>
            <div className="pro-reviews-modal-rating-row">
              <ProfessionalReviewStarsRow averageRating={averageRating} reviewCount={reviewCount} size="lg" />
              <span className="pro-reviews-modal-rating-value">{displayRating.toFixed(1)}</span>
              <span className="pro-reviews-modal-rating-meta">{summaryLabel}</span>
            </div>
          </div>
          <button
            type="button"
            className="pro-reviews-modal-close"
            onClick={props.onClose}
            aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
          >
            ×
          </button>
        </header>

        <div className="pro-reviews-modal-body" aria-busy={loading}>
          {loading ? (
            <ProPageLoader language={props.language} layout="inline" />
          ) : error && reviewCount <= 0 ? (
            <p className="pro-reviews-modal-status">
              {t(props.language, {
                es: "No pudimos cargar las opiniones. Probá de nuevo más tarde.",
                en: "We couldn't load reviews. Please try again later.",
                pt: "Não foi possível carregar as avaliações. Tente novamente mais tarde."
              })}
            </p>
          ) : reviews.length === 0 ? (
            <p className="pro-reviews-modal-status pro-reviews-modal-status--empty">
              {t(props.language, {
                es: `Todavía no hay opiniones publicadas para ${professionalName}.`,
                en: `There are no published reviews for ${professionalName} yet.`,
                pt: `Ainda não há avaliações publicadas para ${professionalName}.`
              })}
            </p>
          ) : (
            <ul className="pro-reviews-list">
              {reviews.map((review) => (
                <li key={review.id} className="pro-review-item">
                  <div className="pro-review-item-head">
                    <strong>{review.patientLabel}</strong>
                    <span className="pro-review-item-stars" aria-label={`${review.rating} / 5`}>
                      {renderProfessionalReviewStars(review.rating)}
                    </span>
                  </div>
                  {review.comment ? <p>{review.comment}</p> : null}
                  <small>{formatProfessionalReviewDate(props.language, review.createdAt)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
