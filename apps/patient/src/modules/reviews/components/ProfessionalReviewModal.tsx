import { useMemo, useState } from "react";
import {
  type AppLanguage,
  type LocalizedText,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import type { PendingProfessionalReviewPrompt } from "@therapy/types";
import { submitProfessionalReview } from "../services/professionalReviewsApi";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfessionalReviewModal(props: {
  open: boolean;
  language: AppLanguage;
  authToken: string | null;
  pending: PendingProfessionalReviewPrompt | null;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeRating = hoverRating || rating;
  const canSubmit = rating >= 1 && !submitting && Boolean(props.authToken) && Boolean(props.pending);

  const title = useMemo(
    () =>
      t(props.language, {
        es: "¿Cómo fue tu experiencia?",
        en: "How was your experience?",
        pt: "Como foi sua experiência?"
      }),
    [props.language]
  );

  if (!props.open || !props.pending) {
    return null;
  }

  const handleSubmit = async () => {
    if (!props.authToken || !props.pending || rating < 1) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await submitProfessionalReview(props.authToken, {
        professionalId: props.pending.professionalId,
        rating,
        comment: comment.trim() || null,
        bookingId: props.pending.triggerBookingId
      });
      setRating(0);
      setHoverRating(0);
      setComment("");
      props.onSubmitted();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t(props.language, {
              es: "No pudimos guardar tu opinión. Probá de nuevo.",
              en: "We couldn't save your review. Please try again.",
              pt: "Não foi possível salvar sua avaliação. Tente novamente."
            })
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="matching-flow-backdrop professional-review-backdrop" role="presentation" onClick={props.onClose}>
      <section
        className="matching-flow-modal professional-review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="professional-review-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="matching-flow-header">
          <div>
            <h3 id="professional-review-title">{title}</h3>
            <p className="professional-review-subtitle">
              {replaceTemplate(
                t(props.language, {
                  es: "Contanos cómo fue trabajar con {name}. Tu opinión ayuda a otras personas a elegir.",
                  en: "Tell us what it was like working with {name}. Your feedback helps others choose.",
                  pt: "Conte como foi trabalhar com {name}. Sua opinião ajuda outras pessoas a escolher."
                }),
                { name: props.pending.professionalName }
              )}
            </p>
          </div>
          <button type="button" className="matching-flow-close" onClick={props.onClose} aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}>
            ×
          </button>
        </header>

        <div className="professional-review-stars" role="radiogroup" aria-label={t(props.language, { es: "Calificación", en: "Rating", pt: "Avaliação" })}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              className={`professional-review-star ${activeRating >= value ? "active" : ""}`}
              aria-checked={rating === value}
              role="radio"
              onMouseEnter={() => setHoverRating(value)}
              onMouseLeave={() => setHoverRating(0)}
              onFocus={() => setHoverRating(value)}
              onBlur={() => setHoverRating(0)}
              onClick={() => setRating(value)}
            >
              ★
            </button>
          ))}
        </div>

        <label className="professional-review-comment-label">
          <span>{t(props.language, { es: "Comentario (opcional)", en: "Comment (optional)", pt: "Comentário (opcional)" })}</span>
          <textarea
            rows={4}
            maxLength={2000}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={t(props.language, {
              es: "¿Qué destacarías de este profesional?",
              en: "What would you highlight about this therapist?",
              pt: "O que você destacaria deste profissional?"
            })}
          />
        </label>

        {error ? <p className="error-text professional-review-error">{error}</p> : null}

        <footer className="matching-flow-footer professional-review-footer">
          <button type="button" className="matching-flow-secondary" onClick={props.onClose} disabled={submitting}>
            {t(props.language, { es: "Ahora no", en: "Not now", pt: "Agora não" })}
          </button>
          <button type="button" className="matching-flow-primary" onClick={() => void handleSubmit()} disabled={!canSubmit}>
            {submitting
              ? t(props.language, { es: "Enviando…", en: "Sending…", pt: "Enviando…" })
              : t(props.language, { es: "Enviar opinión", en: "Submit review", pt: "Enviar avaliação" })}
          </button>
        </footer>
      </section>
    </div>
  );
}
