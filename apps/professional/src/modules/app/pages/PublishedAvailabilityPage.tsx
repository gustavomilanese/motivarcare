import { useEffect, useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, formatDateWithLocale, replaceTemplate, textByLanguage } from "@therapy/i18n-config";
import { InlineBadge } from "@therapy/ui";
import { apiRequest } from "../services/api";
import type { AvailabilitySlot, ProfessionalBookingsResponse } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatDateHeading(value: string, language: AppLanguage): string {
  return formatDateWithLocale({
    value,
    language,
    options: {
      weekday: "long",
      month: "short",
      day: "numeric"
    }
  });
}

function formatTime(value: string, language: AppLanguage): string {
  return formatDateWithLocale({
    value,
    language,
    options: {
      hour: "numeric",
      minute: "2-digit"
    }
  });
}

function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return new Date(startA).getTime() < new Date(endB).getTime() && new Date(endA).getTime() > new Date(startB).getTime();
}

function getStartOfWeek(date: Date): Date {
  const start = new Date(date);
  const weekday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - weekday);
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

function getCalendarDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getTwoWeekLabel(date: Date, language: AppLanguage): string {
  const startDate = getStartOfWeek(date);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 13);

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

function usePublishedAvailabilityData(token: string, language: AppLanguage) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [bookings, setBookings] = useState<ProfessionalBookingsResponse["bookings"]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingSlotId, setDeletingSlotId] = useState("");
  const [error, setError] = useState("");

  const loadSlots = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const [slotsResponse, bookingsResponse] = await Promise.all([
        apiRequest<{ slots: AvailabilitySlot[] }>("/api/availability/me/slots", token),
        apiRequest<ProfessionalBookingsResponse>("/api/bookings/mine", token)
      ]);
      setSlots(slotsResponse.slots);
      setBookings(bookingsResponse.bookings ?? []);
      setError("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(language, {
              es: "No se pudieron cargar los horarios.",
              en: "Could not load schedule slots.",
              pt: "Nao foi possivel carregar os horarios."
            })
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadSlots(true);
  }, [token]);

  const groupedSlots = useMemo(() => {
    const activeBookings = bookings.filter((booking) => booking.status === "confirmed" || booking.status === "requested");
    const map = new Map<string, Array<AvailabilitySlot & { reservation: ProfessionalBookingsResponse["bookings"][number] | null }>>();
    const sorted = [...slots].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

    for (const slot of sorted) {
      const key = slot.startsAt.slice(0, 10);
      const current = map.get(key) ?? [];
      const reservation = activeBookings.find((booking) => rangesOverlap(slot.startsAt, slot.endsAt, booking.startsAt, booking.endsAt)) ?? null;
      current.push({ ...slot, reservation });
      map.set(key, current);
    }

    return Array.from(map.entries()).map(([dateKey, items]) => ({
      dateKey,
      label: formatDateHeading(`${dateKey}T00:00:00`, language),
      items
    }));
  }, [bookings, slots, language]);

  const scheduleSummary = useMemo(() => {
    let blocked = 0;
    let reserved = 0;
    let free = 0;

    for (const slot of slots) {
      const hasReservation = bookings.some((booking) => (booking.status === "confirmed" || booking.status === "requested") && rangesOverlap(slot.startsAt, slot.endsAt, booking.startsAt, booking.endsAt));
      if (slot.isBlocked) {
        blocked += 1;
      } else if (hasReservation) {
        reserved += 1;
      } else {
        free += 1;
      }
    }

    return { blocked, reserved, free, total: slots.length };
  }, [bookings, slots]);

  const handleDelete = async (slotId: string) => {
    setDeletingSlotId(slotId);
    setError("");
    try {
      await apiRequest<{ message: string }>(`/api/availability/slots/${slotId}`, token, {
        method: "DELETE"
      });
      await loadSlots();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(language, {
              es: "No se pudo eliminar el horario.",
              en: "Could not remove the slot.",
              pt: "Nao foi possivel remover o horario."
            })
      );
    } finally {
      setDeletingSlotId("");
    }
  };

  return { groupedSlots, scheduleSummary, loading, deletingSlotId, error, reload: loadSlots, handleDelete };
}

