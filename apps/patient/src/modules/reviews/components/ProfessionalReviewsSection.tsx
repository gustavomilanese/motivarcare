import { useEffect, useMemo, useState } from "react";
import {
  type AppLanguage,
  type LocalizedText,
  textByLanguage
} from "@therapy/i18n-config";
import type { ProfessionalReviewPublicItem, ProfessionalReviewStats } from "@therapy/types";
import { fetchProfessionalReviews } from "../services/professionalReviewsApi";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatReviewDate(language: AppLanguage, isoDate: string): string {
  return new Intl.DateTimeFormat(language === "es" ? "es-AR" : language === "pt" ? "pt-BR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(isoDate));
}

function renderStars(rating: number): string {
  return "★".repeat(Math.max(0, Math.min(5, rating))) + "☆".repeat(Math.max(0, 5 - Math.min(5, rating)));
}

export function ProfessionalReviewsSection(props: {
  language: AppLanguage;
  professionalId: string;
  fallbackRating?: number | null;
  fallbackReviewCount?: number;
}) {
  const [reviews, setReviews] = useState<ProfessionalReviewPublicItem[]>([]);
  const [stats, setStats] = useState<ProfessionalReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    void fetchProfessionalReviews(props.professionalId, { limit: 6 })
      .then((response) => {
        if (!active) {
          return;
        }
        setReviews(response.reviews ?? []);
        setStats(response.stats ?? null);
      })
      .catch(() => {
        if (active) {
          setError(true);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [props.professionalId]);

  const averageRating = stats?.averageRating ?? props.fallbackRating ?? null;
  const reviewCount = stats?.reviewCount ?? props.fallbackReviewCount ?? 0;

  const summaryLabel = useMemo(() => {
    if (averageRating == null || reviewCount <= 0) {
      return t(props.language, {
        es: "Sin opiniones todavía",
        en: "No reviews yet",
        pt: "Sem avaliações ainda"
      });
    }
    const reviewsWord =
      reviewCount === 1
        ? t(props.language, { es: "opinión", en: "review", pt: "avaliação" })
        : t(props.language, { es: "opiniones", en: "reviews", pt: "avaliações" });
    return `${averageRating.toFixed(1)} · ${reviewCount} ${reviewsWord}`;
  }, [averageRating, props.language, reviewCount]);

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
            {averageRating != null ? renderStars(Math.round(averageRating)) : "—"}
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
                  {renderStars(review.rating)}
                </span>
              </div>
              {review.comment ? <p>{review.comment}</p> : null}
              <small>{formatReviewDate(props.language, review.createdAt)}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
