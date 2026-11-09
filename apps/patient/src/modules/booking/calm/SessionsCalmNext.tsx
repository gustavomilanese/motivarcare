import { type SyntheticEvent } from "react";
import { bookingJoinUrl, canPatientRescheduleBooking, textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { professionalAccessibleName } from "../../app/lib/professionalDisplayName";
import { findProfessionalById } from "../../app/lib/professionals";
import { professionalPhotoSrc } from "../../app/services/api";
import type { Booking, Professional } from "../../app/types";
import { IconVideo } from "../../home/calm/calmIcons";
import {
  calmGivenName,
  formatClock,
  formatWeekday,
  sessionLengthMinutes,
  sessionTiming,
  timezoneCaption
} from "../../home/calm/calmHomeFormat";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Próxima sesión: tarjeta salvia de agenda.html (`.tarjeta.salvia.ag-hoy`). */
export function SessionsCalmNext(props: {
  booking: Booking;
  language: AppLanguage;
  timeZone: string;
  now: Date;
  professionals: Professional[];
  photoUrl: string | null;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onOpenDetail: (bookingId: string) => void;
  onReschedule: (booking: Booking) => void;
}) {
  const professional = findProfessionalById(props.booking.professionalId, props.professionals);
  const name = professional ? professionalAccessibleName(professional) : "";
  const given = professional ? calmGivenName(professional) : "";
  const timing = sessionTiming(props.booking.startsAt, props.booking.endsAt, props.now, props.timeZone);
  const urgent = timing.kind !== "later";
  const clock = formatClock(props.booking.startsAt, props.timeZone, props.language);
  const when = `${formatWeekday(props.booking.startsAt, props.timeZone, props.language)}, ${clock}`;
  const minutes = sessionLengthMinutes(props.booking.startsAt, props.booking.endsAt);
  const join = bookingJoinUrl(props.booking);
  const canMove = canPatientRescheduleBooking(props.booking.startsAt, professional?.cancellationHours);
  const detail = minutes
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
    <article className="sessions-calm-next">
      <img src={professionalPhotoSrc(props.photoUrl)} alt="" width={40} height={40} onError={props.onImageFallback} />
      <div className="sessions-calm-next-copy">
        <strong>{when}</strong>
        <span>
          {name}
          {" · "}
          {detail}
        </span>
      </div>
      <div className="sessions-calm-next-actions">
        {join ? (
          <a className={urgent ? "sessions-calm-join" : "sessions-calm-join is-outline"} href={join}>
            <IconVideo size={18} />
            {t(props.language, { es: "Entrar a la sesión", en: "Join session", pt: "Entrar na sessão" })}
          </a>
        ) : null}
        <button type="button" className="sessions-calm-link" onClick={() => props.onOpenDetail(props.booking.id)}>
          {t(props.language, { es: "Ver detalle", en: "View details", pt: "Ver detalhe" })}
        </button>
        {canMove ? (
          <button type="button" className="sessions-calm-link" onClick={() => props.onReschedule(props.booking)}>
            {t(props.language, {
              es: given ? `Reprogramar con ${given}` : "Reprogramar",
              en: given ? `Reschedule with ${given}` : "Reschedule",
              pt: given ? `Reagendar com ${given}` : "Reagendar"
            })}
          </button>
        ) : null}
      </div>
    </article>
  );
}
