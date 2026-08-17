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
import { RevenueMonthPicker } from "../components/RevenueMonthPicker";
import { ProPageLoader } from "../components/ProPageLoader";
import { useProPortalChrome } from "../components/ProPortalChromeContext";
import { ProfessionalPracticeHealth } from "../components/ProfessionalPracticeHealth";
import { SessionStatusFlowLegend } from "../components/SessionStatusFlowLegend";
import { type UpcomingReservationItem, UpcomingReservationsList } from "../components/agenda/UpcomingReservationsList";
import { PendingExecutionSessionsList, type SessionListFilter } from "../components/agenda/PendingExecutionSessionsList";
import {
  buildProfessionalStatsQuery,
  buildSessionsMonthQuery,
  type RevenuePreset,
  ymLocal,
  ymdLocal
} from "../lib/professionalStatsRangeQuery";
import { formatRecordedFinanceMinor } from "../lib/formatRecordedFinanceMinor";
import { formatRevenuePeriodLabel } from "../lib/formatRevenuePeriodLabel";
import { professionalSurfaceMessage } from "../lib/friendlyProfessionalSurfaceMessages";
import { isReadyForCobroSession, readyForCobroNetsKnown, sumReadyForCobroNetCents } from "../lib/sessionLifecycle";
import { rangesOverlap } from "../lib/timeRanges";
import { apiRequest } from "../services/api";
import { fetchEmotionalDiarySentReports } from "../../patients/services/emotionalDiaryApi";
import type { AuthUser, AvailabilitySlot, DashboardResponse } from "../types";
import type { EmotionalDiarySentReportItem } from "@therapy/types";

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
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }
  });
}

function formatTime(value: string, language: AppLanguage): string {
  return formatDateWithLocale({
    value,
    language,
    options: {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }
  });
}

