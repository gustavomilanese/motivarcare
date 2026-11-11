import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { professionalGivenName } from "../../app/lib/professionalDisplayName";
import type { Professional, TimeSlot } from "../../app/types";
import { upcomingProfessionalSlots } from "./calmHomeCase";
import { CalmFirstSessionNextSteps } from "./CalmFirstSessionNextSteps";
import { CalmFirstSessionSlotList } from "./CalmFirstSessionSlotList";
import { CalmSessionCreditsBadge } from "./CalmSessionCreditsBadge";
import { timezoneCaption } from "./calmHomeFormat";
import { IconSesiones } from "./calmIcons";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function CalmFirstSessionCard(props: {
  language: AppLanguage;
  timeZone: string;
  now: Date;
  professional: Professional;
  availableSessions: number;
  onBook: () => void;
  /** Abre la reserva con este horario ya elegido. */
  onBookSlot?: (slot: TimeSlot) => void;
  selectedStartsAt?: string | null;
  /** Misma acción que `CalmSessionsBalance` en home asignada. */
  onBuyPackage?: () => void;
}) {
  const slots = upcomingProfessionalSlots(props.professional.slots, props.now);
  const given = professionalGivenName(props.professional);
  const needsPurchase = props.availableSessions <= 0;
  const primaryAction = needsPurchase && props.onBuyPackage ? props.onBuyPackage : props.onBook;

  const onSelectProposed = (slot: TimeSlot) => {
    if (needsPurchase && props.onBuyPackage) {
      props.onBuyPackage();
      return;
    }
    if (props.onBookSlot) {
      props.onBookSlot(slot);
      return;
    }
    props.onBook();
  };

  return (
    <article className="calm-card calm-session calm-first-session">
      <svg className="calm-session-blob" viewBox="0 0 500 520" aria-hidden="true">
        <path d="M438.7 372.7 C410.4 424.2 340.8 463.3 284.5 475.3 C228.1 487.3 140.1 482.6 100.4 444.8 C60.7 407.0 42.8 312.5 46.0 248.6 C49.2 184.7 76.7 94.1 119.7 61.4 C162.7 28.6 248.1 34.5 303.8 52.0 C359.6 69.4 431.7 112.8 454.2 166.3 C476.7 219.7 467.0 321.2 438.7 372.7Z" fill="#E7F1EA" />
        <circle cx="380" cy="150" r="14" fill="#F5C33B" />
      </svg>
      <div className="calm-session-top">
        <p className="calm-chip calm-first-session__chip">
          {t(props.language, { es: "Tu próximo paso", en: "Your next step", pt: "Seu próximo passo" })}
        </p>
        <CalmSessionCreditsBadge language={props.language} available={props.availableSessions} />
      </div>
      <div>
        <h2 className="calm-session-when">
          {needsPurchase
            ? t(props.language, {
                es: "Comprá y reservá tu primera sesión",
                en: "Buy and book your first session",
                pt: "Compre e reserve sua primeira sessão"
              })
            : t(props.language, {
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
      {slots.length > 0 ? (
        <CalmFirstSessionSlotList
          language={props.language}
          timeZone={props.timeZone}
          slots={slots}
          selectedStartsAt={props.selectedStartsAt}
          onSelectSlot={onSelectProposed}
          onSeeMore={primaryAction}
        />
      ) : null}
      <div className="calm-session-actions calm-first-session__actions">
        <button className="calm-btn calm-btn--yellow calm-btn--large calm-first-session__cta" type="button" onClick={primaryAction}>
          <IconSesiones size={18} />
          {needsPurchase ? (
            t(props.language, { es: "Comprar", en: "Buy", pt: "Comprar" })
          ) : (
            <>
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
            </>
          )}
        </button>
        {props.onBuyPackage ? (
          <CalmFirstSessionNextSteps language={props.language} onBuyPackage={props.onBuyPackage} />
        ) : null}
      </div>
    </article>
  );
}
