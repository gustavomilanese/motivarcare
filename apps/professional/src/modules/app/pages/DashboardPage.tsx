import { subscribeDocumentVisibleInterval } from "@therapy/auth";
import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  formatCurrencyCents,
  formatDateWithLocale,
  textByLanguage
} from "@therapy/i18n-config";
import { PatientStatusSummaryBar, ProfessionalPracticeHealth } from "../components/ProfessionalPracticeHealth";
import { type UpcomingReservationItem, UpcomingReservationsList } from "../components/agenda/UpcomingReservationsList";
import {
  buildProfessionalStatsQuery,
  type RevenuePreset,
  ymLocal,
  ymdLocal
} from "../lib/professionalStatsRangeQuery";
import { formatRecordedFinanceMinor } from "../lib/formatRecordedFinanceMinor";
import { professionalSurfaceMessage } from "../lib/friendlyProfessionalSurfaceMessages";
import { apiRequest } from "../services/api";
import type { AuthUser, AvailabilitySlot, DashboardResponse } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatDateTime(value: string, language: AppLanguage): string {
  return formatDateWithLocale({
    value,
    language,
    options: {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
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

function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return new Date(startA).getTime() < new Date(endB).getTime() && new Date(endA).getTime() > new Date(startB).getTime();
}

type DashboardLocationState = { profileUpdated?: boolean };

function formatMoneyCents(cents: number, language: AppLanguage, currency: SupportedCurrency): string {
  return formatCurrencyCents({
    centsInUsd: cents,
    language,
    currency,
    maximumFractionDigits: 0
  });
}

export function DashboardPage(props: { token: string; language: AppLanguage; currency: SupportedCurrency; user: AuthUser }) {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [upcomingReservations, setUpcomingReservations] = useState<UpcomingReservationItem[]>([]);
  const [error, setError] = useState("");
  const [bookingActionInProgressId, setBookingActionInProgressId] = useState<string | null>(null);
  const [bookingActionError, setBookingActionError] = useState("");
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleTargetBooking, setRescheduleTargetBooking] = useState<UpcomingReservationItem | null>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedRescheduleSlotKey, setSelectedRescheduleSlotKey] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelTargetBooking, setCancelTargetBooking] = useState<UpcomingReservationItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [revenuePreset, setRevenuePreset] = useState<RevenuePreset>("month");
  const [revenueDay, setRevenueDay] = useState(() => ymdLocal(new Date()));
  const [revenueMonth, setRevenueMonth] = useState(() => ymLocal(new Date()));
  const [revenueYear, setRevenueYear] = useState(() => String(new Date().getFullYear()));
  const [profileSavedNotice, setProfileSavedNotice] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const upcomingSectionRef = useRef<HTMLElement | null>(null);

  const revenueQuery = buildProfessionalStatsQuery(revenuePreset, revenueDay, revenueMonth, revenueYear);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await apiRequest<DashboardResponse>(`/api/professional/dashboard${revenueQuery}`, props.token);
        if (active) {
          setData(response);
          setUpcomingReservations(
            (response.upcomingSessions ?? []).slice(0, 8).map((session) => ({
              id: session.id,
              startsAt: session.startsAt,
              endsAt: session.endsAt,
              patientName: session.patientName,
              patientEmail: session.patientEmail,
              patientAvatarUrl: session.patientAvatarUrl ?? null,
              status: session.status,
              joinUrl: session.joinUrl
            }))
          );
          setError("");
        }
      } catch (requestError) {
        if (active) {
          const raw = requestError instanceof Error ? requestError.message : "";
          setError(professionalSurfaceMessage("dashboard-load", props.language, raw));
        }
      }
    };

    load();
    const unsubscribe = subscribeDocumentVisibleInterval(() => {
      void load();
    }, 30_000);

    return () => {
      active = false;
      unsubscribe();
    };
  }, [props.language, props.token, revenueQuery]);

  useEffect(() => {
    const state = location.state as DashboardLocationState | null;
    if (!state?.profileUpdated) {
      return;
    }
    setProfileSavedNotice(
      t(props.language, { es: "Perfil actualizado.", en: "Profile updated.", pt: "Perfil atualizado." })
    );
    navigate(
      { pathname: location.pathname, search: location.search, hash: location.hash },
      { replace: true, state: {} }
    );
  }, [location.state, location.pathname, location.search, location.hash, navigate, props.language]);

  useEffect(() => {
    if (!profileSavedNotice) {
      return;
    }
    const timer = window.setTimeout(() => setProfileSavedNotice(""), 8000);
    return () => window.clearTimeout(timer);
  }, [profileSavedNotice]);

  useEffect(() => {
    if (location.hash !== "#sesiones-agendadas") {
      return;
    }

    const section = upcomingSectionRef.current;
    if (!section) {
      return;
    }

    section.scrollIntoView({ behavior: "smooth", block: "start" });
    section.focus({ preventScroll: true });
  }, [location.hash, upcomingReservations]);

  useEffect(() => {
    if (!isRescheduleModalOpen) {
      return;
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsRescheduleModalOpen(false);
        setRescheduleTargetBooking(null);
        setRescheduleSlots([]);
        setSelectedRescheduleSlotKey("");
        setRescheduleReason("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isRescheduleModalOpen]);

  useEffect(() => {
    if (!isCancelModalOpen) {
      return;
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCancelModalOpen(false);
        setCancelTargetBooking(null);
        setCancelReason("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isCancelModalOpen]);

  if (error) {
    return <section className="pro-card"><p className="pro-error">{error}</p></section>;
  }

  if (!data) {
    return (
      <section className="pro-card">
        <p>{t(props.language, { es: "Cargando dashboard...", en: "Loading dashboard...", pt: "Carregando dashboard..." })}</p>
      </section>
    );
  }

  const byCurrency = data.revenueStats.byCurrency ?? [];
  const fallbackArs =
    byCurrency.find((row) => row.currency.toLowerCase() === "ars")?.grossCents
    ?? (props.currency.toLowerCase() === "ars" ? data.revenueStats.grossCents : 0);
  const executedArsCents = data.revenueStats.executedDisplay?.arsGrossCents ?? fallbackArs;
  const executedUsdCents = data.revenueStats.executedDisplay?.usdHardCents ?? 0;

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
        return !upcomingReservations.some(
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
      setBookingActionError(professionalSurfaceMessage("dashboard-reschedule-availability", props.language, raw));
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

      setUpcomingReservations((current) =>
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
      setBookingActionError(professionalSurfaceMessage("dashboard-reschedule-save", props.language, raw));
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

      setUpcomingReservations((current) =>
        current.map((item) => (item.id === cancelTargetBooking.id ? { ...item, status: "cancelled" } : item))
      );
      setIsCancelModalOpen(false);
      setCancelTargetBooking(null);
      setCancelReason("");
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setBookingActionError(professionalSurfaceMessage("dashboard-cancel-booking", props.language, raw));
    } finally {
      setBookingActionInProgressId(null);
    }
  };

  const periodGroupLabel = t(props.language, { es: "Periodo de ingresos", en: "Revenue period", pt: "Periodo de receita" });
  const presetAria = t(props.language, { es: "Intervalo del resumen", en: "Summary range", pt: "Intervalo do resumo" });
  const dateAria =
    revenuePreset === "week"
      ? t(props.language, { es: "Fecha en la semana a mostrar", en: "Date within week to show", pt: "Data na semana a exibir" })
      : t(props.language, { es: "Dia a mostrar", en: "Day to show", pt: "Dia a exibir" });
  const monthAria = t(props.language, { es: "Mes a mostrar", en: "Month to show", pt: "Mes a exibir" });
  const yearAria = t(props.language, { es: "Año a mostrar", en: "Year to show", pt: "Ano a exibir" });

  return (
    <div className="pro-grid-stack pro-dashboard-stack">
      {profileSavedNotice ? (
        <p className="pro-success pro-dashboard-flash" role="status">
          {profileSavedNotice}
        </p>
      ) : null}
      <section
        className="pro-card pro-dashboard-revenue pro-dashboard-revenue--floating"
        aria-labelledby="pro-revenue-heading"
      >
        <div className="pro-dashboard-revenue-top-row">
          <div className="pro-dashboard-revenue-head pro-dashboard-revenue-head--compact">
            <h2 id="pro-revenue-heading" className="pro-dashboard-revenue-title pro-dashboard-revenue-title--page">
              {t(props.language, { es: "Dashboard", en: "Dashboard", pt: "Dashboard" })}
            </h2>
          </div>
          <div
            className="pro-dashboard-revenue-toolbar pro-dashboard-revenue-toolbar--minimal"
            role="group"
            aria-label={periodGroupLabel}
          >
          <select
            className="pro-dashboard-revenue-control"
            value={revenuePreset}
            aria-label={presetAria}
            onChange={(event) => setRevenuePreset(event.target.value as RevenuePreset)}
          >
            <option value="day">{t(props.language, { es: "Día", en: "Day", pt: "Dia" })}</option>
            <option value="week">{t(props.language, { es: "Semana", en: "Week", pt: "Semana" })}</option>
            <option value="month">{t(props.language, { es: "Mes", en: "Month", pt: "Mes" })}</option>
            <option value="year">{t(props.language, { es: "Año", en: "Year", pt: "Ano" })}</option>
            <option value="all">{t(props.language, { es: "Todo", en: "All", pt: "Todo" })}</option>
          </select>
          {revenuePreset === "day" || revenuePreset === "week" ? (
            <input
              className="pro-dashboard-revenue-control"
              type="date"
              value={revenueDay}
              aria-label={dateAria}
              onChange={(event) => setRevenueDay(event.target.value)}
            />
          ) : null}
          {revenuePreset === "month" ? (
            <input
              className="pro-dashboard-revenue-control"
              type="month"
              value={revenueMonth}
              aria-label={monthAria}
              onChange={(event) => setRevenueMonth(event.target.value)}
            />
          ) : null}
          {revenuePreset === "year" ? (
            <input
              className="pro-dashboard-revenue-control pro-dashboard-revenue-control--year"
              type="number"
              min={2020}
              max={2035}
              value={revenueYear}
              aria-label={yearAria}
              onChange={(event) => setRevenueYear(event.target.value)}
            />
          ) : null}
          </div>
        </div>
        <div className="pro-executed-revenue">
          <div className="pro-executed-revenue-main">
            <span className="pro-executed-revenue-label">
              {t(props.language, { es: "Dinero ejecutado (ARS)", en: "Executed revenue (ARS)", pt: "Receita executada (ARS)" })}
            </span>
            <strong>{formatRecordedFinanceMinor(executedArsCents, "ars", props.language)}</strong>
            <small>
              {t(props.language, {
                es: `${data.revenueStats.completedSessions} sesiones en el período`,
                en: `${data.revenueStats.completedSessions} sessions in period`,
                pt: `${data.revenueStats.completedSessions} sessoes no periodo`
              })}
            </small>
          </div>
          <aside
            className="pro-executed-revenue-side"
            aria-label={t(props.language, { es: "Moneda dura", en: "Hard currency", pt: "Moeda forte" })}
          >
            <div className="pro-executed-revenue-side-row">
              <span>USD</span>
              <strong>{formatRecordedFinanceMinor(executedUsdCents, "usd", props.language)}</strong>
            </div>
          </aside>
        </div>
        <p className="pro-dashboard-revenue-microhint">
          {t(props.language, {
            es: "El USD es el equivalente en moneda dura según el tipo de cambio registrado al cobrar cada paquete en ARS.",
            en: "USD shows hard-currency equivalent using the FX snapshot captured at each ARS checkout.",
            pt: "USD mostra o equivalente em moeda forte usando o cambio salvo no checkout ARS."
          })}
        </p>
      </section>

      {data.practiceHealth && data.practiceHealth.items.length > 0 ? (
        <ProfessionalPracticeHealth
          language={props.language}
          variant={data.practiceHealth.variant}
          items={data.practiceHealth.items}
        />
      ) : null}
      {data.patientStatusCounts ? (
        <PatientStatusSummaryBar language={props.language} counts={data.patientStatusCounts} />
      ) : null}

      <section className="pro-kpi-grid">
        <NavLink className="pro-kpi-card pro-kpi-card-link" to="/#sesiones-agendadas">
          <span>{t(props.language, { es: "Sesiones agendadas", en: "Scheduled sessions", pt: "Sessoes agendadas" })}</span>
          <strong>{data.kpis.sessionsScheduled}</strong>
          <em>{t(props.language, { es: "Ver próximas reservas", en: "View upcoming bookings", pt: "Ver próximas reservas" })}</em>
        </NavLink>
        <NavLink className="pro-kpi-card pro-kpi-card-link" to="/pacientes">
          <span>{t(props.language, { es: "Pacientes activos", en: "Active patients", pt: "Pacientes ativos" })}</span>
          <strong>{data.kpis.activePatients}</strong>
          <em>{t(props.language, { es: "Ver pacientes", en: "View patients", pt: "Ver pacientes" })}</em>
        </NavLink>
        <NavLink className="pro-kpi-card pro-kpi-card-link" to="/ingresos">
          <span>{t(props.language, { es: "A cobrar", en: "To collect", pt: "A receber" })}</span>
          <strong>{formatMoneyCents(data.kpis.pendingPayoutCents, props.language, props.currency)}</strong>
          <em>{t(props.language, { es: "Revisar cobros", en: "Review payouts", pt: "Revisar recebimentos" })}</em>
        </NavLink>
      </section>

      <section className="pro-card agenda-upcoming-panel pro-dashboard-upcoming-gap" id="sesiones-agendadas" ref={upcomingSectionRef} tabIndex={-1}>
        <div className="agenda-upcoming-head">
          <h2>{t(props.language, { es: "Próximas Reservas", en: "Upcoming bookings", pt: "Próximas reservas" })}</h2>
        </div>
        <UpcomingReservationsList
          language={props.language}
          reservations={upcomingReservations}
          busyBookingId={bookingActionInProgressId}
          onRequestReschedule={openRescheduleModal}
          onRequestCancel={openCancelModal}
        />
        {bookingActionError ? <p className="pro-error">{bookingActionError}</p> : null}
      </section>

      {isRescheduleModalOpen ? (
        <div className="pro-reschedule-modal-backdrop" role="presentation" onClick={() => setIsRescheduleModalOpen(false)}>
          <section className="pro-reschedule-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header>
              <h3>{t(props.language, { es: "Reagendar reserva", en: "Reschedule booking", pt: "Reagendar reserva" })}</h3>
              <button type="button" onClick={() => setIsRescheduleModalOpen(false)} aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}>×</button>
            </header>
            <label>
              <span>{t(props.language, { es: "Nuevo horario", en: "New time", pt: "Novo horario" })}</span>
              <select value={selectedRescheduleSlotKey} onChange={(event) => setSelectedRescheduleSlotKey(event.target.value)}>
                <option value="">
                  {rescheduleSlots.length === 0
                    ? t(props.language, { es: "Sin horarios disponibles", en: "No available slots", pt: "Sem horarios disponiveis" })
                    : t(props.language, { es: "Selecciona un horario", en: "Select a slot", pt: "Selecione um horario" })}
                </option>
                {rescheduleSlots.map((slot) => (
                  <option key={buildSlotKey(slot.startsAt, slot.endsAt)} value={buildSlotKey(slot.startsAt, slot.endsAt)}>
                    {formatDateTime(slot.startsAt, props.language)} · {formatTime(slot.endsAt, props.language)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t(props.language, { es: "Motivo (opcional)", en: "Reason (optional)", pt: "Motivo (opcional)" })}</span>
              <textarea
                value={rescheduleReason}
                onChange={(event) => setRescheduleReason(event.target.value)}
                placeholder={t(props.language, { es: "Ej: ajuste de agenda clínica.", en: "e.g. schedule adjustment.", pt: "Ex: ajuste de agenda clinica." })}
              />
            </label>
            <div className="pro-reschedule-modal-actions">
              <button type="button" onClick={() => setIsRescheduleModalOpen(false)}>
                {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
              </button>
              <button type="button" className="primary" disabled={!selectedRescheduleSlotKey || bookingActionInProgressId === rescheduleTargetBooking?.id} onClick={() => void submitReschedule()}>
                {bookingActionInProgressId === rescheduleTargetBooking?.id
                  ? t(props.language, { es: "Guardando...", en: "Saving...", pt: "Salvando..." })
                  : t(props.language, { es: "Guardar cambio", en: "Save change", pt: "Salvar alteracao" })}
              </button>
            </div>
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
    </div>
  );
}
