import { formatDateWithLocale, textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import type { MatchCardProfessional, MatchTimeSlot } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatAmount(value: number | null, language: AppLanguage): string {
  if (value === null) {
    return t(language, { es: "A confirmar", en: "To be confirmed", pt: "A confirmar" });
  }
  return `$${value.toFixed(2)} USD`;
}

export function BookingSummaryModal(props: {
  language: AppLanguage;
  timezone: string;
  professional: MatchCardProfessional;
  slot: MatchTimeSlot;
  onBack: () => void;
  onClose: () => void;
  onContinue: () => void;
}) {
  const dateLabel = formatDateWithLocale({
    value: props.slot.startsAt,
    language: props.language,
    timeZone: props.timezone,
    options: {
      weekday: "long",
      day: "numeric",
      month: "long"
    }
  });
  const timeRange = `${formatDateWithLocale({
    value: props.slot.startsAt,
    language: props.language,
    timeZone: props.timezone,
    options: { hour: "2-digit", minute: "2-digit", hour12: false }
  })} - ${formatDateWithLocale({
    value: props.slot.endsAt,
    language: props.language,
    timeZone: props.timezone,
    options: { hour: "2-digit", minute: "2-digit", hour12: false }
  })}`;

  return (
    <div className="matching-flow-backdrop" role="presentation" onClick={props.onClose}>
      <section className="matching-flow-modal summary-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header className="matching-flow-header">
          <button type="button" className="matching-flow-back-button" onClick={props.onBack}>
            ←
          </button>
          <div>
            <h3>{t(props.language, { es: "Resumen de reserva", en: "Booking summary", pt: "Resumo da reserva" })}</h3>
            <p>{t(props.language, { es: "Revisa antes de pagar", en: "Review before paying", pt: "Revise antes de pagar" })}</p>
          </div>
          <button type="button" className="matching-flow-close" onClick={props.onClose}>
            ×
          </button>
        </header>

        <section className="summary-professional-card">
          <img src={props.professional.photoUrl ?? "/images/prof-emma.svg"} alt={props.professional.fullName} />
          <div>
            <h4>{props.professional.fullName}</h4>
            <p>{props.professional.title}</p>
            <small>
              ★ {props.professional.ratingAverage ? props.professional.ratingAverage.toFixed(1) : "—"} ·{" "}
              {props.professional.reviewsCount} {t(props.language, { es: "opiniones", en: "reviews", pt: "avaliacoes" })}
            </small>
          </div>
        </section>

        <section className="summary-session-card">
          <h5>{t(props.language, { es: "Sesión de prueba", en: "Trial session", pt: "Sessao teste" })}</h5>
          <p>
            <strong>{dateLabel}</strong> · {timeRange}
          </p>
          <p>{replaceTimezoneNote(props.language, props.timezone)}</p>
        </section>

        <section className="summary-price-card">
          <div>
            <span>{t(props.language, { es: "A pagar", en: "To pay", pt: "A pagar" })}</span>
            <strong>{formatAmount(props.professional.sessionPriceUsd, props.language)}</strong>
          </div>
          <p>
            {t(props.language, {
              es: "Puedes cancelar o reprogramar con 24 horas de anticipación.",
              en: "You can cancel or reschedule up to 24 hours before the session.",
              pt: "Voce pode cancelar ou reagendar com ate 24 horas de antecedencia."
            })}
          </p>
        </section>

        <footer className="matching-flow-footer">
          <button type="button" className="matching-flow-primary" onClick={props.onContinue}>
            {t(props.language, { es: "Ir al pago", en: "Go to payment", pt: "Ir para pagamento" })}
          </button>
        </footer>
      </section>
    </div>
  );
}

function replaceTimezoneNote(language: AppLanguage, timezone: string): string {
  return t(language, {
    es: `La fecha y hora se muestran en tu zona horaria: ${timezone}.`,
    en: `Date and time are shown in your timezone: ${timezone}.`,
    pt: `Data e horario sao exibidos no seu fuso horario: ${timezone}.`
  });
}
