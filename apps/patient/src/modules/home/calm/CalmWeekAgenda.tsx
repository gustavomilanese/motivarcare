import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import type { Booking, Professional } from "../../app/types";
import { findProfessionalById } from "../../app/lib/professionals";
import { calmGivenName, formatClock, isSameZonedDay } from "./calmHomeFormat";
import { calendarWeek, weekSessions } from "./calmWeek";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function dayNumber(day: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("es-AR", { day: "numeric", timeZone }).format(day);
  } catch {
    return new Intl.DateTimeFormat("es-AR", { day: "numeric", timeZone: "UTC" }).format(day);
  }
}

function dayName(day: Date, timeZone: string, language: AppLanguage): string {
  const locale = language === "en" ? "en-US" : language === "pt" ? "pt-BR" : "es-AR";
  try {
    return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone }).format(day).replace(".", "");
  } catch {
    return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(day).replace(".", "");
  }
}

export function CalmWeekAgenda(props: {
  language: AppLanguage;
  timeZone: string;
  now: Date;
  bookings: Booking[];
  professionals: Professional[];
  onOpenBooking: (bookingId: string) => void;
}) {
  const navigate = useNavigate();
  const days = useMemo(() => {
    const next = [...props.bookings]
      .filter((booking) => booking.status === "confirmed" && new Date(booking.startsAt).getTime() >= props.now.getTime() - 3_600_000)
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt))[0];
    return calendarWeek(next ? new Date(next.startsAt) : props.now, props.timeZone);
  }, [props.bookings, props.now, props.timeZone]);
  const grouped = useMemo(
    () => weekSessions(props.bookings, days, props.timeZone),
    [days, props.bookings, props.timeZone]
  );
  if (grouped.every((day) => day.length === 0)) return null;

  return (
    <section className="calm-agenda" aria-label={t(props.language, { es: "Esta semana", en: "This week", pt: "Esta semana" })}>
      <header>
        <h2>{t(props.language, { es: "Esta semana", en: "This week", pt: "Esta semana" })}</h2>
        <button type="button" className="calm-text-link" onClick={() => navigate("/sessions?focus=month")}>
          {t(props.language, { es: "Ver el mes", en: "See the month", pt: "Ver o mês" })}
        </button>
      </header>
      <div className="calm-agenda-days">
        {days.map((day, index) => {
          const sessions = grouped[index] ?? [];
          const today = isSameZonedDay(day, props.now, props.timeZone);
          return (
            <div key={day.toISOString()} className={`calm-agenda-day${today ? " is-today" : ""}`}>
              <span>{today ? t(props.language, { es: "Hoy", en: "Today", pt: "Hoje" }) : dayName(day, props.timeZone, props.language)}</span>
              <b>{dayNumber(day, props.timeZone)}</b>
              {sessions.map((booking) => {
                const professional = findProfessionalById(booking.professionalId, props.professionals);
                const given = professional ? calmGivenName(professional) : "";
                return (
                  <button key={booking.id} type="button" className="calm-agenda-session" onClick={() => props.onOpenBooking(booking.id)}>
                    {given ? `${given} ` : ""}
                    {formatClock(booking.startsAt, props.timeZone, props.language)}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