export function AgendaPage(props: { token: string; language: AppLanguage }) {
  const [bookings, setBookings] = useState<ProfessionalBookingsResponse["bookings"]>([]);
  const [loading, setLoading] = useState(true);
  const [completingBookingId, setCompletingBookingId] = useState("");
  const [error, setError] = useState("");
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState(() => getCalendarDayKey(new Date()));

  const loadBookings = async () => {
    const response = await apiRequest<ProfessionalBookingsResponse>("/api/bookings/mine", props.token);
    setBookings(response.bookings ?? []);
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await apiRequest<ProfessionalBookingsResponse>("/api/bookings/mine", props.token);
        if (!active) {
          return;
        }
        setBookings(response.bookings ?? []);
        setError("");
      } catch (requestError) {
        if (!active) {
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : t(props.language, {
                es: "No se pudo cargar la agenda.",
                en: "Could not load the agenda.",
                pt: "Nao foi possivel carregar a agenda."
              })
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [props.language, props.token]);

  const handleMarkCompleted = async (bookingId: string) => {
    setCompletingBookingId(bookingId);
    setError("");
    try {
      await apiRequest(`/api/bookings/${bookingId}/complete`, props.token, {
        method: "POST"
      });
      await loadBookings();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo marcar la sesión como completada.",
              en: "Could not mark session as completed.",
              pt: "Nao foi possivel marcar a sessao como concluida."
            })
      );
    } finally {
      setCompletingBookingId("");
    }
  };

  const now = Date.now();
  const calendarDays = useMemo(() => {
    const currentWeek = getWeekCalendarDays(viewDate);
    const nextWeekBase = new Date(getStartOfWeek(viewDate));
    nextWeekBase.setDate(nextWeekBase.getDate() + 7);
    const nextWeek = getWeekCalendarDays(nextWeekBase);
    return [...currentWeek, ...nextWeek];
  }, [viewDate]);
  const bookingsByDay = useMemo(() => {
    const map = new Map<string, ProfessionalBookingsResponse["bookings"]>();
    for (const booking of bookings) {
      const key = booking.startsAt.slice(0, 10);
      const current = map.get(key) ?? [];
      current.push(booking);
      current.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
      map.set(key, current);
    }
    return map;
  }, [bookings]);

  useEffect(() => {
    const visibleKeys = new Set(calendarDays.map((day) => getCalendarDayKey(day)));
    const todayKey = getCalendarDayKey(new Date());

    if (visibleKeys.has(todayKey)) {
      if (selectedDayKey !== todayKey) {
        setSelectedDayKey(todayKey);
      }
      return;
    }

    if (!visibleKeys.has(selectedDayKey)) {
      setSelectedDayKey(getCalendarDayKey(calendarDays[0] ?? new Date()));
    }
  }, [calendarDays, selectedDayKey]);

  const selectedDayBookings = bookingsByDay.get(selectedDayKey) ?? [];
  const selectedDayDate = new Date(`${selectedDayKey}T00:00:00`);
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
  const weekTimeline = useMemo(() => {
    const start = getStartOfWeek(viewDate).getTime();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const minStart = Math.max(start, startOfToday.getTime());
    const end = start + 14 * 24 * 60 * 60 * 1000;
    return bookings
      .filter((booking) => {
        const time = new Date(booking.startsAt).getTime();
        return time >= minStart && time < end;
      })
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [bookings, viewDate]);

  const summary = useMemo(() => {
    const upcoming = bookings.filter(
      (booking) =>
        new Date(booking.endsAt).getTime() >= now &&
        (booking.status === "confirmed" || booking.status === "requested")
    ).length;
    const completed = bookings.filter((booking) => booking.status === "completed").length;
    const cancelled = bookings.filter((booking) => booking.status === "cancelled").length;

    return { upcoming, completed, cancelled };
  }, [bookings, now]);

  return (
    <div className="pro-grid-stack">
      <section className="pro-section-break">
        <h2>{t(props.language, { es: "Agenda", en: "Agenda", pt: "Agenda" })}</h2>
        <p>
          {t(props.language, {
            es: "Aqui ves todas tus sesiones con paciente, horario, estado y acceso rapido a la llamada cuando corresponde.",
            en: "Here you can see all your sessions with patient, time, status, and quick access to the call when available.",
            pt: "Aqui voce ve todas as suas sessoes com paciente, horario, status e acesso rapido para a chamada quando disponivel."
          })}
        </p>
      </section>

      <section className="pro-kpi-grid">
        <article className="pro-kpi-card">
          <span>{t(props.language, { es: "Proximas", en: "Upcoming", pt: "Proximas" })}</span>
          <strong>{summary.upcoming}</strong>
        </article>
        <article className="pro-kpi-card">
          <span>{t(props.language, { es: "Completadas", en: "Completed", pt: "Concluidas" })}</span>
          <strong>{summary.completed}</strong>
        </article>
        <article className="pro-kpi-card">
          <span>{t(props.language, { es: "Canceladas", en: "Cancelled", pt: "Canceladas" })}</span>
          <strong>{summary.cancelled}</strong>
        </article>
      </section>

      <section className="pro-card agenda-calendar-card">
        <div className="agenda-calendar-head">
          <div>
            <span className="sessions-section-kicker">{t(props.language, { es: "Semana actual y siguiente", en: "Current and next week", pt: "Semana atual e seguinte" })}</span>
            <h2>{t(props.language, { es: "Calendar", en: "Calendar", pt: "Calendar" })}</h2>
          </div>
          <div className="agenda-calendar-nav">
            <button
              type="button"
              onClick={() =>
                setViewDate((current) => {
                  const next = new Date(current);
                  next.setDate(current.getDate() - 14);
                  return next;
                })
              }
            >
              {t(props.language, { es: "Anterior", en: "Prev", pt: "Anterior" })}
            </button>
            <strong>{getTwoWeekLabel(viewDate, props.language)}</strong>
            <button
              type="button"
              onClick={() =>
                setViewDate((current) => {
                  const next = new Date(current);
                  next.setDate(current.getDate() + 14);
                  return next;
                })
              }
            >
              {t(props.language, { es: "Siguiente", en: "Next", pt: "Seguinte" })}
            </button>
          </div>
        </div>
        {loading ? <p>{t(props.language, { es: "Cargando agenda...", en: "Loading agenda...", pt: "Carregando agenda..." })}</p> : null}
        {error ? <p className="pro-error">{error}</p> : null}
        {!loading && !error && bookings.length === 0 ? (
          <p>{t(props.language, { es: "Todavia no hay sesiones registradas.", en: "There are no sessions yet.", pt: "Ainda nao ha sessoes registradas." })}</p>
        ) : null}
        {!loading && !error && bookings.length > 0 ? (
          <div className="agenda-calendar-layout">
            <div className="agenda-calendar-grid-wrap">
              <div className="agenda-calendar-grid">
                {dayNames.map((day) => (
                  <span className="agenda-calendar-dayname" key={day}>{day}</span>
                ))}
                {calendarDays.map((day) => {
                  const dayKey = getCalendarDayKey(day);
                  const dayBookings = bookingsByDay.get(dayKey) ?? [];
                  const isToday = dayKey === getCalendarDayKey(new Date());
                  const isActive = dayKey === selectedDayKey;
                  const nextBooking = dayBookings[0];

                  return (
                    <button
                      className={`agenda-calendar-day ${isToday ? "today" : ""} ${dayBookings.length > 0 ? "busy" : ""} ${isActive ? "active" : ""}`}
                      key={dayKey}
                      type="button"
                      onClick={() => setSelectedDayKey(dayKey)}
                    >
                      <span className="agenda-calendar-date">{day.getDate()}</span>
                      {isToday ? (
                        <InlineBadge>
                          {t(props.language, { es: "Hoy", en: "Today", pt: "Hoje" })}
                        </InlineBadge>
                      ) : null}
                      {dayBookings.length > 0 ? (
                        <>
                          <span className="agenda-calendar-count">
                            {replaceTemplate(
                              t(props.language, {
                                es: "{count} sesion",
                                en: "{count} session",
                                pt: "{count} sessao"
                              }),
                              { count: String(dayBookings.length) }
                            )}
                          </span>
                          <span className="agenda-calendar-time">
                            {nextBooking ? formatTime(nextBooking.startsAt, props.language) : ""}
                          </span>
                        </>
                      ) : (
                        <span className="agenda-calendar-empty" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {!loading && !error && bookings.length > 0 ? (
        <section className="pro-card agenda-calendar-aside">
          <h3>
            {formatDateHeading(selectedDayDate.toISOString(), props.language)}
            {selectedDayKey === getCalendarDayKey(new Date())
              ? ` · ${t(props.language, { es: "Hoy", en: "Today", pt: "Hoje" })}`
              : ""}
          </h3>
          {selectedDayBookings.length === 0 ? (
            <p>
              {t(props.language, {
                es: "No hay sesiones en este dia.",
                en: "There are no sessions on this day.",
                pt: "Nao ha sessoes neste dia."
              })}
            </p>
          ) : (
            <div className="agenda-day-list">
              {selectedDayBookings.map((booking) => (
                <article className="agenda-day-item" key={booking.id}>
                  <strong className="agenda-day-time">
                    {formatTime(booking.startsAt, props.language)} - {formatTime(booking.endsAt, props.language)}
                  </strong>
                  <div className="agenda-day-patient">
                    <span>{booking.counterpartName ?? "-"}</span>
                    <small>{booking.counterpartEmail ?? ""}</small>
                  </div>
                  <span className={`agenda-status agenda-status-${booking.status}`}>{booking.status}</span>
                  <div className="agenda-day-actions">
                    {(booking.status === "confirmed" || booking.status === "requested") && booking.joinUrl ? (
                      <a href={booking.joinUrl} target="_blank" rel="noreferrer" className="agenda-join-button">
                        {t(props.language, { es: "Acceder videollamada", en: "Open video call", pt: "Acessar videochamada" })}
                      </a>
                    ) : (
                      <span className="pro-muted">
                        {t(props.language, { es: "Sin link", en: "No link", pt: "Sem link" })}
                      </span>
                    )}
                    {booking.status === "confirmed" && new Date(booking.startsAt).getTime() <= now ? (
                      <button
                        type="button"
                        className="agenda-complete-button"
                        disabled={completingBookingId === booking.id}
                        onClick={() => void handleMarkCompleted(booking.id)}
                      >
                        {completingBookingId === booking.id
                          ? t(props.language, { es: "Guardando...", en: "Saving...", pt: "Salvando..." })
                          : t(props.language, { es: "Marcar completada", en: "Mark completed", pt: "Marcar concluida" })}
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {!loading && !error && weekTimeline.length > 0 ? (
        <section className="pro-card agenda-week-list-card">
          <h2>{t(props.language, { es: "Sesiones de estas dos semanas", en: "Sessions in these two weeks", pt: "Sessoes destas duas semanas" })}</h2>
          <ul className="agenda-week-list">
            {weekTimeline.map((booking) => (
              <li key={booking.id}>
                <div>
                  <strong>{booking.counterpartName ?? "-"}</strong>
                  <span>
                    {formatDateHeading(booking.startsAt, props.language)} · {formatTime(booking.startsAt, props.language)}
                  </span>
                </div>
                <div className="agenda-week-item-actions">
                  <span className={`agenda-status agenda-status-${booking.status}`}>{booking.status}</span>
                  {booking.status === "confirmed" && new Date(booking.startsAt).getTime() <= now ? (
                    <button
                      type="button"
                      className="agenda-complete-button"
                      disabled={completingBookingId === booking.id}
                      onClick={() => void handleMarkCompleted(booking.id)}
                    >
                      {completingBookingId === booking.id
                        ? t(props.language, { es: "Guardando...", en: "Saving...", pt: "Salvando..." })
                        : t(props.language, { es: "Completar", en: "Complete", pt: "Concluir" })}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function PublishedAvailabilityPage(props: { token: string; language: AppLanguage }) {
  const { groupedSlots, scheduleSummary, loading, deletingSlotId, error, handleDelete } = usePublishedAvailabilityData(props.token, props.language);
  const [openDayKey, setOpenDayKey] = useState<string | null>(null);

  return (
    <div className="pro-grid-stack">
      <section className="pro-section-break">
        <h2>{t(props.language, { es: "Disponibilidad publicada", en: "Published availability", pt: "Disponibilidade publicada" })}</h2>
        <p>
          {t(props.language, {
            es: "Aqui administras los horarios ya creados y ves cuales siguen libres, cuales quedaron reservados y cuales fueron bloqueados.",
            en: "Here you manage already created slots and see which remain free, booked, or blocked.",
            pt: "Aqui voce administra os horarios ja criados e ve quais seguem livres, reservados ou bloqueados."
          })}
        </p>
      </section>

      <section className="pro-kpi-grid schedule-kpi-grid">
        <article className="pro-kpi-card">
          <span>{t(props.language, { es: "Libres", en: "Free", pt: "Livres" })}</span>
          <strong>{scheduleSummary.free}</strong>
        </article>
        <article className="pro-kpi-card">
          <span>{t(props.language, { es: "Reservados", en: "Booked", pt: "Reservados" })}</span>
          <strong>{scheduleSummary.reserved}</strong>
        </article>
        <article className="pro-kpi-card">
          <span>{t(props.language, { es: "Bloqueados", en: "Blocked", pt: "Bloqueados" })}</span>
          <strong>{scheduleSummary.blocked}</strong>
        </article>
        <article className="pro-kpi-card">
          <span>{t(props.language, { es: "Publicados", en: "Published", pt: "Publicados" })}</span>
          <strong>{scheduleSummary.total}</strong>
        </article>
      </section>

      <section className="pro-card">
        <h2>{t(props.language, { es: "Disponibilidad publicada", en: "Published availability", pt: "Disponibilidade publicada" })}</h2>
        {error ? <p className="pro-error">{error}</p> : null}
        {loading ? <p>{t(props.language, { es: "Cargando...", en: "Loading...", pt: "Carregando..." })}</p> : null}
        {!loading && groupedSlots.length === 0 ? <p>{t(props.language, { es: "No hay horarios cargados.", en: "No slots loaded yet.", pt: "Nao ha horarios carregados." })}</p> : null}
        {!loading && groupedSlots.length > 0 ? (
          <div className="schedule-group-list">
            {groupedSlots.map((group) => (
              <article className={`schedule-day-card ${openDayKey === group.dateKey ? "expanded" : ""}`} key={group.dateKey}>
                <button
                  className="schedule-day-toggle"
                  type="button"
                  onClick={() => setOpenDayKey((current) => current === group.dateKey ? null : group.dateKey)}
                >
                  <h3>{group.label}</h3>
                  <span>{replaceTemplate(t(props.language, { es: "{count} horarios", en: "{count} slots", pt: "{count} horarios" }), { count: String(group.items.length) })}</span>
                  <span className="schedule-day-toggle-icon" aria-hidden="true">{openDayKey === group.dateKey ? "−" : "+"}</span>
                </button>
                {openDayKey === group.dateKey ? (
                  <>
                    <div className="schedule-day-table-head" aria-hidden="true">
                      <span>{t(props.language, { es: "Hora", en: "Time", pt: "Horario" })}</span>
                      <span>{t(props.language, { es: "Estado", en: "Status", pt: "Status" })}</span>
                      <span>{t(props.language, { es: "Accion", en: "Action", pt: "Acao" })}</span>
                    </div>
                    <ul className="pro-list schedule-slot-table">
                      {group.items.map((slot) => (
                        <li key={slot.id}>
                          <div className="schedule-slot-time">
                            <strong>{formatTime(slot.startsAt, props.language)} - {formatTime(slot.endsAt, props.language)}</strong>
                          </div>
                          <div className="schedule-slot-status">
                            <span className={`schedule-slot-badge ${slot.reservation ? "reserved" : slot.isBlocked ? "blocked" : "free"}`}>
                              {slot.reservation
                                ? replaceTemplate(
                                    t(props.language, {
                                      es: "{name} · reservado",
                                      en: "{name} · booked",
                                      pt: "{name} · reservado"
                                    }),
                                    { name: slot.reservation.counterpartName ?? "Paciente" }
                                  )
                                : slot.isBlocked
                                  ? t(props.language, { es: "Bloqueado", en: "Blocked", pt: "Bloqueado" })
                                  : t(props.language, { es: "Libre", en: "Free", pt: "Livre" })}
                            </span>
                          </div>
                          <div className="schedule-slot-action">
                            <button
                              type="button"
                              disabled={Boolean(slot.reservation) || slot.isBlocked || deletingSlotId === slot.id}
                              onClick={() => void handleDelete(slot.id)}
                            >
                              {deletingSlotId === slot.id
                                ? t(props.language, { es: "Eliminando...", en: "Removing...", pt: "Removendo..." })
                                : t(props.language, { es: "Quitar", en: "Remove", pt: "Remover" })}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
