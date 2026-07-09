import { subscribeDocumentVisibleInterval } from "@therapy/auth";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  formatDateWithLocale,
  textByLanguage
} from "@therapy/i18n-config";
import { DashboardRevenuePeriodControl } from "../components/DashboardRevenuePeriodControl";
import { ProPageLoader } from "../components/ProPageLoader";
import { useProPortalChrome } from "../components/ProPortalChromeContext";
import { ProfessionalPracticeHealth } from "../components/ProfessionalPracticeHealth";
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

function firstProUpcomingSpotlightStorageKey(userId: string): string {
  return `motivarcare.pro.firstUpcomingSpotlight.v1.${userId}`;
}

function KpiWithTooltip(props: { tipId: string; tooltip: string; focusable?: boolean; children: ReactNode }) {
  return (
    <div
      className={`pro-dashboard-kpi-tip-wrap${props.focusable ? " pro-dashboard-kpi-tip-wrap--focusable" : ""}`}
      tabIndex={props.focusable ? 0 : undefined}
      aria-describedby={props.tipId}
    >
      {props.children}
      <div id={props.tipId} role="tooltip" className="pro-dashboard-kpi-tooltip">
        <p>{props.tooltip}</p>
      </div>
    </div>
  );
}

export function DashboardPage(props: {
  token: string;
  language: AppLanguage;
  currency: SupportedCurrency;
  user: AuthUser;
}) {
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
  const [dashboardReloadKey, setDashboardReloadKey] = useState(0);
  /** Solo la card «Dinero ejecutado»: moneda del mercado (API display). */
  const [profileSavedNotice, setProfileSavedNotice] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const upcomingSectionRef = useRef<HTMLElement | null>(null);
  const meetHintHandledRef = useRef(false);
  const [meetJoinHighlight, setMeetJoinHighlight] = useState(false);
  const [firstUpcomingSpotlight, setFirstUpcomingSpotlight] = useState(false);
  const dashboardSpotlightBlockersRef = useRef(false);
  dashboardSpotlightBlockersRef.current = isRescheduleModalOpen || isCancelModalOpen;

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
          setData(null);
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
  }, [props.language, props.token, revenueQuery, dashboardReloadKey]);

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

  const firstMeetBookingId = useMemo(() => {
    for (const b of upcomingReservations) {
      const j = typeof b.joinUrl === "string" ? b.joinUrl.trim() : "";
      if (j) {
        return b.id;
      }
    }
    return null;
  }, [upcomingReservations]);

  const upcomingTourDependency = upcomingReservations
    .map((b) => `${b.id}:${typeof b.joinUrl === "string" ? b.joinUrl.trim().length : 0}`)
    .join("|");

  useEffect(() => {
    meetHintHandledRef.current = false;
  }, [props.user.id]);

  useEffect(() => {
    if (meetHintHandledRef.current) {
      return undefined;
    }
    if (searchParams.get("meet_hint") !== "1") {
      return undefined;
    }
    meetHintHandledRef.current = true;
    const next = new URLSearchParams(searchParams);
    next.delete("meet_hint");
    setSearchParams(next, { replace: true });
    setMeetJoinHighlight(true);
    const tid = window.setTimeout(() => setMeetJoinHighlight(false), 9000);
    return () => window.clearTimeout(tid);
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const uid = props.user.id != null ? String(props.user.id).trim() : "";
    if (!uid || upcomingReservations.length === 0) {
      return undefined;
    }
    let cancelled = false;
    let endSpotlightTimer: number | undefined;
    try {
      if (window.localStorage.getItem(firstProUpcomingSpotlightStorageKey(uid)) === "1") {
        return undefined;
      }
    } catch {
      return undefined;
    }

    const startTimer = window.setTimeout(() => {
      if (cancelled || dashboardSpotlightBlockersRef.current) {
        return;
      }
      try {
        window.localStorage.setItem(firstProUpcomingSpotlightStorageKey(uid), "1");
      } catch {
        // ignore
      }
      setFirstUpcomingSpotlight(true);
      endSpotlightTimer = window.setTimeout(() => {
        setFirstUpcomingSpotlight(false);
      }, 6800);
    }, 700);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      if (endSpotlightTimer) {
        window.clearTimeout(endSpotlightTimer);
      }
    };
  }, [props.user.id, upcomingTourDependency, isRescheduleModalOpen, isCancelModalOpen]);


  const upcomingSpotlightRing = firstUpcomingSpotlight || meetJoinHighlight;
  const highlightJoinPulseBookingId = meetJoinHighlight && firstMeetBookingId ? firstMeetBookingId : null;

  const periodGroupLabel = t(props.language, { es: "Periodo de ingresos", en: "Revenue period", pt: "Periodo de receita" });

  const periodFilters = useMemo(
    () => (
      <DashboardRevenuePeriodControl
        language={props.language}
        preset={revenuePreset}
        day={revenueDay}
        month={revenueMonth}
        year={revenueYear}
        groupLabel={periodGroupLabel}
        onPresetChange={setRevenuePreset}
        onDayChange={setRevenueDay}
        onMonthChange={setRevenueMonth}
        onYearChange={setRevenueYear}
      />
    ),
    [props.language, periodGroupLabel, revenuePreset, revenueDay, revenueMonth, revenueYear]
  );

  useProPortalChrome({
    title: t(props.language, { es: "Dashboard", en: "Dashboard", pt: "Dashboard" }),
    toolbar: periodFilters
  });

  if (error) {
    return (
      <div className="pro-grid-stack pro-dashboard-stack pro-dashboard-home">
        <div className="pro-dashboard-overview">
          <section
            className="pro-card pro-dashboard-revenue pro-dashboard-revenue--floating pro-dashboard-revenue--compact pro-dashboard-hero pro-dashboard-hero--immersive"
          >
            <div className="pro-dashboard-state-panel pro-dashboard-error-card">
              <p className="pro-error">{error}</p>
              <button
                type="button"
                className="pro-btn pro-btn--secondary"
                onClick={() => {
                  setError("");
                  setData(null);
                  setDashboardReloadKey((n) => n + 1);
                }}
              >
                {t(props.language, { es: "Reintentar", en: "Try again", pt: "Tentar de novo" })}
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="pro-grid-stack pro-dashboard-stack pro-dashboard-home">
        <ProPageLoader language={props.language} layout="block" />
      </div>
    );
  }

  const displayCurrency = data.display?.currency ?? props.currency.toLowerCase();
  const executedAmountLabel = formatRecordedFinanceMinor(
    data.display?.executedGrossCents ?? data.revenueStats.grossCents,
    displayCurrency,
    props.language
  );
  const pendingCollectLabel = formatRecordedFinanceMinor(
    data.display?.pendingToCollectCents ?? data.kpis.pendingPayoutCents,
    displayCurrency,
    props.language
  );
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
        current
          .map((item) =>
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
          .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
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

  const executedMoneyTooltip = t(props.language, {
    es: "Total de Ingreso bruto de sesiones ya realizadas, en el periodo definido en los filtros.",
    en: "Total gross revenue from sessions already completed, in the period set by the filters above.",
    pt: "Total de receita bruta de sessoes ja realizadas, no periodo definido nos filtros."
  });
  const pendingCollectTooltip = t(props.language, {
    es: "Total de ingreso neto pendiente de cobro por sesiones ya ejecutadas.",
    en: "Total net revenue still pending payout for completed sessions.",
    pt: "Total de receita liquida pendente de recebimento por sessoes ja executadas."
  });
  const scheduledSessionsTooltip = t(props.language, {
    es: "Sesiones confirmadas con inicio en el período elegido arriba. Tocá para ver la lista de próximas reservas.",
    en: "Confirmed sessions starting in the period selected above. Tap to view upcoming bookings.",
    pt: "Sessoes confirmadas no periodo escolhido acima. Toque para ver as proximas reservas."
  });
  const activePatientsTooltip = t(props.language, {
    es: "Cantidad de pacientes con estado activo en tu consultorio. Tocá para ver el listado completo.",
    en: "Number of patients with active status in your practice. Tap to open the full list.",
    pt: "Quantidade de pacientes com status ativo. Toque para ver a lista completa."
  });

  return (
    <div className="pro-grid-stack pro-dashboard-stack pro-dashboard-home">
      {profileSavedNotice ? (
        <p className="pro-success pro-dashboard-flash" role="status">
          {profileSavedNotice}
        </p>
      ) : null}
      <div className="pro-dashboard-overview">
        <section
          className="pro-card pro-dashboard-revenue pro-dashboard-revenue--floating pro-dashboard-revenue--compact pro-dashboard-hero pro-dashboard-hero--immersive"
          data-tour="pro-tour-hero"
        >

          <div
            className="pro-dashboard-kpi-row"
            role="group"
            aria-label={t(props.language, { es: "Resumen rápido", en: "Quick summary", pt: "Resumo rapido" })}
            data-tour="pro-tour-kpis"
          >
          <KpiWithTooltip tipId="pro-dashboard-tip-ejecutado" tooltip={executedMoneyTooltip} focusable>
            <NavLink className="pro-kpi-card pro-kpi-card-link pro-kpi-card--executed-revenue" to="/ingresos#sesiones-ejecutadas">
              <span className="pro-executed-revenue-label">
                {t(props.language, { es: "Dinero ejecutado", en: "Executed revenue", pt: "Receita executada" })}
              </span>
              <strong className="pro-kpi-executed-amount">{executedAmountLabel}</strong>
              <small className="pro-kpi-executed-meta">
                {t(props.language, {
                  es: `${data.revenueStats.completedSessions} sesiones · ver detalle`,
                  en: `${data.revenueStats.completedSessions} sessions · view detail`,
                  pt: `${data.revenueStats.completedSessions} sessoes · ver detalhe`
                })}
              </small>
              <em>{t(props.language, { es: "Ver sesiones ejecutadas", en: "View completed sessions", pt: "Ver sessoes executadas" })}</em>
            </NavLink>
          </KpiWithTooltip>
          <KpiWithTooltip tipId="pro-dashboard-tip-agendadas" tooltip={scheduledSessionsTooltip}>
            <NavLink className="pro-kpi-card pro-kpi-card-link" to="/#sesiones-agendadas">
              <span>{t(props.language, { es: "Sesiones agendadas", en: "Scheduled sessions", pt: "Sessoes agendadas" })}</span>
              <strong>{data.kpis.sessionsScheduled}</strong>
              <em>{t(props.language, { es: "Ver próximas reservas", en: "View upcoming bookings", pt: "Ver próximas reservas" })}</em>
            </NavLink>
          </KpiWithTooltip>
          <KpiWithTooltip tipId="pro-dashboard-tip-pacientes" tooltip={activePatientsTooltip}>
            <NavLink className="pro-kpi-card pro-kpi-card-link" to="/pacientes">
              <span>{t(props.language, { es: "Pacientes activos", en: "Active patients", pt: "Pacientes ativos" })}</span>
              <strong>{data.kpis.activePatients}</strong>
              <em>{t(props.language, { es: "Ver pacientes", en: "View patients", pt: "Ver pacientes" })}</em>
            </NavLink>
          </KpiWithTooltip>
          <KpiWithTooltip tipId="pro-dashboard-tip-cobrar" tooltip={pendingCollectTooltip}>
            <NavLink className="pro-kpi-card pro-kpi-card-link" to="/ingresos">
              <span>{t(props.language, { es: "A cobrar", en: "To collect", pt: "A receber" })}</span>
              <strong>{pendingCollectLabel}</strong>
              <em>{t(props.language, { es: "Revisar cobros", en: "Review payouts", pt: "Revisar recebimentos" })}</em>
            </NavLink>
          </KpiWithTooltip>
          </div>
        </section>
      </div>

      {data.practiceHealth && data.practiceHealth.items.length > 0 ? (
        <ProfessionalPracticeHealth
          language={props.language}
          variant={data.practiceHealth.variant}
          items={data.practiceHealth.items}
        />
      ) : null}

      <section
        className={`pro-card agenda-upcoming-panel pro-dashboard-upcoming-gap${upcomingSpotlightRing ? " pro-dashboard-upcoming-spotlight" : ""}`}
        id="sesiones-agendadas"
        ref={upcomingSectionRef}
        tabIndex={-1}
        data-tour="pro-tour-bookings"
      >
        <div className="agenda-upcoming-head">
          <h2>{t(props.language, { es: "Próximas Reservas", en: "Upcoming bookings", pt: "Próximas reservas" })}</h2>
        </div>
        <UpcomingReservationsList
          language={props.language}
          reservations={upcomingReservations}
          busyBookingId={bookingActionInProgressId}
          onRequestReschedule={openRescheduleModal}
          onRequestCancel={openCancelModal}
          highlightJoinPulseBookingId={highlightJoinPulseBookingId}
          joinTourTargetBookingId={firstMeetBookingId}
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
