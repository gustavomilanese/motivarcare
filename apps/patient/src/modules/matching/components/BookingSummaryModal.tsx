import { type SyntheticEvent } from "react";
import { formatDateWithLocale, textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import type { Market } from "@therapy/types";
import { professionalPhotoSrc } from "../../app/services/api";
import { effectiveSessionListMajorUnits, formatSessionListMajorPrice } from "../lib/sessionListPrice";
import type { MatchCardProfessional, MatchTimeSlot } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function BookingSummaryModal(props: {
  language: AppLanguage;
  patientMarket: Market;
  timezone: string;
  professional: MatchCardProfessional;
  slot: MatchTimeSlot;
  onBack: () => void;
  onClose: () => void;
  onContinue: () => void;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
}) {
  const listMajor = effectiveSessionListMajorUnits(props.professional, props.patientMarket);
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

  const reviewsLabel = t(props.language, {
    es: "opiniones",
    en: "reviews",
    pt: "avaliacoes"
  });

  return (
    <div className="matching-flow-backdrop" role="presentation" onClick={props.onClose}>
      <section className="matching-flow-modal summary-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header className="matching-flow-header">
          <button type="button" className="matching-flow-back-button" onClick={props.onBack}>
            ←
          </button>
          <div>
            <h3>{t(props.language, { es: "Resumen de reserva", en: "Booking summary", pt: "Resumo da reserva" })}</h3>
          </div>
          <button type="button" className="matching-flow-close" onClick={props.onClose}>
            ×
          </button>
        </header>

        <section className="summary-compact-card">
          <div className="summary-compact-prof">
            <img
              src={professionalPhotoSrc(props.professional.photoUrl)}
              alt={props.professional.fullName}
              onError={props.onImageFallback}
            />
            <div>
              <h4>{props.professional.fullName}</h4>
              <small>
                ★ {props.professional.ratingAverage ? props.professional.ratingAverage.toFixed(1) : "—"} ·{" "}
                {props.professional.reviewsCount} {reviewsLabel}
              </small>
            </div>
          </div>

          <div className="summary-compact-row">
            <span>{t(props.language, { es: "Horario", en: "Time", pt: "Horario" })}</span>
            <strong>{dateLabel} · {timeRange}</strong>
          </div>

          <div className="summary-compact-row total">
            <span>{t(props.language, { es: "A pagar", en: "To pay", pt: "A pagar" })}</span>
            <strong>{formatSessionListMajorPrice(props.patientMarket, listMajor, props.language)}</strong>
          </div>
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
