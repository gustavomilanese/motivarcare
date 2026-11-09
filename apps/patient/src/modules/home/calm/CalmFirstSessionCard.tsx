import type { SyntheticEvent } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { professionalAccessibleName } from "../../app/lib/professionalDisplayName";
import { professionalPhotoSrc } from "../../app/services/api";
import type { Professional } from "../../app/types";
import { upcomingProfessionalSlots } from "./calmHomeCase";
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
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onBook: () => void;
  /** Solo si no quedan créditos/prueba ni reservas: un paquete no se cambia a mitad. */
  canRequestChange: boolean;
  onRequestChange: () => void;
}) {
  const slots = upcomingProfessionalSlots(props.professional.slots, props.now);
  const name = professionalAccessibleName(props.professional);
  const given = name.split(" ")[0] || name;

  return (
    <article className="calm-card calm-session calm-first-session">
      <svg className="calm-session-blob" viewBox="0 0 500 520" aria-hidden="true">
        <path d="M438.7 372.7 C410.4 424.2 340.8 463.3 284.5 475.3 C228.1 487.3 140.1 482.6 100.4 444.8 C60.7 407.0 42.8 312.5 46.0 248.6 C49.2 184.7 76.7 94.1 119.7 61.4 C162.7 28.6 248.1 34.5 303.8 52.0 C359.6 69.4 431.7 112.8 454.2 166.3 C476.7 219.7 467.0 321.2 438.7 372.7Z" fill="#E7F1EA" />
        <circle cx="380" cy="150" r="14" fill="#F5C33B" />
      </svg>
      <p className="calm-chip">{t(props.language, { es: "Tu próximo paso", en: "Your next step", pt: "Seu próximo passo" })}</p>
      <div>
        <h2 className="calm-session-when">
          {t(props.language, { es: "Reservá tu primera sesión", en: "Book your first session", pt: "Reserve sua primeira sessão" })}
        </h2>
        <p className="calm-session-meta">
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
        <div className="calm-slot-row">
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
      <div className="calm-person">
        <span className="calm-person-ring">
          <img src={professionalPhotoSrc(props.photoUrl)} alt="" width={52} height={52} onError={props.onImageFallback} />
        </span>
        <div>
          <b>{name}</b>
        </div>
      </div>
      <div
        className={
          props.canRequestChange
            ? "calm-session-actions calm-session-actions--split"
            : "calm-session-actions"
        }
      >
        <button className="calm-btn calm-btn--yellow calm-btn--large" type="button" onClick={props.onBook}>
          <IconSesiones size={18} />
          {t(props.language, { es: "Reservar sesión", en: "Book a session", pt: "Reservar sessão" })}
        </button>
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
