import type { SyntheticEvent } from "react";
import { canPatientRescheduleBooking, textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { professionalAccessibleName } from "../../app/lib/professionalDisplayName";
import { professionalPhotoSrc } from "../../app/services/api";
import type { Booking, Professional } from "../../app/types";
import { calmGivenName, formatClock, formatWeekdayDate, isSameZonedDay } from "./calmHomeFormat";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Fila compacta de sesión (próximas reservas). */
export function CalmUpcomingRow(props: {
  booking: Booking;
  language: AppLanguage;
  timeZone: string;
  now: Date;
  professional: Professional | null;
  photoUrl: string | null;
  /** `inline`: horario + profesional en una línea (card del riel). */
  layout?: "stack" | "inline";
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onOpen: (bookingId: string) => void;
  onReschedule: (bookingId: string) => void;
}) {
  const name = props.professional ? professionalAccessibleName(props.professional) : "";
  const given = props.professional ? calmGivenName(props.professional) : "";
  const proLabel = name || given;
  const today = isSameZonedDay(new Date(props.booking.startsAt), props.now, props.timeZone);
  const clock = formatClock(props.booking.startsAt, props.timeZone, props.language);
  const when = today
    ? t(props.language, { es: `Hoy · ${clock}`, en: `Today · ${clock}`, pt: `Hoje · ${clock}` })
    : `${formatWeekdayDate(props.booking.startsAt, props.timeZone, props.language)} · ${clock}`;
  const canMove = canPatientRescheduleBooking(props.booking.startsAt, props.professional?.cancellationHours);
  const inline = props.layout === "inline";

  return (
    <article className={`calm-upcoming-row${today ? " is-today" : ""}${inline ? " is-inline" : ""}`}>
      <button type="button" className="calm-upcoming-row-main" onClick={() => props.onOpen(props.booking.id)}>
        <img
          src={professionalPhotoSrc(props.photoUrl)}
          alt=""
          width={44}
          height={44}
          onError={props.onImageFallback}
        />
        <div className={`calm-upcoming-row-copy${inline ? " is-inline" : ""}`}>
          <b>{when}</b>
          {inline && proLabel ? <span className="calm-upcoming-row-sep" aria-hidden="true">·</span> : null}
          {proLabel ? <span>{proLabel}</span> : null}
        </div>
      </button>
      {canMove ? (
        <button type="button" className="calm-text-link" onClick={() => props.onReschedule(props.booking.id)}>
          {t(props.language, { es: "Reprogramar", en: "Reschedule", pt: "Reagendar" })}
        </button>
      ) : null}
    </article>
  );
}
