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
  sessionLengthMinutes,
  sessionTiming,
  timezoneCaption
} from "../../home/calm/calmHomeFormat";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Card principal de Tus sesiones · mismo criterio que home (sin Ver detalle). */
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
    ? t(props.language, { es: `Hoy, ${clock}`, en: `Today, ${clock}`, pt: `Hoje, ${clock}` })
    : `${formatWeekday(props.booking.startsAt, props.timeZone, props.language)}, ${clock}`;
  const minutes = sessionLengthMinutes(props.booking.startsAt, props.booking.endsAt);
  const join = bookingJoinUrl(props.booking);
  const canMove = canPatientRescheduleBooking(props.booking.startsAt, professional?.cancellationHours);
  const meta = minutes
    ? t(props.language, {
        es: `Videollamada de ${minutes} min · ${timezoneCaption(props.timeZone, props.language, props.now)}`,
        en: `${minutes}-min video call · ${timezoneCaption(props.timeZone, props.language, props.now)}`,
        pt: `Videochamada de ${minutes} min · ${timezoneCaption(props.timeZone, props.language, props.now)}`
      })
    : t(props.language, {
        es: `Videollamada · ${timezoneCaption(props.timeZone, props.language, props.now)}`,
        en: `Video call · ${timezoneCaption(props.timeZone, props.language, props.now)}`,
        pt: `Videochamada · ${timezoneCaption(props.timeZone, props.language, props.now)}`
      });

  return (
    <article className={`sessions-calm-next${urgent ? " is-urgent" : ""}`}>
      <p className={`sessions-calm-next-chip${urgent ? " is-live" : ""}`}>
        <span aria-hidden="true" />
        {sessionChipLabel(timing, props.language)}
      </p>
      <div>
        <h2 className="sessions-calm-next-when">{when}</h2>
        <p className="sessions-calm-next-meta">{meta}</p>
      </div>
      <div className="sessions-calm-next-person">
        <img src={professionalPhotoSrc(props.photoUrl)} alt="" width={48} height={48} onError={props.onImageFallback} />
        <div>
          <strong>{name}</strong>
        </div>
      </div>
      <div className="sessions-calm-next-actions">
        {join ? (
          <a className="sessions-calm-join" href={join} target="_blank" rel="noopener noreferrer">
            <IconVideo size={18} />
            {t(props.language, { es: "Entrar a la sesión", en: "Join session", pt: "Entrar na sessão" })}
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
