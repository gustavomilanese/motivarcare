import { useMemo, useState } from "react";
import {
  type AppLanguage,
  type LocalizedText,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import { McButton, McModal, McNotice, McTextarea } from "@therapy/ui";
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
    <McModal
      open={props.open && Boolean(props.pending)}
      title={title}
      onClose={props.onClose}
      closeDisabled={submitting}
      closeLabel={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
      footer={
        <>
          <McButton variant="ghost" disabled={submitting} onClick={props.onClose}>
            {t(props.language, { es: "Ahora no", en: "Not now", pt: "Agora não" })}
          </McButton>
          <McButton disabled={!canSubmit} onClick={() => void handleSubmit()}>
            {submitting
              ? t(props.language, { es: "Enviando…", en: "Sending…", pt: "Enviando…" })
              : t(props.language, { es: "Enviar opinión", en: "Submit review", pt: "Enviar avaliação" })}
          </McButton>
        </>
      }
    >
      {props.pending ? (
        <p>
          {replaceTemplate(
            t(props.language, {
              es: "Contanos cómo fue trabajar con {name}. Tu opinión ayuda a otras personas a elegir.",
              en: "Tell us what it was like working with {name}. Your feedback helps others choose.",
              pt: "Conte como foi trabalhar com {name}. Sua opinião ajuda outras pessoas a escolher."
            }),
            { name: props.pending.professionalName }
          )}
        </p>
      ) : null}

      <div
        className="professional-review-stars"
        role="radiogroup"
        aria-label={t(props.language, { es: "Calificación", en: "Rating", pt: "Avaliação" })}
      >
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

      <McTextarea
        label={t(props.language, { es: "Comentario (opcional)", en: "Comment (optional)", pt: "Comentário (opcional)" })}
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

      {error ? <McNotice>{error}</McNotice> : null}
    </McModal>
  );
}
