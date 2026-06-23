import { resolveProfessionalDisplayRating } from "../lib/professionalReviewsDisplay";

export function ProfessionalReviewStarsRow(props: {
  averageRating: number | null | undefined;
  reviewCount: number;
  size?: "md" | "lg";
}) {
  const displayRating = resolveProfessionalDisplayRating(props.averageRating, props.reviewCount);
  const filledStars = Math.round(Math.max(1, Math.min(5, displayRating)));

  return (
    <span
      className={`pro-review-stars-row pro-review-stars-row--${props.size ?? "md"}`}
      aria-label={`${displayRating.toFixed(1)} / 5`}
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <span
          key={value}
          className={`pro-review-stars-row-star${value <= filledStars ? " filled" : ""}`}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </span>
  );
}
