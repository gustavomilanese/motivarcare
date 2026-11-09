import { type SyntheticEvent } from "react";
import { bookingJoinUrl, canPatientRescheduleBooking, textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { professionalAccessibleName } from "../../app/lib/professionalDisplayName";
import { findProfessionalById } from "../../app/lib/professionals";
import { professionalPhotoSrc } from "../../app/services/api";
import type { Booking, Professional } from "../../app/types";
import { IconVideo } from "../../home/calm/calmIcons";
import {
  formatClock,
  formatWeekday,
  isSameZonedDay,
  sessionChipLabel,
  sessionTiming
} from "../../home/calm/calmHomeFormat";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Próxima sesión compacta · sin meta repetida del home. */
export function SessionsCalmNext(props: {
  booking: Booking;
  language: AppLanguage;
  timeZone: string;
  now: Date;
  professionals: Professional[];
  photoUrl: string | null;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onReschedule: (booking: Booking) => void;
}) {
  const professional = findProfessionalById(props.booking.professionalId, props.professionals);
  const name = professional ? professionalAccessibleName(professional) : "";
  const timing = sessionTiming(props.booking.startsAt, props.booking.endsAt, props.now, props.timeZone);
  const urgent = timing.kind === "live" || timing.kind === "soon";
  const sameDay = isSameZonedDay(new Date(props.booking.startsAt), props.now, props.timeZone);
  const clock = formatClock(props.booking.startsAt, props.timeZone, props.language);
  const when = sameDay
    ? t(props.language, { es: `Hoy · ${clock}`, en: `Today · ${clock}`, pt: `Hoje · ${clock}` })
    : `${formatWeekday(props.booking.startsAt, props.timeZone, props.language)} · ${clock}`;
  const join = bookingJoinUrl(props.booking);
  const canMove = canPatientRescheduleBooking(props.booking.startsAt, professional?.cancellationHours);

  return (
    <article className={`sessions-calm-next${urgent ? " is-urgent" : ""}`}>
      <p className={`sessions-calm-next-chip${urgent ? " is-live" : ""}`}>
        <span aria-hidden="true" />
        {sessionChipLabel(timing, props.language)}
      </p>
      <div className="sessions-calm-next-body">
        <img src={professionalPhotoSrc(props.photoUrl)} alt="" width={44} height={44} onError={props.onImageFallback} />
        <div className="sessions-calm-next-copy">
          <h2 className="sessions-calm-next-when">{when}</h2>
          {name ? <p className="sessions-calm-next-name">{name}</p> : null}
        </div>
      </div>
      <div className="sessions-calm-next-actions">
        {join ? (
          <a className="sessions-calm-join" href={join} target="_blank" rel="noopener noreferrer">
            <IconVideo size={18} />
            {t(props.language, { es: "Entrar", en: "Join", pt: "Entrar" })}
          </a>
        ) : (
          <button type="button" className="sessions-calm-join" disabled>
            {t(props.language, {
              es: "El enlace llega por mail",
              en: "The link arrives by email",
              pt: "O link chega por e-mail"
            })}
          </button>
        )}
        {canMove ? (
          <button type="button" className="sessions-calm-reschedule" onClick={() => props.onReschedule(props.booking)}>
            {t(props.language, { es: "Reprogramar", en: "Reschedule", pt: "Reagendar" })}
          </button>
        ) : null}
      </div>
    </article>
  );
}
