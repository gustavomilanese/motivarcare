import { useMemo, type SyntheticEvent } from "react";
import { useNavigate } from "react-router-dom";
import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { filterUpcomingPatientBookings } from "@therapy/patient-core";
import { findProfessionalById } from "../../app/lib/professionals";
import type { Booking, Professional } from "../../app/types";
import { CalmUpcomingRow } from "./CalmUpcomingRow";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Web: máx. 2 filas para no empujar el riel; el resto va a Sesiones. */
const NEXT_LIST_LIMIT = 2;

/** Card compacta (estilo créditos): próximas reservas del vínculo, no “esta semana”. */
export function CalmWeekAgenda(props: {
  language: AppLanguage;
  timeZone: string;
  now: Date;
  bookings: Booking[];
  assignedProfessionalId?: string | null;
  professionals: Professional[];
  photoMap: Record<string, string>;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onOpenBooking: (bookingId: string) => void;
  onRescheduleBooking: (bookingId: string) => void;
}) {
  const navigate = useNavigate();
  const rows = useMemo(
    () =>
      filterUpcomingPatientBookings(props.bookings, props.now.getTime(), {
        assignedProfessionalId: props.assignedProfessionalId
      }),
    [props.assignedProfessionalId, props.bookings, props.now]
  );

  if (rows.length === 0) return null;

  const visible = rows.slice(0, NEXT_LIST_LIMIT);
  const count = rows.length;
  const label =
    count === 1
      ? t(props.language, { es: "próxima reserva", en: "upcoming booking", pt: "próxima reserva" })
      : t(props.language, { es: "próximas reservas", en: "upcoming bookings", pt: "próximas reservas" });

  return (
    <article className="calm-card calm-week-sessions" aria-labelledby="calm-week-sessions-title">
      <div className="calm-week-sessions-top">
        <strong className="calm-week-sessions-number">{count}</strong>
        <b id="calm-week-sessions-title" className="calm-week-sessions-label">
          {label}
        </b>
        {count > NEXT_LIST_LIMIT ? (
          <button
            type="button"
            className="calm-text-link calm-week-sessions-month"
            onClick={() => navigate("/sessions")}
          >
            {t(props.language, { es: "Ver más", en: "See more", pt: "Ver mais" })}
          </button>
        ) : null}
      </div>
      <div className="calm-upcoming-list">
        {visible.map((booking) => {
          const professional = findProfessionalById(booking.professionalId, props.professionals);
          return (
            <CalmUpcomingRow
              key={booking.id}
              layout="inline"
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
    </article>
  );
}
