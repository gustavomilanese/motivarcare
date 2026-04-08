import { useEffect, useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, formatDateWithLocale, replaceTemplate, textByLanguage } from "@therapy/i18n-config";
import { InlineBadge } from "@therapy/ui";
import { type UpcomingReservationItem, UpcomingReservationsList } from "../components/agenda/UpcomingReservationsList";
import { professionalSurfaceMessage } from "../lib/friendlyProfessionalSurfaceMessages";
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

function buildSlotKey(startsAt: string, endsAt: string): string {
  return `${startsAt}__${endsAt}`;
}

function formatBookingStatus(status: string, language: AppLanguage): string {
  if (status === "confirmed") {
    return t(language, { es: "Confirmada", en: "Confirmed", pt: "Confirmada" });
  }
  if (status === "requested") {
    return t(language, { es: "Solicitada", en: "Requested", pt: "Solicitada" });
  }
  if (status === "completed") {
    return t(language, { es: "Completada", en: "Completed", pt: "Concluida" });
  }
  if (status === "cancelled") {
    return t(language, { es: "Cancelada", en: "Cancelled", pt: "Cancelada" });
  }
  return status;
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
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(professionalSurfaceMessage("published-slots-load", language, raw));
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
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(professionalSurfaceMessage("published-slot-delete", language, raw));
    } finally {
      setDeletingSlotId("");
    }
  };

  return { groupedSlots, scheduleSummary, loading, deletingSlotId, error, reload: loadSlots, handleDelete };
}

