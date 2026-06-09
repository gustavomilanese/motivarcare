import { useMemo } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { useProfessionalReviews } from "../hooks/useProfessionalReviews";
import {
  buildProfessionalReviewsSummaryLabel,
  formatProfessionalReviewDate,
  renderProfessionalReviewStars
} from "../lib/professionalReviewsDisplay";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfessionalReviewsSection(props: {
  language: AppLanguage;
  professionalId: string;
  fallbackRating?: number | null;
  fallbackReviewCount?: number;
}) {
  const { reviews, stats, loading, error } = useProfessionalReviews(props.professionalId, { limit: 6 });

  const averageRating = stats?.averageRating ?? props.fallbackRating ?? null;
  const reviewCount = stats?.reviewCount ?? props.fallbackReviewCount ?? 0;

  const summaryLabel = useMemo(
    () => buildProfessionalReviewsSummaryLabel(props.language, averageRating, reviewCount),
    [averageRating, props.language, reviewCount]
  );

  if (loading) {
    return (
      <section className="content-card professional-reviews-section" aria-busy="true">
        <p>{t(props.language, { es: "Cargando opiniones…", en: "Loading reviews…", pt: "Carregando avaliações…" })}</p>
      </section>
    );
  }

  if (error && reviewCount <= 0) {
    return null;
  }

  return (
    <section className="content-card professional-reviews-section">
      <div className="professional-reviews-head">
        <h2>{t(props.language, { es: "Opiniones", en: "Reviews", pt: "Avaliações" })}</h2>
        <p className="professional-reviews-summary">
          <span className="professional-reviews-summary-stars" aria-hidden="true">
            {averageRating != null ? renderProfessionalReviewStars(Math.round(averageRating)) : "—"}
          </span>
          <span>{summaryLabel}</span>
        </p>
      </div>

      {reviews.length === 0 ? (
        <p className="professional-reviews-empty">
          {t(props.language, {
            es: "Todavía no hay opiniones publicadas para este profesional.",
            en: "There are no published reviews for this professional yet.",
            pt: "Ainda não há avaliações publicadas para este profissional."
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
    </section>
  );
}
