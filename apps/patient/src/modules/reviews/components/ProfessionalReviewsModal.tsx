import { useMemo } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { professionalAccessibleName } from "../../app/lib/professionalDisplayName";
import { useProfessionalReviews } from "../hooks/useProfessionalReviews";
import { ProfessionalReviewStarsRow } from "./ProfessionalReviewStarsRow";
import {
  buildProfessionalReviewsSummaryLabel,
  formatProfessionalReviewDate,
  renderProfessionalReviewStars,
  resolveProfessionalDisplayRating
} from "../lib/professionalReviewsDisplay";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

type ReviewsProfessional = {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  rating?: number | null;
  reviewsCount?: number;
};

export function ProfessionalReviewsModal(props: {
  open: boolean;
  language: AppLanguage;
  professional: ReviewsProfessional | null;
  onClose: () => void;
}) {
  const professionalId = props.open && props.professional ? props.professional.id : null;
  const { reviews, stats, loading, error } = useProfessionalReviews(professionalId, { limit: 20 });

  const averageRating = stats?.averageRating ?? props.professional?.rating ?? null;
  const reviewCount = stats?.reviewCount ?? props.professional?.reviewsCount ?? 0;

  const displayRating = resolveProfessionalDisplayRating(averageRating, reviewCount);

  const summaryLabel = useMemo(
    () => buildProfessionalReviewsSummaryLabel(props.language, averageRating, reviewCount),
    [averageRating, props.language, reviewCount]
  );

  if (!props.open || !props.professional) {
    return null;
  }

  const professionalName = professionalAccessibleName(props.professional);
  const title = t(props.language, {
    es: "Opiniones",
    en: "Reviews",
    pt: "Avaliações"
  });

  return (
    <div
      className="matching-flow-backdrop professional-reviews-modal-backdrop"
      role="presentation"
      onClick={props.onClose}
    >
      <section
        className="matching-flow-modal professional-reviews-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="professional-reviews-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="matching-flow-header professional-reviews-modal-head">
          <div className="professional-reviews-modal-head-copy">
            <p className="professional-reviews-modal-eyebrow">{title}</p>
            <h3 id="professional-reviews-modal-title" className="professional-reviews-modal-title">
              {professionalName}
            </h3>
            <div className="professional-reviews-modal-rating-row">
              <ProfessionalReviewStarsRow
                averageRating={averageRating}
                reviewCount={reviewCount}
                size="lg"
              />
              <span className="professional-reviews-modal-rating-value">{displayRating.toFixed(1)}</span>
              <span className="professional-reviews-modal-rating-meta">{summaryLabel}</span>
            </div>
          </div>
          <button
            type="button"
            className="matching-flow-close"
            onClick={props.onClose}
            aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
          >
            ×
          </button>
        </header>

        <div className="professional-reviews-modal-body" aria-busy={loading}>
          {loading ? (
            <p className="professional-reviews-modal-status">
              {t(props.language, { es: "Cargando opiniones…", en: "Loading reviews…", pt: "Carregando avaliações…" })}
            </p>
          ) : error && reviewCount <= 0 ? (
            <p className="professional-reviews-modal-status">
              {t(props.language, {
                es: "No pudimos cargar las opiniones. Probá de nuevo más tarde.",
                en: "We couldn't load reviews. Please try again later.",
                pt: "Não foi possível carregar as avaliações. Tente novamente mais tarde."
              })}
            </p>
          ) : reviews.length === 0 ? (
            <p className="professional-reviews-modal-status professional-reviews-empty">
              {t(props.language, {
                es: `Todavía no hay opiniones publicadas para ${professionalName}.`,
                en: `There are no published reviews for ${professionalName} yet.`,
                pt: `Ainda não há avaliações publicadas para ${professionalName}.`
              })}
            </p>
          ) : (
            <ul className="professional-reviews-list">
              {reviews.map((review) => (
                <li key={review.id} className="professional-review-item">
                  <div className="professional-review-item-head">
                    <strong>{review.patientLabel}</strong>
                    <span className="professional-review-item-stars" aria-label={`${review.rating} / 5`}>
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
