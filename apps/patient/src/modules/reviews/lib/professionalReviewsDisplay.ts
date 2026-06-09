import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function formatProfessionalReviewDate(language: AppLanguage, isoDate: string): string {
  return new Intl.DateTimeFormat(language === "es" ? "es-AR" : language === "pt" ? "pt-BR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(isoDate));
}

export const DEFAULT_PROFESSIONAL_DISPLAY_RATING = 5;

export function resolveProfessionalDisplayRating(
  averageRating: number | null | undefined,
  reviewCount: number
): number {
  if (reviewCount > 0 && averageRating != null && Number.isFinite(averageRating)) {
    return averageRating;
  }
  return DEFAULT_PROFESSIONAL_DISPLAY_RATING;
}

export function renderProfessionalReviewStars(rating: number): string {
  return "★".repeat(Math.max(0, Math.min(5, rating))) + "☆".repeat(Math.max(0, 5 - Math.min(5, rating)));
}

export function buildProfessionalReviewsSummaryLabel(
  language: AppLanguage,
  averageRating: number | null,
  reviewCount: number
): string {
  if (averageRating == null || reviewCount <= 0) {
    return t(language, {
      es: "Sin opiniones todavía",
      en: "No reviews yet",
      pt: "Sem avaliações ainda"
    });
  }

  const reviewsWord =
    reviewCount === 1
      ? t(language, { es: "opinión", en: "review", pt: "avaliação" })
      : t(language, { es: "opiniones", en: "reviews", pt: "avaliações" });

  return `${averageRating.toFixed(1)} · ${reviewCount} ${reviewsWord}`;
}
