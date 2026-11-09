import { type SyntheticEvent } from "react";
import { canPatientRescheduleBooking, textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { findProfessionalById } from "../../app/lib/professionals";
import { professionalAccessibleName } from "../../app/lib/professionalDisplayName";
import { professionalPhotoSrc } from "../../app/services/api";
import type { Booking, Professional } from "../../app/types";
import { calmGivenName, formatClock, formatWeekday, isSameZonedDay } from "../../home/calm/calmHomeFormat";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Fila de próximas · mismo criterio que home: toque abre detalle, solo Reprogramar a la vista. */
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
  const clock = formatClock(props.booking.startsAt, props.timeZone, props.language);
  const when = today
    ? t(props.language, { es: `Hoy · ${clock}`, en: `Today · ${clock}`, pt: `Hoje · ${clock}` })
    : `${formatWeekday(props.booking.startsAt, props.timeZone, props.language)} · ${clock}`;
  const canMove = canPatientRescheduleBooking(props.booking.startsAt, professional?.cancellationHours);

  return (
    <article className={`sessions-calm-row${today ? " is-today" : ""}`}>
      <button type="button" className="sessions-calm-row-main" onClick={() => props.onOpenDetail(props.booking.id)}>
        <img
          src={professionalPhotoSrc(props.photoUrl)}
          alt=""
          width={44}
          height={44}
          onError={props.onImageFallback}
        />
        <div>
          <b>{when}</b>
          <span>{name || given}</span>
        </div>
      </button>
      {canMove ? (
        <button type="button" className="sessions-calm-row-link" onClick={() => props.onReschedule(props.booking)}>
          {t(props.language, { es: "Reprogramar", en: "Reschedule", pt: "Reagendar" })}
        </button>
      ) : null}
    </article>
  );
}
