import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import type { Booking, Professional } from "../../app/types";
import { findProfessionalById } from "../../app/lib/professionals";
import { calmGivenName, formatClock, isSameZonedDay } from "../../home/calm/calmHomeFormat";
import { calendarWeek, weekSessions } from "../../home/calm/calmWeek";
import { shiftAnchor, shiftByMonths, zonedYmd } from "./sessionsMonth";
import { SessionsCalmMonth } from "./SessionsCalmMonth";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function dayNumber(day: Date, timeZone: string): string {
  return String(zonedYmd(day, timeZone).day);
}

function weekMonthLabel(days: Date[], timeZone: string, language: AppLanguage): string {
  const locale = language === "en" ? "en-US" : language === "pt" ? "pt-BR" : "es-AR";
  const format = new Intl.DateTimeFormat(locale, { month: "long", timeZone });
  const first = format.format(days[0]);
  const last = format.format(days[days.length - 1]);
  return first === last ? first : `${first} – ${last}`;
}

function dayName(day: Date, timeZone: string, language: AppLanguage): string {
  const locale = language === "en" ? "en-US" : language === "pt" ? "pt-BR" : "es-AR";
  try {
    return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone }).format(day).replace(".", "");
  } catch {
    return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(day).replace(".", "");
  }
}

export function SessionsCalmWeek(props: {
  language: AppLanguage;
  timeZone: string;
  now: Date;
  bookings: Booking[];
  professionals: Professional[];
  onOpenDetail: (bookingId: string) => void;
  quiet?: boolean;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionRef = useRef<HTMLElement>(null);
  const monthToggleRef = useRef<HTMLButtonElement>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [monthOpen, setMonthOpen] = useState(() => searchParams.get("focus") === "month");
  const anchor = useMemo(
    () =>
      monthOpen
        ? shiftByMonths(props.now, monthOffset, props.timeZone)
        : shiftAnchor(props.now, weekOffset * 7),
    [monthOffset, monthOpen, props.now, props.timeZone, weekOffset]
  );
  const days = useMemo(() => calendarWeek(anchor, props.timeZone), [anchor, props.timeZone]);
  const grouped = useMemo(() => weekSessions(props.bookings, days, props.timeZone), [days, props.bookings, props.timeZone]);

  useEffect(() => {
    if (searchParams.get("focus") !== "month") return;

    setMonthOpen(true);
    const timer = window.setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      monthToggleRef.current?.focus({ preventScroll: true });
    }, 80);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("focus");
    setSearchParams(nextParams, { replace: true });

    return () => window.clearTimeout(timer);
  }, [searchParams, setSearchParams]);

  return (
    <section
      ref={sectionRef}
      className={`sessions-calm-week${props.quiet ? " is-late" : ""}`}
      aria-label={t(props.language, { es: "Esta semana", en: "This week", pt: "Esta semana" })}
    >
      <header>
        <div className="sessions-calm-week-title">
          <h2>{monthOpen
            ? new Intl.DateTimeFormat(props.language === "en" ? "en-US" : props.language === "pt" ? "pt-BR" : "es-AR", { month: "long", year: "numeric", timeZone: props.timeZone }).format(anchor)
            : t(props.language, { es: "Esta semana", en: "This week", pt: "Esta semana" })}
          </h2>
          {monthOpen ? null : <span className="sessions-calm-week-month">{weekMonthLabel(days, props.timeZone, props.language)}</span>}
        </div>
        <div className="sessions-calm-week-nav">
          <button
            type="button"
            onClick={() =>
              monthOpen ? setMonthOffset((value) => value - 1) : setWeekOffset((value) => value - 1)
            }
            aria-label={
              monthOpen
                ? t(props.language, { es: "Mes anterior", en: "Previous month", pt: "Mês anterior" })
                : t(props.language, { es: "Semana anterior", en: "Previous week", pt: "Semana anterior" })
            }
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() =>
              monthOpen ? setMonthOffset((value) => value + 1) : setWeekOffset((value) => value + 1)
            }
            aria-label={
              monthOpen
                ? t(props.language, { es: "Mes siguiente", en: "Next month", pt: "Próximo mês" })
                : t(props.language, { es: "Semana siguiente", en: "Next week", pt: "Próxima semana" })
            }
          >
            ›
          </button>
          <button
            ref={monthToggleRef}
            type="button"
            className="sessions-calm-link"
            aria-expanded={monthOpen}
            onClick={() => setMonthOpen((value) => !value)}
          >
            {monthOpen
              ? t(props.language, { es: "Ver solo la semana", en: "See only the week", pt: "Ver só a semana" })
              : t(props.language, { es: "Ver el mes", en: "See the month", pt: "Ver o mês" })}
          </button>
        </div>
      </header>
      {monthOpen ? (
        <SessionsCalmMonth
          language={props.language}
          timeZone={props.timeZone}
          anchor={anchor}
          now={props.now}
          bookings={props.bookings}
          professionals={props.professionals}
          onOpenDetail={props.onOpenDetail}
        />
      ) : (
        <div className="sessions-calm-days">
          {days.map((day, index) => {
            const today = isSameZonedDay(day, props.now, props.timeZone);
            const sessions = grouped[index] ?? [];
            return (
              <div key={day.toISOString()} className={`sessions-calm-day${today ? " is-today" : ""}`}>
                <span>{today ? t(props.language, { es: "Hoy", en: "Today", pt: "Hoje" }) : dayName(day, props.timeZone, props.language)}</span>
                <b>{dayNumber(day, props.timeZone)}</b>
                {sessions.map((booking) => {
                  const professional = findProfessionalById(booking.professionalId, props.professionals);
                  const given = professional ? calmGivenName(professional) : "";
                  return (
                    <button key={booking.id} type="button" className="sessions-calm-slot" onClick={() => props.onOpenDetail(booking.id)}>
                      {given ? `${given} ` : ""}
                      {formatClock(booking.startsAt, props.timeZone, props.language)}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
