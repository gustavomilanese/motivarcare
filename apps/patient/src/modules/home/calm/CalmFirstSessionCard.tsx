import type { SyntheticEvent } from "react";
import {
  type AppLanguage,
  type DisplayFxRates,
  type LocalizedText,
  type SupportedCurrency,
  textByLanguage
} from "@therapy/i18n-config";
import { professionalAccessibleName } from "../../app/lib/professionalDisplayName";
import type { Professional } from "../../app/types";
import { formatSessionListMajorPrice } from "../../matching/lib/sessionListPrice";
import { upcomingProfessionalSlots } from "./calmHomeCase";
import { CalmPersonHit } from "./CalmPersonHit";
import { formatClock, formatShortDate, timezoneCaption } from "./calmHomeFormat";
import { IconSesiones } from "./calmIcons";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function CalmFirstSessionCard(props: {
  language: AppLanguage;
  timeZone: string;
  now: Date;
  professional: Professional;
  photoUrl: string | null;
  currency: SupportedCurrency;
  fxRates?: DisplayFxRates;
  residencyCountry: string | null;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onBook: () => void;
  /** Solo si no quedan créditos/prueba ni reservas: un paquete no se cambia a mitad. */
  canRequestChange: boolean;
  onRequestChange: () => void;
  onOpenProfile: () => void;
}) {
  const slots = upcomingProfessionalSlots(props.professional.slots, props.now);
  const name = professionalAccessibleName(props.professional);
  const given = name.split(" ")[0] || name;
  const priceLabel =
    props.professional.sessionPriceUsd && props.professional.sessionPriceUsd > 0
      ? formatSessionListMajorPrice(
          props.currency,
          props.professional.sessionPriceUsd,
          props.language,
          props.fxRates,
          props.residencyCountry
        )
      : "";
  const sessionMeta = priceLabel
    ? t(props.language, {
        es: `Sesión de 50 min · ${priceLabel}`,
        en: `50 min session · ${priceLabel}`,
        pt: `Sessão de 50 min · ${priceLabel}`
      })
    : t(props.language, {
        es: "Sesión de 50 min",
        en: "50 min session",
        pt: "Sessão de 50 min"
      });

  return (
    <article className="calm-card calm-session calm-first-session">
      <svg className="calm-session-blob" viewBox="0 0 500 520" aria-hidden="true">
        <path d="M438.7 372.7 C410.4 424.2 340.8 463.3 284.5 475.3 C228.1 487.3 140.1 482.6 100.4 444.8 C60.7 407.0 42.8 312.5 46.0 248.6 C49.2 184.7 76.7 94.1 119.7 61.4 C162.7 28.6 248.1 34.5 303.8 52.0 C359.6 69.4 431.7 112.8 454.2 166.3 C476.7 219.7 467.0 321.2 438.7 372.7Z" fill="#E7F1EA" />
        <circle cx="380" cy="150" r="14" fill="#F5C33B" />
      </svg>
      <p className="calm-chip calm-first-session__chip">
        {t(props.language, { es: "Tu próximo paso", en: "Your next step", pt: "Seu próximo passo" })}
      </p>
      <div className="calm-first-session__copy">
        <h2 className="calm-session-when">
          {t(props.language, {
            es: "Reservá tu primera sesión",
            en: "Book your first session",
            pt: "Reserve sua primeira sessão"
          })}
        </h2>
        <p className="calm-session-meta calm-first-session__meta">
          {slots.length > 0
            ? t(props.language, {
                es: `Próximos horarios libres de ${given}, en tu hora (${timezoneCaption(props.timeZone, props.language, props.now)})`,
                en: `${given}'s next open times, in your time (${timezoneCaption(props.timeZone, props.language, props.now)})`,
                pt: `Próximos horários de ${given}, no seu fuso (${timezoneCaption(props.timeZone, props.language, props.now)})`
              })
            : t(props.language, {
                es: "Elegí un horario en la agenda.",
                en: "Pick a time on the calendar.",
                pt: "Escolha um horário na agenda."
              })}
        </p>
      </div>
      <CalmPersonHit
        className="calm-first-session__person"
        name={name}
        meta={sessionMeta}
        metaClassName="calm-first-session__price"
        photoUrl={props.photoUrl}
        onImageFallback={props.onImageFallback}
        onOpenProfile={props.onOpenProfile}
      />
      {slots.length > 0 ? (
        <div className="calm-slot-row calm-first-session__slots">
          {slots.map((slot) => (
            <button key={slot.id} type="button" className="calm-slot" onClick={props.onBook}>
              {formatClock(slot.startsAt, props.timeZone, props.language)}
              <small>{formatShortDate(slot.startsAt, props.timeZone, props.language)}</small>
            </button>
          ))}
          <button type="button" className="calm-slot calm-slot--more" onClick={props.onBook}>
            {t(props.language, { es: "Ver más horarios", en: "See more times", pt: "Ver mais horários" })}
          </button>
        </div>
      ) : null}
      <div className="calm-session-actions calm-first-session__actions">
        <button className="calm-btn calm-btn--yellow calm-btn--large calm-first-session__cta" type="button" onClick={props.onBook}>
          <IconSesiones size={18} />
          <span className="calm-first-session__cta-desktop">
            {t(props.language, { es: "Reservar sesión", en: "Book a session", pt: "Reservar sessão" })}
          </span>
          <span className="calm-first-session__cta-mobile">
            {t(props.language, {
              es: "Ver todos los horarios",
              en: "See all available times",
              pt: "Ver todos os horários"
            })}
          </span>
        </button>
        {priceLabel ? (
          <p className="calm-first-session__pay-note">
            {t(props.language, {
              es: `Sesión de 50 min · ${priceLabel} · pagás al reservar`,
              en: `50 min session · ${priceLabel} · pay when you book`,
              pt: `Sessão de 50 min · ${priceLabel} · você paga ao reservar`
            })}
          </p>
        ) : null}
        {props.canRequestChange ? (
          <button type="button" className="calm-text-link calm-session-change-link" onClick={props.onRequestChange}>
            {t(props.language, {
              es: "Pedir un cambio de profesional",
              en: "Request a professional change",
              pt: "Pedir uma troca de profissional"
            })}
          </button>
        ) : null}
      </div>
    </article>
  );
}
