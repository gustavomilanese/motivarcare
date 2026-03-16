import { useEffect, useMemo, useState } from "react";
import {
  type AppLanguage,
  type LocalizedText,
  formatDateWithLocale,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import { professionalsCatalog } from "../../app/data/professionalsCatalog";
import type { Booking, Professional } from "../../app/types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function findProfessionalById(professionalId: string): Professional {
  return professionalsCatalog.find((item) => item.id === professionalId) ?? professionalsCatalog[0];
}

function getNextBooking(bookings: Booking[]): Booking | null {
  const now = Date.now();

  return (
    bookings
      .filter((booking) => booking.status === "confirmed" && new Date(booking.startsAt).getTime() > now)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ?? null
  );
}

function formatDateOnly(params: { isoDate: string; timezone: string; language: AppLanguage }): string {
  return formatDateWithLocale({
    value: params.isoDate,
    language: params.language,
    timeZone: params.timezone,
    options: {
      weekday: "long",
      month: "long",
      day: "numeric"
    }
  });
}

function formatTimeOnly(params: { isoDate: string; timezone: string; language: AppLanguage }): string {
  return formatDateWithLocale({
    value: params.isoDate,
    language: params.language,
    timeZone: params.timezone,
    options: {
      hour: "numeric",
      minute: "2-digit"
    }
  });
}

function getStartOfWeek(date: Date): Date {
  const start = new Date(date);
  const weekday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - weekday);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getStartOfMonth(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getWeekCalendarDays(viewDate: Date): Date[] {
  const startDate = getStartOfWeek(viewDate);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + index);
    return day;
  });
}

function getWeekLabel(date: Date, language: AppLanguage): string {
  const startDate = getStartOfWeek(date);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  const startLabel = formatDateWithLocale({
    value: startDate.toISOString(),
    language,
    options: {
      day: "numeric",
      month: "short"
    }
  });
  const endLabel = formatDateWithLocale({
    value: endDate.toISOString(),
    language,
    options: {
      day: "numeric",
      month: "short",
      year: "numeric"
    }
  });

  return `${startLabel} - ${endLabel}`;
}

