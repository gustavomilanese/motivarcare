import { useMemo, type SyntheticEvent } from "react";
import { useNavigate } from "react-router-dom";
import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { findProfessionalById } from "../../app/lib/professionals";
import type { Booking, Professional } from "../../app/types";
import { CalmUpcomingRow } from "./CalmUpcomingRow";
import { calendarWeek, weekSessions } from "./calmWeek";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Web: máx. 2 filas para no empujar el riel; el resto va a Sesiones. */
const WEEK_LIST_LIMIT = 2;

/** Card compacta (estilo créditos): sesiones de la semana calendario actual. */
export function CalmWeekAgenda(props: {
  language: AppLanguage;
  timeZone: string;
  now: Date;
  bookings: Booking[];
  professionals: Professional[];
  photoMap: Record<string, string>;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onOpenBooking: (bookingId: string) => void;
  onRescheduleBooking: (bookingId: string) => void;
}) {
  const navigate = useNavigate();
  const rows = useMemo(() => {
    const days = calendarWeek(props.now, props.timeZone);
    return weekSessions(props.bookings, days, props.timeZone).flat();
  }, [props.bookings, props.now, props.timeZone]);

  if (rows.length === 0) return null;

  const visible = rows.slice(0, WEEK_LIST_LIMIT);
  const count = rows.length;
  const label =
    count === 1
      ? t(props.language, { es: "sesión esta semana", en: "session this week", pt: "sessão esta semana" })
      : t(props.language, { es: "sesiones esta semana", en: "sessions this week", pt: "sessões esta semana" });

  return (
    <article className="calm-card calm-week-sessions" aria-labelledby="calm-week-sessions-title">
      <div className="calm-week-sessions-top">
        <strong className="calm-week-sessions-number">{count}</strong>
        <b id="calm-week-sessions-title" className="calm-week-sessions-label">
          {label}
        </b>
        {count > WEEK_LIST_LIMIT ? (
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
