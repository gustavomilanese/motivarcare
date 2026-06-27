import { type SyntheticEvent, useEffect, useState } from "react";
import { formatDateWithLocale, textByLanguage, type AppLanguage, type DisplayFxRates, type LocalizedText, type SupportedCurrency } from "@therapy/i18n-config";
import type { Market } from "@therapy/types";
import { patientUsesDlocalCheckout } from "../../app/lib/patientDlocalCheckout";
import { professionalPhotoSrc } from "../../app/services/api";
import { MotivarCarePageLoader } from "../../app/components/MotivarCarePageLoader";
import { effectiveSessionListMajorUnits, formatSessionListMajorPrice } from "../lib/sessionListPrice";
import type { MatchCardProfessional, MatchTimeSlot } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function sessionDurationMinutes(slot: MatchTimeSlot, fallbackMinutes: number): number {
  const start = Date.parse(slot.startsAt);
  const end = Date.parse(slot.endsAt);
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
    return Math.round((end - start) / 60_000);
  }
  return fallbackMinutes;
}

export function BookingSummaryModal(props: {
  language: AppLanguage;
  patientMarket: Market;
  residencyCountry?: string | null;
  displayCurrency: SupportedCurrency;
  fxRates?: DisplayFxRates;
  timezone: string;
  professional: MatchCardProfessional;
  slot: MatchTimeSlot;
  holdExpiresAt?: string;
  continueLoading?: boolean;
  checkoutLoadingPhase?: "idle" | "creating" | "redirecting";
  error?: string;
  onChangeTime: () => void;
  onClose: () => void;
  onContinue: () => void;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
}) {
  const listMajor = effectiveSessionListMajorUnits(props.professional, props.patientMarket);
  const durationMinutes = sessionDurationMinutes(props.slot, props.professional.sessionDurationMinutes);
  const usesDlocalCheckout = patientUsesDlocalCheckout({
    patientMarket: props.patientMarket,
    residencyCountry: props.residencyCountry ?? null
  });
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!props.holdExpiresAt) {
      setHoldSecondsLeft(null);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.floor((Date.parse(props.holdExpiresAt!) - Date.now()) / 1000));
      setHoldSecondsLeft(remaining);
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [props.holdExpiresAt]);

  const holdMinutesLeft = holdSecondsLeft !== null ? Math.max(1, Math.ceil(holdSecondsLeft / 60)) : null;

  const weekdayDate = formatDateWithLocale({
    value: props.slot.startsAt,
    language: props.language,
    timeZone: props.timezone,
    options: {
      weekday: "long",
      day: "numeric",
      month: "long"
    }
  });
  const startTime = formatDateWithLocale({
    value: props.slot.startsAt,
    language: props.language,
    timeZone: props.timezone,
    options: { hour: "2-digit", minute: "2-digit", hour12: false }
  });
  const endTime = formatDateWithLocale({
    value: props.slot.endsAt,
    language: props.language,
    timeZone: props.timezone,
    options: { hour: "2-digit", minute: "2-digit", hour12: false }
  });

  const priceLabel = formatSessionListMajorPrice(
    props.displayCurrency,
    listMajor,
    props.language,
    props.fxRates,
    props.residencyCountry
  );

  return (
    <div className="matching-flow-backdrop trial-checkout-backdrop" role="presentation" onClick={props.onClose}>
      <section
        className="matching-flow-modal trial-checkout-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trial-checkout-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="trial-checkout-header">
          <button
            type="button"
            className="trial-checkout-back"
            onClick={() => props.onChangeTime()}
            aria-label={t(props.language, { es: "Elegir otro horario", en: "Choose another time", pt: "Escolher outro horario" })}
          >
            ←
          </button>
          <button
            type="button"
            className="trial-checkout-close"
            onClick={props.onClose}
            aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
          >
            ×
          </button>
        </header>

        <div className="trial-checkout-copy">
          <p className="trial-checkout-kicker">
            {t(props.language, { es: "Sesión de prueba", en: "Trial session", pt: "Sessao de teste" })}
          </p>
          <h3 id="trial-checkout-title">
            {t(props.language, {
              es: "Confirmá tu turno antes de pagar",
              en: "Confirm your slot before paying",
              pt: "Confirme seu horario antes de pagar"
            })}
          </h3>
          <p className="trial-checkout-lead">
            {t(props.language, {
              es: "Revisá que el horario te sirva. Guardamos este turno unos minutos para vos mientras completás el pago.",
              en: "Check that the time works for you. We hold this slot for a few minutes while you complete payment.",
              pt: "Revise se o horario lhe serve. Guardamos este turno por alguns minutos enquanto voce conclui o pagamento."
            })}
          </p>
          {holdMinutesLeft !== null && holdSecondsLeft !== null && holdSecondsLeft > 0 ? (
            <p className="trial-checkout-hold-note" role="status">
              {t(props.language, {
                es: `Turno reservado para vos · ${holdMinutesLeft} min restantes`,
                en: `Slot held for you · ${holdMinutesLeft} min left`,
                pt: `Horario reservado para voce · ${holdMinutesLeft} min restantes`
              })}
            </p>
          ) : null}
        </div>

        <article className="trial-checkout-appointment">
          <div className="trial-checkout-prof">
            <img
              src={professionalPhotoSrc(props.professional.photoUrl)}
              alt=""
              onError={props.onImageFallback}
            />
            <div>
              <span className="trial-checkout-prof-label">
                {t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}
              </span>
              <strong>{props.professional.fullName}</strong>
              {props.professional.title ? <small>{props.professional.title}</small> : null}
            </div>
          </div>

          <div className="trial-checkout-schedule">
            <div className="trial-checkout-schedule-block">
              <span className="trial-checkout-schedule-label">
                {t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}
              </span>
              <strong className="trial-checkout-date">{weekdayDate}</strong>
            </div>
            <div className="trial-checkout-schedule-block">
              <span className="trial-checkout-schedule-label">
                {t(props.language, { es: "Horario", en: "Time", pt: "Horario" })}
              </span>
              <strong className="trial-checkout-time">
                {startTime} – {endTime}
              </strong>
              <small>
                {t(props.language, {
                  es: `${durationMinutes} min · tu zona horaria`,
                  en: `${durationMinutes} min · your time zone`,
                  pt: `${durationMinutes} min · seu fuso horario`
                })}
              </small>
            </div>
          </div>
        </article>

        <div className="trial-checkout-price">
          <div>
            <span className="trial-checkout-price-label">
              {t(props.language, { es: "Total a pagar ahora", en: "Total due now", pt: "Total a pagar agora" })}
            </span>
            <small>
              {t(props.language, {
                es: "1 sesión · precio de lista",
                en: "1 session · list price",
                pt: "1 sessao · preco de lista"
              })}
            </small>
          </div>
          <strong className="trial-checkout-price-value">{priceLabel}</strong>
        </div>

        <p className="trial-checkout-provider-note" role="note">
          {t(props.language, {
            es: "En el siguiente paso elegís el medio de pago y confirmás el importe. El día y la hora elegidos quedan guardados acá en MotivarCare.",
            en: "In the next step you choose how to pay and confirm the amount. The date and time you picked stay saved here in MotivarCare.",
            pt: "Na proxima etapa voce escolhe como pagar e confirma o valor. A data e o horario escolhidos ficam guardados aqui no MotivarCare."
          })}
        </p>

        {props.error ? (
          <p className="trial-checkout-error" role="alert">
            {props.error}
          </p>
        ) : null}

        <footer className="trial-checkout-footer">
          <button
            type="button"
            className="matching-flow-primary trial-checkout-primary"
            disabled={props.continueLoading || holdSecondsLeft === 0}
            onClick={props.onContinue}
          >
            {props.continueLoading
              ? t(props.language, {
                  es: "Abriendo pago seguro...",
                  en: "Opening secure checkout...",
                  pt: "Abrindo pagamento seguro..."
                })
              : usesDlocalCheckout
                ? t(props.language, {
                    es: "Continuar al pago seguro",
                    en: "Continue to secure payment",
                    pt: "Continuar para pagamento seguro"
                  })
                : t(props.language, { es: "Ir al pago", en: "Go to payment", pt: "Ir para pagamento" })}
          </button>
          <button type="button" className="trial-checkout-secondary" onClick={() => props.onChangeTime()}>
            {t(props.language, {
              es: "Elegir otro horario",
              en: "Choose another time",
              pt: "Escolher outro horario"
            })}
          </button>
        </footer>

        {props.continueLoading ? (
          <div className="trial-checkout-loading" role="status" aria-live="polite">
            <MotivarCarePageLoader language={props.language} layout="inline" />
            <strong>
              {t(props.language, {
                es: "Preparando tu pago seguro…",
                en: "Preparing your secure checkout…",
                pt: "Preparando seu pagamento seguro…"
              })}
            </strong>
            <p>
              {props.checkoutLoadingPhase === "redirecting"
                ? t(props.language, {
                    es: "Completá el pago en la pantalla que se abre. Podés volver acá cuando termines.",
                    en: "Complete payment on the screen that opens. You can come back here when you’re done.",
                    pt: "Conclua o pagamento na tela que abrir. Voce pode voltar aqui quando terminar."
                  })
                : t(props.language, {
                    es: "Estamos preparando el pago con el horario que elegiste.",
                    en: "We’re setting up payment for the time you selected.",
                    pt: "Estamos preparando o pagamento para o horario escolhido."
                  })}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