function getMonthCalendarDays(viewDate: Date): Date[] {
  const monthStart = getStartOfMonth(viewDate);
  const gridStart = getStartOfWeek(monthStart);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function getMonthLabel(date: Date, language: AppLanguage): string {
  return formatDateWithLocale({
    value: date.toISOString(),
    language,
    options: {
      month: "long",
      year: "numeric"
    }
  });
}

function getCalendarDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getBookingDayKey(isoDate: string): string {
  return isoDate.slice(0, 10);
}

export function SessionsCalendar(props: {
  bookings: Booking[];
  timezone: string;
  language: AppLanguage;
  onOpenBookingDetail: (bookingId: string) => void;
  variant?: "week" | "dashboard";
}) {
  const variant = props.variant ?? "week";
  const [viewDate, setViewDate] = useState(() => {
    const nextBooking = getNextBooking(props.bookings);
    return nextBooking ? new Date(nextBooking.startsAt) : new Date();
  });
  const [selectedDayKey, setSelectedDayKey] = useState(() => {
    const nextBooking = getNextBooking(props.bookings);
    return nextBooking ? getBookingDayKey(nextBooking.startsAt) : getCalendarDayKey(new Date());
  });

  const calendarDays = useMemo(
    () => variant === "dashboard" ? getMonthCalendarDays(viewDate) : getWeekCalendarDays(viewDate),
    [variant, viewDate]
  );
  const bookingsByDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const booking of props.bookings) {
      const key = getBookingDayKey(booking.startsAt);
      const current = map.get(key) ?? [];
      current.push(booking);
      map.set(key, current);
    }
    return map;
  }, [props.bookings]);

  const dayNames = useMemo(
    () => [
      t(props.language, { es: "Lun", en: "Mon", pt: "Seg" }),
      t(props.language, { es: "Mar", en: "Tue", pt: "Ter" }),
      t(props.language, { es: "Mie", en: "Wed", pt: "Qua" }),
      t(props.language, { es: "Jue", en: "Thu", pt: "Qui" }),
      t(props.language, { es: "Vie", en: "Fri", pt: "Sex" }),
      t(props.language, { es: "Sab", en: "Sat", pt: "Sab" }),
      t(props.language, { es: "Dom", en: "Sun", pt: "Dom" })
    ],
    [props.language]
  );

  const sortedBookings = useMemo(
    () => [...props.bookings].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [props.bookings]
  );
  const today = new Date();
  const todayKey = getCalendarDayKey(today);
  const selectedDayBookings = bookingsByDay.get(selectedDayKey) ?? [];
  const timelineBookings = variant === "dashboard" ? selectedDayBookings : sortedBookings.slice(0, 5);
  const selectedDate = useMemo(() => {
    const [year, month, day] = selectedDayKey.split("-").map((value) => Number(value));
    return new Date(year, month - 1, day);
  }, [selectedDayKey]);

  useEffect(() => {
    if (variant !== "dashboard") {
      return;
    }

    const currentToday = new Date();
    const selectedMonth = selectedDate.getMonth();
    const selectedYear = selectedDate.getFullYear();
    const viewMonth = viewDate.getMonth();
    const viewYear = viewDate.getFullYear();

    if (selectedMonth === viewMonth && selectedYear === viewYear) {
      return;
    }

    const firstBookingInMonth = sortedBookings.find((booking) => {
      const bookingDate = new Date(booking.startsAt);
      return bookingDate.getMonth() === viewMonth && bookingDate.getFullYear() === viewYear;
    });

    if (firstBookingInMonth) {
      setSelectedDayKey(getBookingDayKey(firstBookingInMonth.startsAt));
      return;
    }

    if (currentToday.getMonth() === viewMonth && currentToday.getFullYear() === viewYear) {
      setSelectedDayKey(todayKey);
      return;
    }

    setSelectedDayKey(getCalendarDayKey(new Date(viewYear, viewMonth, 1)));
  }, [selectedDate, sortedBookings, todayKey, variant, viewDate]);

  return (
    <section className={`content-card booking-session-card booking-card-minimal sessions-calendar-card ${variant === "dashboard" ? "dashboard" : ""}`}>
      <div className="sessions-calendar-head">
        <div>
          <span className="sessions-section-kicker">
            {variant === "dashboard"
              ? t(props.language, { es: "Continuidad", en: "Continuity", pt: "Continuidade" })
              : t(props.language, { es: "Agenda visual", en: "Visual schedule", pt: "Agenda visual" })}
          </span>
          <h2>
            {variant === "dashboard"
              ? t(props.language, { es: "Tu calendario", en: "Your calendar", pt: "Seu calendario" })
              : t(props.language, { es: "Calendario de sesiones", en: "Sessions calendar", pt: "Calendario de sessoes" })}
          </h2>
        </div>
        <div className="sessions-calendar-month-nav">
          <button
            type="button"
            onClick={() =>
              setViewDate((current) => {
                const next = new Date(current);
                if (variant === "dashboard") {
                  next.setMonth(current.getMonth() - 1);
                } else {
                  next.setDate(current.getDate() - 7);
                }
                return next;
              })
            }
          >
            {t(props.language, { es: "Anterior", en: "Prev", pt: "Anterior" })}
          </button>
          <strong>{variant === "dashboard" ? getMonthLabel(viewDate, props.language) : getWeekLabel(viewDate, props.language)}</strong>
          <button
            type="button"
            onClick={() =>
              setViewDate((current) => {
                const next = new Date(current);
                if (variant === "dashboard") {
                  next.setMonth(current.getMonth() + 1);
                } else {
                  next.setDate(current.getDate() + 7);
                }
                return next;
              })
            }
          >
            {t(props.language, { es: "Siguiente", en: "Next", pt: "Seguinte" })}
          </button>
        </div>
      </div>

      <div className="sessions-calendar-layout">
        <div className="sessions-calendar-grid-wrap">
          <div className={`sessions-calendar-grid ${variant === "dashboard" ? "month-grid" : ""}`}>
            {dayNames.map((day) => (
              <span className="sessions-calendar-dayname" key={day}>{day}</span>
            ))}
            {calendarDays.map((day) => {
              const dayKey = getCalendarDayKey(day);
              const dayBookings = bookingsByDay.get(dayKey) ?? [];
              const isToday = dayKey === todayKey;
              const isBusy = dayBookings.length > 0;
              const isOutsideMonth = variant === "dashboard" && day.getMonth() !== viewDate.getMonth();
              const isSelected = variant === "dashboard" && dayKey === selectedDayKey;
              const nextDayBooking = dayBookings[0];

              return (
                <button
                  className={`sessions-calendar-day ${isToday ? "today" : ""} ${isBusy ? "busy" : ""} ${isOutsideMonth ? "outside" : ""} ${isSelected ? "selected" : ""}`}
                  key={dayKey}
                  type="button"
                  onClick={() => {
                    if (variant === "dashboard") {
                      setSelectedDayKey(dayKey);
                    } else if (nextDayBooking) {
                      props.onOpenBookingDetail(nextDayBooking.id);
                    }
                  }}
                  aria-pressed={variant === "dashboard" ? isSelected : undefined}
                >
                  <span className="sessions-calendar-date">{day.getDate()}</span>
                  {dayBookings.length > 0 ? (
                    <>
                      <span className="sessions-calendar-count">
                        {replaceTemplate(
                          t(props.language, {
                            es: "{count} sesion",
                            en: "{count} session",
                            pt: "{count} sessao"
                          }),
                          { count: String(dayBookings.length) }
                        )}
                      </span>
                      <span className="sessions-calendar-time">
                        {formatTimeOnly({ isoDate: nextDayBooking.startsAt, timezone: props.timezone, language: props.language })}
                      </span>
                    </>
                  ) : (
                    <span className="sessions-calendar-empty" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="sessions-calendar-agenda">
          <h3>
            {variant === "dashboard"
              ? t(props.language, { es: "Agenda del dia", en: "Day agenda", pt: "Agenda do dia" })
              : t(props.language, { es: "Proximas en agenda", en: "Upcoming on calendar", pt: "Proximas na agenda" })}
          </h3>
          {variant === "dashboard" ? (
            <p className="sessions-calendar-selected-date">
              {formatDateOnly({ isoDate: selectedDate.toISOString(), timezone: props.timezone, language: props.language })}
            </p>
          ) : null}
          {timelineBookings.length === 0 ? (
            <p>
              {variant === "dashboard"
                ? t(props.language, {
                    es: "No tienes sesiones planificadas para este dia.",
                    en: "You do not have any scheduled sessions for this day.",
                    pt: "Voce nao tem sessoes planejadas para este dia."
                  })
                : t(props.language, {
                    es: "Cuando confirmes sesiones, apareceran aqui con su dia y horario.",
                    en: "Once you confirm sessions, they will appear here with day and time.",
                    pt: "Quando voce confirmar sessoes, elas aparecerao aqui com dia e horario."
                  })}
            </p>
          ) : (
            <div className="sessions-agenda-list">
              {timelineBookings.map((booking) => {
                const professional = findProfessionalById(booking.professionalId);
                return (
                  <button
                    className="sessions-agenda-item"
                    key={booking.id}
                    type="button"
                    onClick={() => props.onOpenBookingDetail(booking.id)}
                  >
                    <span className="sessions-agenda-date">
                      {formatDateOnly({ isoDate: booking.startsAt, timezone: props.timezone, language: props.language })}
                    </span>
                    <strong>{formatTimeOnly({ isoDate: booking.startsAt, timezone: props.timezone, language: props.language })}</strong>
                    <span className="sessions-agenda-professional">{professional.fullName}</span>
                    <span className="sessions-agenda-status">
                      {t(props.language, { es: "Confirmada", en: "Confirmed", pt: "Confirmada" })}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