function buildSlotKey(startsAt: string, endsAt: string): string {
  return `${startsAt}__${endsAt}`;
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
  const [pendingExecutionSessions, setPendingExecutionSessions] = useState<UpcomingReservationItem[]>([]);
  const [diaryReports, setDiaryReports] = useState<EmotionalDiarySentReportItem[]>([]);
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
  /** Solo la card «Dinero realizado»: moneda del mercado (API display). */
  const [profileSavedNotice, setProfileSavedNotice] = useState("");
  const [sessionsHubTab, setSessionsHubTab] = useState<"upcoming" | "settle">("upcoming");
  const [sessionListFilter, setSessionListFilter] = useState<SessionListFilter>("all");
  const [sessionListMonth, setSessionListMonth] = useState(() => ymLocal(new Date()));
  const [bulkConfirmAction, setBulkConfirmAction] = useState<null | "complete" | "uncomplete" | "submit-payout">(null);
  const [bulkTargetBookings, setBulkTargetBookings] = useState<UpcomingReservationItem[]>([]);
  const [selectionEpoch, setSelectionEpoch] = useState(0);
  const [payoutReadiness, setPayoutReadiness] = useState<{ ready: boolean; reason: string | null } | null>(null);
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
  const dashboardQuery = `${revenueQuery}&${buildSessionsMonthQuery(sessionListMonth)}`;

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [response, reports, readiness] = await Promise.all([
          apiRequest<DashboardResponse>(`/api/professional/dashboard${dashboardQuery}`, props.token),
          fetchEmotionalDiarySentReports(props.token).catch(() => [] as EmotionalDiarySentReportItem[]),
          apiRequest<{ ready: boolean; reason: string | null }>("/api/payouts/me/readiness", props.token).catch(
            () => null
          )
        ]);
        if (active) {
          setData(response);
          setDiaryReports(Array.isArray(reports) ? reports : []);
          if (readiness) {
            setPayoutReadiness({ ready: Boolean(readiness.ready), reason: readiness.reason ?? null });
          }
          setUpcomingReservations(
            (response.upcomingSessions ?? []).map((session) => ({
              id: session.id,
              startsAt: session.startsAt,
              endsAt: session.endsAt,
              patientId: session.patientId,
              patientName: session.patientName,
              patientEmail: session.patientEmail,
              patientAvatarUrl: session.patientAvatarUrl ?? null,
              status: session.status,
              joinUrl: session.joinUrl ?? null
            }))
          );
          setPendingExecutionSessions(
            (response.pendingExecutionSessions ?? []).map((session) => ({
              id: session.id,
              startsAt: session.startsAt,
              endsAt: session.endsAt,
              patientId: session.patientId,
              patientName: session.patientName,
              patientEmail: session.patientEmail,
              patientAvatarUrl: session.patientAvatarUrl ?? null,
              status: session.status,
              joinUrl: session.joinUrl ?? null,
              canUncomplete: session.canUncomplete,
              submittedForPayout: session.submittedForPayout,
              payoutPaid: session.payoutPaid,
              netDisplayCents: session.netDisplayCents
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
  }, [props.language, props.token, dashboardQuery, dashboardReloadKey]);

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
    if (location.hash === "#sesiones-por-ejecutar") {
      setSessionsHubTab("settle");
    } else if (location.hash === "#sesiones-agendadas") {
      setSessionsHubTab("upcoming");
    } else {
      return;
    }

    const section = upcomingSectionRef.current;
    if (!section) {
      return;
    }

    section.scrollIntoView({ behavior: "smooth", block: "start" });
    section.focus({ preventScroll: true });
  }, [location.hash, upcomingReservations, pendingExecutionSessions]);

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

  const bulkBusy = bookingActionInProgressId === "__bulk__";

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

  useEffect(() => {
    if (upcomingSpotlightRing) {
      setSessionsHubTab("upcoming");
    }
  }, [upcomingSpotlightRing]);

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

  const pageTitle = t(props.language, { es: "Dashboard", en: "Dashboard", pt: "Dashboard" });
  const statusFlowLegend = useMemo(
    () => <SessionStatusFlowLegend language={props.language} />,
    [props.language]
  );

  const diaryReportByPatientId = useMemo(() => {
    const map = new Map<string, EmotionalDiarySentReportItem>();
    for (const report of diaryReports) {
      if (!map.has(report.patientId)) {
        map.set(report.patientId, report);
      }
    }
    return map;
  }, [diaryReports]);

  const recentDiaryReports = useMemo(() => diaryReports.slice(0, 5), [diaryReports]);

  useProPortalChrome({
    title: pageTitle,
    center: statusFlowLegend,
    toolbar: periodFilters
  });

  if (error) {
    return (
      <div className="pro-grid-stack pro-dashboard-stack pro-dashboard-home">
        <div className="pro-dashboard-overview">
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
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="pro-grid-stack pro-dashboard-stack pro-dashboard-home">
        <div className="pro-dashboard-overview">
          <ProPageLoader language={props.language} layout="block" />
        </div>
      </div>
    );
  }

  const displayCurrency = data.display?.currency ?? props.currency.toLowerCase();
  const executedAmountLabel = formatRecordedFinanceMinor(
    data.display?.executedNetCents ?? data.revenueStats.professionalNetCents,
    displayCurrency,
    props.language
  );
  const pendingCollectLabel = formatRecordedFinanceMinor(
    data.display?.pendingToCollectCents ?? data.kpis.pendingPayoutCents,
    displayCurrency,
    props.language
  );
  const readyForCobroSessions = pendingExecutionSessions.filter(isReadyForCobroSession);
  const readyForCobroNetsReady = readyForCobroNetsKnown(pendingExecutionSessions);
  const readyForCobroNetLabel = formatRecordedFinanceMinor(
    sumReadyForCobroNetCents(readyForCobroSessions),
    displayCurrency,
    props.language
  );
  const payoutReady = payoutReadiness?.ready !== false;
  const payoutBlockedReason = payoutReadiness && !payoutReadiness.ready
    ? payoutReadiness.reason?.trim() ||
      t(props.language, {
        es: "Completá tus datos de cobro en Perfil para poder enviar sesiones.",
        en: "Complete your payout details in Profile before sending sessions.",
        pt: "Complete seus dados de cobranca no Perfil para enviar sessoes."
      })
    : "";
  const openRescheduleModal = async (booking: UpcomingReservationItem) => {
    setBookingActionError("");
    setBookingActionInProgressId(booking.id);
    try {
      const [slotsResponse, bookingsResponse] = await Promise.all([
        apiRequest<{ slots: AvailabilitySlot[] }>("/api/availability/me/slots", props.token),
        apiRequest<{ bookings: Array<{ id: string; startsAt: string; endsAt: string; status: string }> }>(
          "/api/bookings/mine",
          props.token
        )
      ]);
      const nowMs = Date.now();
      const activeBookings = (bookingsResponse.bookings ?? []).filter((item) => {
        const status = item.status.toLowerCase();
        return status === "confirmed" || status === "requested";
      });
      // Sin tope de 24 h para el profesional: puede mover a cualquier hueco libre futuro.
      const options = (slotsResponse.slots ?? []).filter((slot) => {
        if (slot.isBlocked) {
          return false;
        }
        if (new Date(slot.startsAt).getTime() < nowMs) {
          return false;
        }
        return !activeBookings.some(
          (existingBooking) =>
            existingBooking.id !== booking.id
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
        current.filter((item) => item.id !== cancelTargetBooking.id)
      );
      setDashboardReloadKey((value) => value + 1);
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

  const submitMarkExecuted = async (booking: UpcomingReservationItem) => {
    setBookingActionError("");
    setBookingActionInProgressId(booking.id);
    try {
      await apiRequest<{ message: string }>(`/api/bookings/${booking.id}/complete`, props.token, {
        method: "POST",
        body: JSON.stringify({})
      });
      setPendingExecutionSessions((current) =>
        current
          .map((item) =>
            item.id === booking.id ? { ...item, status: "completed", canUncomplete: true } : item
          )
          .sort((a, b) => {
            const aDone = a.status.toLowerCase() === "completed" ? 1 : 0;
            const bDone = b.status.toLowerCase() === "completed" ? 1 : 0;
            if (aDone !== bDone) {
              return aDone - bDone;
            }
            return new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
          })
      );
      setUpcomingReservations((current) => current.filter((item) => item.id !== booking.id));
      setDashboardReloadKey((value) => value + 1);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setBookingActionError(professionalSurfaceMessage("dashboard-complete-booking", props.language, raw));
    } finally {
      setBookingActionInProgressId(null);
    }
  };

  const submitUndoExecuted = async (booking: UpcomingReservationItem) => {
    setBookingActionError("");
    setBookingActionInProgressId(booking.id);
    try {
      await apiRequest<{ message: string }>(`/api/bookings/${booking.id}/uncomplete`, props.token, {
        method: "POST",
        body: JSON.stringify({})
      });
      setPendingExecutionSessions((current) =>
        current
          .map((item) =>
            item.id === booking.id ? { ...item, status: "confirmed", canUncomplete: undefined } : item
          )
          .sort((a, b) => {
            const aDone = a.status.toLowerCase() === "completed" ? 1 : 0;
            const bDone = b.status.toLowerCase() === "completed" ? 1 : 0;
            if (aDone !== bDone) {
              return aDone - bDone;
            }
            return new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
          })
      );
      if (new Date(booking.startsAt).getTime() >= Date.now()) {
        setUpcomingReservations((current) => {
          if (current.some((item) => item.id === booking.id)) {
            return current;
          }
          return [...current, { ...booking, status: "confirmed", canUncomplete: undefined }].sort(
            (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
          );
        });
      }
      setDashboardReloadKey((value) => value + 1);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setBookingActionError(professionalSurfaceMessage("dashboard-uncomplete-booking", props.language, raw));
    } finally {
      setBookingActionInProgressId(null);
    }
  };

  const applyBulkCompleteResult = (
    completedIds: string[],
    failed: Array<{ bookingId: string; error: string }>
  ) => {
    if (completedIds.length > 0) {
      const completedSet = new Set(completedIds);
      setPendingExecutionSessions((current) =>
        current
          .map((item) =>
            completedSet.has(item.id) ? { ...item, status: "completed", canUncomplete: true } : item
          )
          .sort((a, b) => {
            const aDone = a.status.toLowerCase() === "completed" ? 1 : 0;
            const bDone = b.status.toLowerCase() === "completed" ? 1 : 0;
            if (aDone !== bDone) {
              return aDone - bDone;
            }
            return new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
          })
      );
      setUpcomingReservations((current) => current.filter((item) => !completedSet.has(item.id)));
      setDashboardReloadKey((value) => value + 1);
    }
    if (failed.length > 0) {
      setBookingActionError(
        professionalSurfaceMessage(
          "dashboard-complete-batch",
          props.language,
          `${failed.length} session(s) could not be updated`
        )
      );
    }
  };

  const submitBulkComplete = async () => {
    const bookingIds = bulkTargetBookings.map((session) => session.id);
    if (bookingIds.length === 0) {
      setBulkConfirmAction(null);
      return;
    }
    setBookingActionError("");
    setBookingActionInProgressId("__bulk__");
    try {
      const response = await apiRequest<{
        completedCount: number;
        failedCount: number;
        completed: Array<{ id: string }>;
        failed: Array<{ bookingId: string; error: string }>;
      }>("/api/bookings/batch/complete", props.token, {
        method: "POST",
        body: JSON.stringify({ bookingIds })
      });
      applyBulkCompleteResult(
        (response.completed ?? []).map((item) => item.id),
        response.failed ?? []
      );
      setBulkConfirmAction(null);
      setBulkTargetBookings([]);
      setSelectionEpoch((value) => value + 1);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setBookingActionError(professionalSurfaceMessage("dashboard-complete-batch", props.language, raw));
    } finally {
      setBookingActionInProgressId(null);
    }
  };

  const submitBulkUncomplete = async () => {
    const bookingIds = bulkTargetBookings.map((session) => session.id);
    if (bookingIds.length === 0) {
      setBulkConfirmAction(null);
      return;
    }
    setBookingActionError("");
    setBookingActionInProgressId("__bulk__");
    try {
      const response = await apiRequest<{
        revertedCount: number;
        failedCount: number;
        reverted: Array<{ id: string }>;
        failed: Array<{ bookingId: string; error: string }>;
      }>("/api/bookings/batch/uncomplete", props.token, {
        method: "POST",
        body: JSON.stringify({ bookingIds })
      });
      const revertedIds = new Set((response.reverted ?? []).map((item) => item.id));
      if (revertedIds.size > 0) {
        setPendingExecutionSessions((current) =>
          current
            .map((item) =>
              revertedIds.has(item.id) ? { ...item, status: "confirmed", canUncomplete: undefined } : item
            )
            .sort((a, b) => {
              const aDone = a.status.toLowerCase() === "completed" ? 1 : 0;
              const bDone = b.status.toLowerCase() === "completed" ? 1 : 0;
              if (aDone !== bDone) {
                return aDone - bDone;
              }
              return new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
            })
        );
        setDashboardReloadKey((value) => value + 1);
      }
      if ((response.failed ?? []).length > 0) {
        setBookingActionError(
          professionalSurfaceMessage(
            "dashboard-uncomplete-batch",
            props.language,
            `${response.failed.length} session(s) could not be updated`
          )
        );
      }
      setBulkConfirmAction(null);
      setBulkTargetBookings([]);
      setSelectionEpoch((value) => value + 1);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setBookingActionError(professionalSurfaceMessage("dashboard-uncomplete-batch", props.language, raw));
    } finally {
      setBookingActionInProgressId(null);
    }
  };

  const submitSessionsForPayout = async (bookings: UpcomingReservationItem[]) => {
    const bookingIds = bookings.map((session) => session.id);
    if (bookingIds.length === 0) {
      setBulkConfirmAction(null);
      return;
    }
    setBookingActionError("");
    setBookingActionInProgressId("__bulk__");
    try {
      const response = await apiRequest<{
        submittedCount: number;
        failedCount: number;
        submitted: Array<{ id: string }>;
        failed: Array<{ bookingId: string; error: string }>;
      }>("/api/bookings/batch/submit-payout", props.token, {
        method: "POST",
        body: JSON.stringify({ bookingIds })
      });
      const submittedIds = new Set((response.submitted ?? []).map((item) => item.id));
      if (submittedIds.size > 0) {
        setPendingExecutionSessions((current) =>
          current.map((item) =>
            submittedIds.has(item.id)
              ? { ...item, canUncomplete: false, submittedForPayout: true, payoutPaid: false }
              : item
          )
        );
        setDashboardReloadKey((value) => value + 1);
      }
      if ((response.failed ?? []).length > 0) {
        setBookingActionError(
          professionalSurfaceMessage(
            "dashboard-submit-payout",
            props.language,
            `${response.failed.length} session(s) could not be submitted`
          )
        );
      }
      setBulkConfirmAction(null);
      setBulkTargetBookings([]);
      setSelectionEpoch((value) => value + 1);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setBookingActionError(professionalSurfaceMessage("dashboard-submit-payout", props.language, raw));
    } finally {
      setBookingActionInProgressId(null);
    }
  };

  const revenuePeriodLabel = formatRevenuePeriodLabel({
    language: props.language,
    preset: revenuePreset,
    dayStr: revenueDay,
    monthStr: revenueMonth,
    yearStr: revenueYear
  }).label;
  const executedMoneyTooltip = t(props.language, {
    es: `Tu neto de sesiones realizadas en ${revenuePeriodLabel}. El bruto está en Ingresos.`,
    en: `Your net from completed sessions in ${revenuePeriodLabel}. Gross is in Earnings.`,
    pt: `Seu liquido das sessoes realizadas em ${revenuePeriodLabel}. O bruto esta em Receitas.`
  });
  const pendingCollectTooltip = t(props.language, {
    es: "Neto ya enviado a cobro que todavía no te depositaron, de cualquier período.",
    en: "Net already sent for payout that has not been deposited yet, from any period.",
    pt: "Liquido ja enviado a cobranca que ainda nao depositaram, de qualquer periodo."
  });
  const scheduledSessionsTooltip = t(props.language, {
    es: "Turnos reservados de acá en adelante. Tocá para ver la lista.",
    en: "Reserved sessions from now on. Tap to see the list.",
    pt: "Horarios reservados daqui pra frente. Toque para ver a lista."
  });
  const activePatientsTooltip = t(props.language, {
    es: "Pacientes con actividad reciente en tu consultorio. Tocá para ver el listado.",
    en: "Patients with recent activity in your practice. Tap to open the list.",
    pt: "Pacientes com atividade recente. Toque para ver a lista."
  });

  return (
    <div className="pro-grid-stack pro-dashboard-stack pro-dashboard-home">
      {profileSavedNotice ? (
        <p className="pro-success pro-dashboard-flash" role="status">
          {profileSavedNotice}
        </p>
      ) : null}
      {recentDiaryReports.length > 0 ? (
        <section className="pro-card pro-dashboard-diary-reports" aria-labelledby="pro-dashboard-diary-reports-title">
          <header className="pro-dashboard-diary-reports-head">
            <h2 id="pro-dashboard-diary-reports-title">
              {t(props.language, {
                es: "Informes del diario",
                en: "Diary reports",
                pt: "Relatórios do diário"
              })}
            </h2>
            <p className="pro-muted">
              {t(props.language, {
                es: "Pacientes que te enviaron el informe antes de la sesión.",
                en: "Patients who sent you their diary report before the session.",
                pt: "Pacientes que enviaram o relatório do diário antes da sessão."
              })}
            </p>
          </header>
          <ul className="pro-dashboard-diary-reports-list">
            {recentDiaryReports.map((report) => (
              <li key={report.patientId}>
                <NavLink
                  to={`/pacientes/${encodeURIComponent(report.patientId)}?diaryReport=1`}
                  className={`pro-dashboard-diary-report-item${report.unread ? " is-unread" : ""}`}
                >
                  <div>
                    <strong>{report.patientName}</strong>
                    <span>
                      {report.entryCount > 0
                        ? t(props.language, {
                            es: `${report.entryCount} entrada${report.entryCount === 1 ? "" : "s"}`,
                            en: `${report.entryCount} entr${report.entryCount === 1 ? "y" : "ies"}`,
                            pt: `${report.entryCount} entrada${report.entryCount === 1 ? "" : "s"}`
                          })
                        : t(props.language, { es: "Informe enviado", en: "Report sent", pt: "Relatório enviado" })}
                    </span>
                  </div>
                  <em className="pro-diary-report-badge">
                    {report.unread
                      ? t(props.language, { es: "Nuevo", en: "New", pt: "Novo" })
                      : t(props.language, { es: "Informe", en: "Report", pt: "Relatório" })}
                  </em>
                </NavLink>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="pro-dashboard-work">
      <p className="pro-dashboard-section-kicker">
        {t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" })}
      </p>
      <section
        className={`pro-card agenda-upcoming-panel agenda-session-panel pro-dashboard-sessions-hub${upcomingSpotlightRing ? " pro-dashboard-upcoming-spotlight" : ""}`}
        id="sesiones-agendadas"
        ref={upcomingSectionRef}
        tabIndex={-1}
        data-tour="pro-tour-bookings"
      >
        <nav
          className="pro-schedule-hub-tabs pro-dashboard-sessions-hub-tabs"
          aria-label={t(props.language, {
            es: "Sesiones del dashboard",
            en: "Dashboard sessions",
            pt: "Sessoes do dashboard"
          })}
        >
          <div className="pro-schedule-hub-tabs-track" role="presentation">
            <button
              type="button"
              role="tab"
              aria-selected={sessionsHubTab === "upcoming"}
              className={`pro-schedule-hub-tab${sessionsHubTab === "upcoming" ? " active" : ""}`}
              onClick={() => setSessionsHubTab("upcoming")}
            >
              {t(props.language, { es: "Próximas sesiones", en: "Upcoming sessions", pt: "Próximas sessoes" })}
              {upcomingReservations.length > 0 ? (
                <span className="pro-dashboard-sessions-hub-count">{upcomingReservations.length}</span>
              ) : null}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sessionsHubTab === "settle"}
              className={`pro-schedule-hub-tab${sessionsHubTab === "settle" ? " active" : ""}`}
              data-tour="pro-tour-settle-tab"
              onClick={() => setSessionsHubTab("settle")}
            >
              {t(props.language, {
                es: "Marcar realizadas",
                en: "Mark as completed",
                pt: "Marcar realizadas"
              })}
              {readyForCobroSessions.length > 0 ? (
                <span className="pro-dashboard-sessions-hub-count">{readyForCobroSessions.length}</span>
              ) : null}
            </button>
          </div>
        </nav>

        {sessionsHubTab === "upcoming" ? (
          <div id="sesiones-agendadas-body" role="tabpanel" data-tour="pro-tour-upcoming-panel">
            <UpcomingReservationsList
              language={props.language}
              reservations={upcomingReservations}
              busyBookingId={bookingActionInProgressId}
              onRequestReschedule={openRescheduleModal}
              onRequestCancel={openCancelModal}
              highlightJoinPulseBookingId={highlightJoinPulseBookingId}
              joinTourTargetBookingId={firstMeetBookingId}
              diaryReportByPatientId={diaryReportByPatientId}
              truncated={Boolean(data.upcomingSessionsHasMore)}
            />
          </div>
        ) : (
          <div
            id="sesiones-por-ejecutar"
            role="tabpanel"
            data-tour="pro-tour-pending-execution"
          >
            <div className="agenda-upcoming-head agenda-session-panel-head pro-dashboard-sessions-hub-toolbar">
              <p className="agenda-session-lead">
                {t(props.language, {
                  es: "Marcá las que ya hiciste. Cuando esté listo, envialas a cobro: esa acción no se puede deshacer.",
                  en: "Mark the ones you’ve already done. When you’re ready, send them for payout — that can’t be undone.",
                  pt: "Marque as que ja fez. Quando estiver pronto, envie a cobranca: essa acao nao se desfaz."
                })}
              </p>
              <div className="agenda-session-panel-filters">
                <RevenueMonthPicker
                  language={props.language}
                  value={sessionListMonth}
                  compact
                  ariaLabel={t(props.language, {
                    es: "Mes de sesiones a marcar",
                    en: "Month for sessions to mark",
                    pt: "Mes das sessoes a marcar"
                  })}
                  onChange={setSessionListMonth}
                />
                <label className="agenda-session-filter">
                  <span className="sr-only">
                    {t(props.language, { es: "Filtrar por estado", en: "Filter by status", pt: "Filtrar por status" })}
                  </span>
                  <select
                    value={sessionListFilter}
                    onChange={(event) => setSessionListFilter(event.target.value as SessionListFilter)}
                  >
                    <option value="all">{t(props.language, { es: "Todas", en: "All", pt: "Todas" })}</option>
                    <option value="reserved">{t(props.language, { es: "Reservadas", en: "Reserved", pt: "Reservadas" })}</option>
                    <option value="executed">{t(props.language, { es: "Realizadas", en: "Completed", pt: "Realizadas" })}</option>
                    <option value="submitted">{t(props.language, { es: "En cobro", en: "In payout", pt: "Em cobranca" })}</option>
                    <option value="paid">{t(props.language, { es: "Pagadas", en: "Paid", pt: "Pagas" })}</option>
                  </select>
                </label>
              </div>
            </div>
            {readyForCobroSessions.length > 0 ? (
              <div className="pro-dashboard-cobro-bar">
                <div className="pro-dashboard-cobro-bar-copy">
                  <strong>
                    {t(props.language, {
                      es: `${readyForCobroSessions.length} sesión${readyForCobroSessions.length === 1 ? "" : "es"} lista${readyForCobroSessions.length === 1 ? "" : "s"} para cobro`,
                      en: `${readyForCobroSessions.length} session${readyForCobroSessions.length === 1 ? "" : "s"} ready for payout`,
                      pt: `${readyForCobroSessions.length} sessao${readyForCobroSessions.length === 1 ? "" : "oes"} pronta${readyForCobroSessions.length === 1 ? "" : "s"} para cobranca`
                    })}
                  </strong>
                  {readyForCobroNetsReady ? <span>{readyForCobroNetLabel}</span> : null}
                  {!payoutReady && payoutBlockedReason ? (
                    <span className="pro-dashboard-cobro-bar-blocked">{payoutBlockedReason}</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="pro-btn pro-dashboard-cobro-bar-cta"
                  disabled={bulkBusy || !payoutReady}
                  title={!payoutReady ? payoutBlockedReason : undefined}
                  onClick={() => {
                    setBulkTargetBookings(readyForCobroSessions);
                    setBulkConfirmAction("submit-payout");
                  }}
                >
                  {t(props.language, {
                    es: "Enviar a cobro",
                    en: "Send for payout",
                    pt: "Enviar a cobranca"
                  })}
                </button>
              </div>
            ) : null}
            <PendingExecutionSessionsList
              language={props.language}
              sessions={pendingExecutionSessions}
              busyBookingId={bulkBusy ? "__bulk__" : bookingActionInProgressId}
              filter={sessionListFilter}
              selectionEpoch={selectionEpoch}
              listMonth={sessionListMonth}
              truncated={Boolean(data.pendingExecutionSessionsHasMore)}
              onMarkExecuted={(booking) => void submitMarkExecuted(booking)}
              onUndoExecuted={(booking) => void submitUndoExecuted(booking)}
              onRequestBulkComplete={(bookings) => {
                setBulkTargetBookings(bookings);
                setBulkConfirmAction("complete");
              }}
              onRequestBulkUncomplete={(bookings) => {
                setBulkTargetBookings(bookings);
                setBulkConfirmAction("uncomplete");
              }}
            />
          </div>
        )}
      </section>

      {bookingActionError ? <p className="pro-error pro-dashboard-action-error">{bookingActionError}</p> : null}
      </div>

      <div className="pro-dashboard-overview" data-tour="pro-tour-hero">
        <p className="pro-dashboard-section-kicker">
          {t(props.language, { es: "Resumen", en: "Snapshot", pt: "Resumo" })}
        </p>
        <div
          className="pro-dashboard-kpi-row"
          role="group"
          aria-label={t(props.language, { es: "Resumen rápido", en: "Quick summary", pt: "Resumo rapido" })}
          data-tour="pro-tour-kpis"
        >
          <KpiWithTooltip tipId="pro-dashboard-tip-pacientes" tooltip={activePatientsTooltip}>
            <NavLink className="pro-kpi-card pro-kpi-card-link" to="/pacientes">
              <span>{t(props.language, { es: "Pacientes", en: "Patients", pt: "Pacientes" })}</span>
              <strong>{data.kpis.activePatients}</strong>
              <em>{t(props.language, { es: "Ver listado", en: "View list", pt: "Ver lista" })}</em>
            </NavLink>
          </KpiWithTooltip>
          <KpiWithTooltip tipId="pro-dashboard-tip-agendadas" tooltip={scheduledSessionsTooltip}>
            <NavLink className="pro-kpi-card pro-kpi-card-link" to="/#sesiones-agendadas">
              <span>{t(props.language, { es: "Próximas sesiones", en: "Upcoming sessions", pt: "Próximas sessoes" })}</span>
              <strong>{data.kpis.sessionsScheduled}</strong>
              <em>{t(props.language, { es: "Ver agenda", en: "View schedule", pt: "Ver agenda" })}</em>
            </NavLink>
          </KpiWithTooltip>
          <KpiWithTooltip tipId="pro-dashboard-tip-ejecutado" tooltip={executedMoneyTooltip} focusable>
            <NavLink className="pro-kpi-card pro-kpi-card-link pro-kpi-card--executed-revenue" to="/ingresos#sesiones-realizadas">
              <span className="pro-executed-revenue-label">
                {t(props.language, { es: "Realizado", en: "Completed", pt: "Realizado" })}
              </span>
              <strong className="pro-kpi-executed-amount">{executedAmountLabel}</strong>
              <small className="pro-kpi-executed-meta">
                {t(props.language, {
                  es: `${revenuePeriodLabel} · ${data.revenueStats.completedSessions} sesiones`,
                  en: `${revenuePeriodLabel} · ${data.revenueStats.completedSessions} sessions`,
                  pt: `${revenuePeriodLabel} · ${data.revenueStats.completedSessions} sessoes`
                })}
              </small>
              <em>{t(props.language, { es: "Ver ingresos", en: "View earnings", pt: "Ver receitas" })}</em>
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
      </div>

      <div className="pro-dashboard-secondary">
        {data.practiceHealth && data.practiceHealth.items.length > 0 ? (
          <ProfessionalPracticeHealth
            language={props.language}
            variant={data.practiceHealth.variant}
            items={data.practiceHealth.items}
          />
        ) : null}

        <section className="pro-card pro-dashboard-availability-shortcut" aria-labelledby="pro-dashboard-availability-title">
          <div className="pro-dashboard-availability-shortcut-copy">
            <h2 id="pro-dashboard-availability-title">
              {t(props.language, {
                es: "Publicá tu disponibilidad",
                en: "Publish your availability",
                pt: "Publique sua disponibilidade"
              })}
            </h2>
            <p>
              {t(props.language, {
                es: "Armá tu plantilla semanal en Horarios para que los pacientes puedan reservar turnos.",
                en: "Set your weekly template in Availability so patients can book slots.",
                pt: "Monte seu modelo semanal em Horários para os pacientes reservarem horarios."
              })}
            </p>
          </div>
          <NavLink to="/horarios" className="pro-dashboard-availability-shortcut-cta">
            {t(props.language, {
              es: "Ir a Horarios",
              en: "Go to Availability",
              pt: "Ir para Horários"
            })}
          </NavLink>
        </section>
      </div>

      {isRescheduleModalOpen ? (
        <div className="pro-reschedule-modal-backdrop" role="presentation" onClick={() => setIsRescheduleModalOpen(false)}>
          <section className="pro-reschedule-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header>
              <h3>{t(props.language, { es: "Reagendar reserva", en: "Reschedule booking", pt: "Reagendar reserva" })}</h3>
              <button type="button" onClick={() => setIsRescheduleModalOpen(false)} aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}>×</button>
            </header>
            <p className="pro-reschedule-modal-lead">
              {t(props.language, {
                es: "Podés mover la sesión a cualquier horario libre de tu agenda, incluso si faltan menos de 24 horas. El paciente recibe el aviso del cambio.",
                en: "You can move the session to any free slot on your schedule, even within 24 hours. The patient is notified of the change.",
                pt: "Voce pode mover a sessao para qualquer horario livre da sua agenda, mesmo com menos de 24 horas. O paciente recebe o aviso da mudanca."
              })}
            </p>
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
            <p className="pro-reschedule-modal-lead">
              {t(props.language, {
                es: "Podés cancelar en cualquier momento. Si la sesión aún no empezó, el crédito vuelve al paciente.",
                en: "You can cancel anytime. If the session has not started, the credit is returned to the patient.",
                pt: "Voce pode cancelar a qualquer momento. Se a sessao ainda nao comecou, o credito volta ao paciente."
              })}
            </p>
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

      {bulkConfirmAction ? (
        <div
          className="pro-reschedule-modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!bulkBusy) {
              setBulkConfirmAction(null);
              setBulkTargetBookings([]);
            }
          }}
        >
          <section className="pro-reschedule-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header>
              <h3>
                {bulkConfirmAction === "complete"
                  ? t(props.language, {
                      es: "Marcar sesiones como realizadas",
                      en: "Mark sessions as completed",
                      pt: "Marcar sessoes como realizadas"
                    })
                  : bulkConfirmAction === "submit-payout"
                    ? t(props.language, {
                        es: "Enviar a cobro",
                        en: "Send for payout",
                        pt: "Enviar a cobranca"
                      })
                    : t(props.language, {
                        es: "Volver sesiones a reservadas",
                        en: "Revert sessions to reserved",
                        pt: "Voltar sessoes para reservadas"
                      })}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setBulkConfirmAction(null);
                  setBulkTargetBookings([]);
                }}
                disabled={bulkBusy}
                aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
              >
                ×
              </button>
            </header>
            <p className="pro-reschedule-modal-lead">
              {bulkConfirmAction === "complete"
                ? t(props.language, {
                    es: `Vas a marcar ${bulkTargetBookings.length} sesiones como realizadas. Después vas a poder enviarlas a cobro.`,
                    en: `You will mark ${bulkTargetBookings.length} sessions as completed. You can send them for payout afterwards.`,
                    pt: `Voce vai marcar ${bulkTargetBookings.length} sessoes como realizadas. Depois podera envia-las a cobranca.`
                  })
                : bulkConfirmAction === "submit-payout"
                  ? t(props.language, {
                      es: readyForCobroNetsReady
                        ? `Vas a enviar ${bulkTargetBookings.length} sesiones a cobro (${readyForCobroNetLabel}). Esta acción no se puede deshacer.`
                        : `Vas a enviar ${bulkTargetBookings.length} sesiones a cobro. Esta acción no se puede deshacer.`,
                      en: readyForCobroNetsReady
                        ? `You will send ${bulkTargetBookings.length} sessions for payout (${readyForCobroNetLabel}). This cannot be undone.`
                        : `You will send ${bulkTargetBookings.length} sessions for payout. This cannot be undone.`,
                      pt: readyForCobroNetsReady
                        ? `Voce vai enviar ${bulkTargetBookings.length} sessoes a cobranca (${readyForCobroNetLabel}). Esta acao nao se desfaz.`
                        : `Voce vai enviar ${bulkTargetBookings.length} sessoes a cobranca. Esta acao nao se desfaz.`
                    })
                  : t(props.language, {
                      es: `Vas a volver ${bulkTargetBookings.length} sesiones realizadas a reservadas. Solo las que todavía no enviaste a cobro.`,
                      en: `You will revert ${bulkTargetBookings.length} completed sessions to reserved. Only those not yet sent for payout.`,
                      pt: `Voce vai voltar ${bulkTargetBookings.length} sessoes realizadas para reservadas. So as que ainda nao enviou a cobranca.`
                    })}
            </p>
            <div className="pro-reschedule-modal-actions">
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => {
                  setBulkConfirmAction(null);
                  setBulkTargetBookings([]);
                }}
              >
                {t(props.language, { es: "Volver", en: "Back", pt: "Voltar" })}
              </button>
              <button
                type="button"
                className="primary"
                disabled={bulkBusy || (bulkConfirmAction === "submit-payout" && !payoutReady)}
                onClick={() =>
                  void (bulkConfirmAction === "complete"
                    ? submitBulkComplete()
                    : bulkConfirmAction === "submit-payout"
                      ? submitSessionsForPayout(bulkTargetBookings)
                      : submitBulkUncomplete())
                }
              >
                {bulkBusy
                  ? t(props.language, { es: "Actualizando...", en: "Updating...", pt: "Atualizando..." })
                  : bulkConfirmAction === "submit-payout"
                    ? t(props.language, { es: "Enviar a cobro", en: "Send for payout", pt: "Enviar a cobranca" })
                    : t(props.language, { es: "Confirmar", en: "Confirm", pt: "Confirmar" })}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
