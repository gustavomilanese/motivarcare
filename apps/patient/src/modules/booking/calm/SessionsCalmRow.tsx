import { type SyntheticEvent } from "react";
import { bookingJoinUrl, canPatientRescheduleBooking, textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { findProfessionalById } from "../../app/lib/professionals";
import { professionalAccessibleName } from "../../app/lib/professionalDisplayName";
import { professionalPhotoSrc } from "../../app/services/api";
import type { Booking, Professional } from "../../app/types";
import { IconVideo } from "../../home/calm/calmIcons";
import { calmGivenName, isSameZonedDay } from "../../home/calm/calmHomeFormat";
import { formatSessionDateOnly, formatSessionTimeOnly } from "../lib/sessionDateFormat";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function SessionsCalmRow(props: {
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
  const today = isSameZonedDay(new Date(props.booking.startsAt), props.now, props.timeZone);
  const join = bookingJoinUrl(props.booking);
  const canMove = canPatientRescheduleBooking(props.booking.startsAt, professional?.cancellationHours);

  return (
    <article className={`sessions-calm-row${today ? " is-today" : ""}`}>
      <img src={professionalPhotoSrc(props.photoUrl)} alt="" width={48} height={48} onError={props.onImageFallback} />
      <div>
        <b>{name}</b>
        <span>
          {today
            ? t(props.language, { es: "Hoy", en: "Today", pt: "Hoje" })
            : formatSessionDateOnly({ isoDate: props.booking.startsAt, timezone: props.timeZone, language: props.language })}
          {" · "}
          {formatSessionTimeOnly({ isoDate: props.booking.startsAt, timezone: props.timeZone, language: props.language })}
        </span>
      </div>
      <div className="sessions-calm-row-actions">
        {join ? (
          <a className="sessions-calm-join" href={join}>
            <IconVideo size={18} />
            {t(props.language, { es: "Entrar", en: "Join", pt: "Entrar" })}
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