export function AgendaPage(props: { token: string; language: AppLanguage }) {
  const [bookings, setBookings] = useState<ProfessionalBookingsResponse["bookings"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState(() => getCalendarDayKey(new Date()));
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [isQuickAgendaOpen, setIsQuickAgendaOpen] = useState(false);
  const [quickAgendaDate, setQuickAgendaDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleTargetBooking, setRescheduleTargetBooking] = useState<UpcomingReservationItem | null>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedRescheduleSlotKey, setSelectedRescheduleSlotKey] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelTargetBooking, setCancelTargetBooking] = useState<UpcomingReservationItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [bookingActionInProgressId, setBookingActionInProgressId] = useState<string | null>(null);
  const [bookingActionError, setBookingActionError] = useState("");

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
        const raw = requestError instanceof Error ? requestError.message : "";
        setError(professionalSurfaceMessage("published-agenda-load", props.language, raw));
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

  const quickAgendaDayKey = getCalendarDayKey(quickAgendaDate);
  const quickAgendaBookings = bookingsByDay.get(quickAgendaDayKey) ?? [];
  const todayKey = getCalendarDayKey(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowKey = getCalendarDayKey(tomorrowDate);
  const quickAgendaDateLabel =
    quickAgendaDayKey === todayKey
      ? t(props.language, { es: "Hoy", en: "Today", pt: "Hoje" })
      : quickAgendaDayKey === tomorrowKey
        ? t(props.language, { es: "Mañana", en: "Tomorrow", pt: "Amanhã" })
        : formatDateHeading(quickAgendaDate.toISOString(), props.language);
  const quickAgendaBadge = replaceTemplate(
    t(props.language, {
      es: "{count} sesiones",
      en: "{count} sessions",
      pt: "{count} sessões"
    }),
    { count: String(quickAgendaBookings.length) }
  );
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

  const upcomingReservations = useMemo(
    () =>
      bookings
        .filter(
          (booking) =>
            new Date(booking.endsAt).getTime() >= now &&
            (booking.status === "confirmed" || booking.status === "requested")
        )
        .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()),
    [bookings, now]
  );
  const upcomingReservationItems = useMemo<UpcomingReservationItem[]>(
    () =>
      upcomingReservations.map((booking) => ({
        id: booking.id,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        patientName: booking.counterpartName ?? "-",
        patientEmail: booking.counterpartEmail ?? "",
        status: booking.status,
        joinUrl: booking.joinUrl ?? null
      })),
    [upcomingReservations]
  );

  useEffect(() => {
    if (!isQuickAgendaOpen) {
      return;
    }

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsQuickAgendaOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isQuickAgendaOpen]);

  useEffect(() => {
    if (!isCancelModalOpen) {
      return;
    }

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCancelModalOpen(false);
        setCancelTargetBooking(null);
        setCancelReason("");
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isCancelModalOpen]);

  const openTodayQuickAgenda = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setQuickAgendaDate(today);
    setIsQuickAgendaOpen(true);
  };

  const shiftQuickAgendaDay = (delta: number) => {
    setQuickAgendaDate((current) => {
      const next = new Date(current);
      next.setDate(current.getDate() + delta);
      return next;
    });
  };

  const openRescheduleModal = async (booking: UpcomingReservationItem) => {
    setBookingActionError("");
    setBookingActionInProgressId(booking.id);
    try {
      const response = await apiRequest<{ slots: AvailabilitySlot[] }>("/api/availability/me/slots", props.token);
      const nowDate = new Date();
      const options = (response.slots ?? []).filter((slot) => {
        if (slot.isBlocked) {
          return false;
        }
        if (new Date(slot.startsAt).getTime() < nowDate.getTime()) {
          return false;
        }
        return !bookings.some(
          (existingBooking) =>
            existingBooking.id !== booking.id
            && (existingBooking.status === "confirmed" || existingBooking.status === "requested")
            && rangesOverlap(slot.startsAt, slot.endsAt, existingBooking.startsAt, existingBooking.endsAt)
        );
      });

      setRescheduleTargetBooking(booking);
      setRescheduleSlots(options);
      setSelectedRescheduleSlotKey(options[0] ? buildSlotKey(options[0].startsAt, options[0].endsAt) : "");
      setRescheduleReason("");
      setIsRescheduleModalOpen(true);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setBookingActionError(professionalSurfaceMessage("published-reschedule-availability", props.language, raw));
    } finally {
      setBookingActionInProgressId(null);
    }
  };

  const submitReschedule = async () => {
    if (!rescheduleTargetBooking || !selectedRescheduleSlotKey) {
      return;
    }

    const [startsAt, endsAt] = selectedRescheduleSlotKey.split("__");
    if (!startsAt || !endsAt) {
      return;
    }

    setBookingActionError("");
    setBookingActionInProgressId(rescheduleTargetBooking.id);
    try {
      const response = await apiRequest<{
        booking: {
          id: string;
          startsAt: string;
          endsAt: string;
          status: string;
          joinUrlProfessional?: string | null;
        };
      }>(
        `/api/bookings/${rescheduleTargetBooking.id}/reschedule`,
        props.token,
        {
          method: "POST",
          body: JSON.stringify({
            startsAt,
            endsAt,
            professionalTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            reason: rescheduleReason.trim() || undefined
          })
        }
      );

      setBookings((current) =>
        current.map((item) =>
          item.id === rescheduleTargetBooking.id
            ? {
                ...item,
                startsAt: response.booking.startsAt,
                endsAt: response.booking.endsAt,
                status: response.booking.status,
                joinUrl: response.booking.joinUrlProfessional ?? item.joinUrl
              }
            : item
        )
      );
      setIsRescheduleModalOpen(false);
      setRescheduleTargetBooking(null);
      setRescheduleSlots([]);
      setSelectedRescheduleSlotKey("");
      setRescheduleReason("");
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setBookingActionError(professionalSurfaceMessage("published-reschedule-save", props.language, raw));
    } finally {
      setBookingActionInProgressId(null);
    }
  };

  const openCancelModal = (booking: UpcomingReservationItem) => {
    setBookingActionError("");
    setCancelTargetBooking(booking);
    setCancelReason("");
    setIsCancelModalOpen(true);
  };

  const submitCancelBooking = async () => {
    if (!cancelTargetBooking) {
      return;
    }

    setBookingActionError("");
    setBookingActionInProgressId(cancelTargetBooking.id);
    try {
      await apiRequest<{ message: string }>(
        `/api/bookings/${cancelTargetBooking.id}/cancel`,
        props.token,
        {
          method: "POST",
          body: JSON.stringify({
            reason: cancelReason.trim() || "cancelled_by_professional"
          })
        }
      );

      setBookings((current) =>
        current.map((item) => (item.id === cancelTargetBooking.id ? { ...item, status: "cancelled" } : item))
      );
      setIsCancelModalOpen(false);
      setCancelTargetBooking(null);
      setCancelReason("");
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setBookingActionError(professionalSurfaceMessage("published-cancel-booking", props.language, raw));
    } finally {
      setBookingActionInProgressId(null);
    }
  };

  return (
    <div className="pro-grid-stack">
      <section className="pro-section-break">
        <h2>{t(props.language, { es: "Agenda de Sesiones", en: "Session Agenda", pt: "Agenda de Sessoes" })}</h2>
        <p>
          {t(props.language, {
            es: "Aquí ves todas tus sesiones con paciente, horario, estado y acceso rápido a la llamada cuando corresponde.",
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

      <section className="pro-card agenda-upcoming-panel">
        <div className="agenda-upcoming-head">
          <h2>{t(props.language, { es: "Próximas Reservas", en: "Upcoming bookings", pt: "Próximas reservas" })}</h2>
          <button
            type="button"
            className="agenda-today-button"
            onClick={openTodayQuickAgenda}
          >
            {t(props.language, { es: "Hoy", en: "Today", pt: "Hoje" })}
          </button>
        </div>
        <UpcomingReservationsList
          language={props.language}
          reservations={upcomingReservationItems}
          loading={loading}
          error={error}
          busyBookingId={bookingActionInProgressId}
          onRequestReschedule={openRescheduleModal}
          onRequestCancel={openCancelModal}
        />
        {bookingActionError ? <p className="pro-error">{bookingActionError}</p> : null}
      </section>

      {isQuickAgendaOpen ? (
        <div className="agenda-quick-modal-backdrop" onClick={() => setIsQuickAgendaOpen(false)}>
          <section
            className="agenda-quick-modal"
            role="dialog"
            aria-modal="true"
            aria-label={t(props.language, { es: "Agenda rápida", en: "Quick agenda", pt: "Agenda rápida" })}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="agenda-quick-modal-head">
              <div>
                <h3>{t(props.language, { es: "Agenda rápida", en: "Quick agenda", pt: "Agenda rápida" })}</h3>
                <p>{formatDateHeading(quickAgendaDate.toISOString(), props.language)}</p>
              </div>
              <button type="button" onClick={() => setIsQuickAgendaOpen(false)}>
                {t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
              </button>
            </header>

            <div className="agenda-quick-modal-nav">
              <button
                type="button"
                aria-label={t(props.language, { es: "Día anterior", en: "Previous day", pt: "Dia anterior" })}
                onClick={() => shiftQuickAgendaDay(-1)}
              >
                ‹
              </button>
              <strong>{quickAgendaDateLabel}</strong>
              <button
                type="button"
                aria-label={t(props.language, { es: "Día siguiente", en: "Next day", pt: "Dia seguinte" })}
                onClick={() => shiftQuickAgendaDay(1)}
              >
                ›
              </button>
              <span className="agenda-quick-modal-badge">{quickAgendaBadge}</span>
            </div>

            {quickAgendaBookings.length === 0 ? (
              <div className="agenda-quick-modal-empty">
                <strong>{t(props.language, { es: "Sin sesiones para este día", en: "No sessions for this day", pt: "Sem sessões para este dia" })}</strong>
                <p>{t(props.language, { es: "Navega a mañana para revisar la continuidad.", en: "Move to tomorrow to review upcoming activity.", pt: "Navegue para amanhã para revisar a continuidade." })}</p>
              </div>
            ) : (
              <div className="agenda-quick-modal-list">
                {quickAgendaBookings.map((booking) => (
                  <article className="agenda-quick-modal-item" key={booking.id}>
                    <div className="agenda-quick-modal-time">
                      <strong>{formatTime(booking.startsAt, props.language)}</strong>
                      <span>{formatTime(booking.endsAt, props.language)}</span>
                    </div>
                    <div className="agenda-quick-modal-patient">
                      <strong>{booking.counterpartName ?? "-"}</strong>
                      <small>{booking.counterpartEmail ?? ""}</small>
                    </div>
                    <span className={`agenda-status agenda-status-${booking.status}`}>{formatBookingStatus(booking.status, props.language)}</span>
                    {(booking.status === "confirmed" || booking.status === "requested") && booking.joinUrl ? (
                      <a href={booking.joinUrl} target="_blank" rel="noreferrer" className="agenda-join-button">
                        {t(props.language, { es: "Abrir sesión", en: "Open session", pt: "Abrir sessão" })}
                      </a>
                    ) : (
                      <span className="pro-muted">{t(props.language, { es: "Sin link", en: "No link", pt: "Sem link" })}</span>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {isCancelModalOpen ? (
        <div className="pro-reschedule-modal-backdrop" role="presentation" onClick={() => setIsCancelModalOpen(false)}>
          <section className="pro-reschedule-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header>
              <h3>{t(props.language, { es: "Cancelar reserva", en: "Cancel booking", pt: "Cancelar reserva" })}</h3>
              <button type="button" onClick={() => setIsCancelModalOpen(false)} aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}>×</button>
            </header>
            <label>
              <span>{t(props.language, { es: "Motivo para el paciente (opcional)", en: "Reason for the patient (optional)", pt: "Motivo para o paciente (opcional)" })}</span>
              <textarea
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder={t(props.language, { es: "Ej: hoy no podré atender por un imprevisto.", en: "e.g. I cannot attend today due to an unforeseen issue.", pt: "Ex: hoje não poderei atender por um imprevisto." })}
              />
            </label>
            <div className="pro-reschedule-modal-actions">
              <button type="button" onClick={() => setIsCancelModalOpen(false)}>
                {t(props.language, { es: "Volver", en: "Back", pt: "Voltar" })}
              </button>
              <button type="button" className="danger" disabled={bookingActionInProgressId === cancelTargetBooking?.id} onClick={() => void submitCancelBooking()}>
                {bookingActionInProgressId === cancelTargetBooking?.id
                  ? t(props.language, { es: "Cancelando...", en: "Cancelling...", pt: "Cancelando..." })
                  : t(props.language, { es: "Confirmar cancelación", en: "Confirm cancellation", pt: "Confirmar cancelamento" })}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <section className="pro-card agenda-calendar-card agenda-calendar-collapsible">
        <button
          type="button"
          className="agenda-calendar-toggle"
          aria-expanded={isCalendarExpanded}
          onClick={() => setIsCalendarExpanded((current) => !current)}
        >
          <h2>{t(props.language, { es: "Calendario", en: "Calendar", pt: "Calendário" })}</h2>
          <span>{isCalendarExpanded
            ? t(props.language, { es: "Ocultar", en: "Hide", pt: "Ocultar" })
            : t(props.language, { es: "Expandir", en: "Expand", pt: "Expandir" })}
          </span>
        </button>

        {isCalendarExpanded ? (
          <>
            <div className="agenda-calendar-head">
              <div className="agenda-calendar-nav">
                <button
                  type="button"
                  aria-label={t(props.language, { es: "Anterior", en: "Previous", pt: "Anterior" })}
                  onClick={() =>
                    setViewDate((current) => {
                      const next = new Date(current);
                      next.setDate(current.getDate() - 14);
                      return next;
                    })
                  }
                >
                  ‹
                </button>
                <strong>{getTwoWeekLabel(viewDate, props.language)}</strong>
                <button
                  type="button"
                  aria-label={t(props.language, { es: "Siguiente", en: "Next", pt: "Seguinte" })}
                  onClick={() =>
                    setViewDate((current) => {
                      const next = new Date(current);
                      next.setDate(current.getDate() + 14);
                      return next;
                    })
                  }
                >
                  ›
                </button>
              </div>
            </div>
            {loading ? <p>{t(props.language, { es: "Cargando agenda...", en: "Loading agenda...", pt: "Carregando agenda..." })}</p> : null}
            {error ? <p className="pro-error">{error}</p> : null}
            {!loading && !error && bookings.length === 0 ? (
              <p>{t(props.language, { es: "Todavía no hay sesiones registradas.", en: "There are no sessions yet.", pt: "Ainda nao ha sessoes registradas." })}</p>
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
                                    es: "{count} sesión",
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
          </>
        ) : null}
      </section>
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
                            <span className={`schedule-slot-badge ${slot.reservation ? "reserved" : slot.isBlocked ? (slot.source === "vacation" ? "vacation" : "blocked") : "free"}`}>
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
                                  ? slot.source === "vacation"
                                    ? t(props.language, { es: "Vacaciones", en: "Vacation", pt: "Ferias" })
                                    : t(props.language, { es: "Bloqueado", en: "Blocked", pt: "Bloqueado" })
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
