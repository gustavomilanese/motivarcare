import { useMemo, type SyntheticEvent } from "react";
import { useNavigate } from "react-router-dom";
import { canPatientRescheduleBooking, textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { filterUpcomingPatientBookings } from "@therapy/patient-core";
import { findProfessionalById } from "../../app/lib/professionals";
import { professionalAccessibleName } from "../../app/lib/professionalDisplayName";
import { professionalPhotoSrc } from "../../app/services/api";
import type { Booking, Professional } from "../../app/types";
import { calmGivenName, formatClock, formatWeekday, isSameZonedDay } from "./calmHomeFormat";
import { IconFlecha } from "./calmIcons";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function CalmUpcomingRow(props: {
  booking: Booking;
  language: AppLanguage;
  timeZone: string;
  now: Date;
  professional: Professional | null;
  photoUrl: string | null;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onOpen: (bookingId: string) => void;
  onReschedule: (bookingId: string) => void;
}) {
  const name = props.professional ? professionalAccessibleName(props.professional) : "";
  const given = props.professional ? calmGivenName(props.professional) : "";
  const today = isSameZonedDay(new Date(props.booking.startsAt), props.now, props.timeZone);
  const clock = formatClock(props.booking.startsAt, props.timeZone, props.language);
  const when = today
    ? t(props.language, { es: `Hoy · ${clock}`, en: `Today · ${clock}`, pt: `Hoje · ${clock}` })
    : `${formatWeekday(props.booking.startsAt, props.timeZone, props.language)} · ${clock}`;
  const canMove = canPatientRescheduleBooking(props.booking.startsAt, props.professional?.cancellationHours);

  return (
    <article className={`calm-upcoming-row${today ? " is-today" : ""}`}>
      <button type="button" className="calm-upcoming-row-main" onClick={() => props.onOpen(props.booking.id)}>
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
        <button type="button" className="calm-text-link" onClick={() => props.onReschedule(props.booking.id)}>
          {t(props.language, { es: "Reprogramar", en: "Reschedule", pt: "Reagendar" })}
        </button>
      ) : null}
    </article>
  );
}

export function CalmUpcomingList(props: {
  language: AppLanguage;
  timeZone: string;
  now: Date;
  bookings: Booking[];
  professionals: Professional[];
  photoMap: Record<string, string>;
  /** La sesión del hero no se repite en la lista. */
  excludeBookingId?: string | null;
  limit?: number;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onOpenBooking: (bookingId: string) => void;
  onRescheduleBooking: (bookingId: string) => void;
}) {
  const navigate = useNavigate();
  const limit = props.limit ?? 3;
  const rows = useMemo(() => {
    const exclude = props.excludeBookingId?.trim() ?? "";
    return filterUpcomingPatientBookings(props.bookings, props.now.getTime())
      .filter((booking) => booking.id !== exclude)
      .slice(0, limit);
  }, [props.bookings, props.excludeBookingId, props.now, limit]);

  if (rows.length === 0) return null;

  return (
    <section className="calm-upcoming" aria-labelledby="calm-upcoming-title">
      <header className="calm-upcoming-head">
        <h2 id="calm-upcoming-title">
          {t(props.language, { es: "Próximas", en: "Upcoming", pt: "Próximas" })}
        </h2>
        <button type="button" className="calm-text-link" onClick={() => navigate("/sessions")}>
          {t(props.language, { es: "Ver todas", en: "See all", pt: "Ver todas" })}
          <IconFlecha size={16} />
        </button>
      </header>
      <div className="calm-upcoming-list">
        {rows.map((booking) => {
          const professional = findProfessionalById(booking.professionalId, props.professionals);
          return (
            <CalmUpcomingRow
              key={booking.id}
              booking={booking}
              language={props.language}
              timeZone={props.timeZone}
              now={props.now}
              professional={professional}
              photoUrl={professional ? props.photoMap[professional.id] ?? null : null}
              onImageFallback={props.onImageFallback}
              onOpen={props.onOpenBooking}
              onReschedule={props.onRescheduleBooking}
            />
          );
        })}
      </div>
    </section>
  );
}
