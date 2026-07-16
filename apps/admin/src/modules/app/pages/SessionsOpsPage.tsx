import { type AppLanguage, type LocalizedText, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AdminBookingSessionActions } from "../components/sessions/AdminBookingSessionActions";
import { AdminSessionScheduleField } from "../components/sessions/AdminSessionScheduleField";
import {
  cancelAdminBookingSession,
  isAdminTrialBooking,
  reactivateAdminBookingSession,
  type AdminBookingDraft
} from "../lib/adminBookingSessionOps";
import { localDayKeyFromIso, toLocalDateTimeValue } from "../lib/adminSessionSchedule";
import { adminSurfaceMessage } from "../lib/friendlyAdminSurfaceMessages";
import { apiRequest } from "../services/api";
import type {
  AdminBookingOps,
  AdminBookingsResponse,
  AdminPatientOps,
  AdminProfessionalOps,
  PatientsResponse,
  ProfessionalsResponse
} from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatSessionWhen(language: AppLanguage, startsAt: string, endsAt: string): string {
  const opts = { month: "short" as const, day: "numeric" as const, hour: "numeric" as const, minute: "2-digit" as const };
  return `${formatDateWithLocale({ value: startsAt, language, options: opts })} → ${formatDateWithLocale({ value: endsAt, language, options: opts })}`;
}

function formatDayHeading(language: AppLanguage, dayKey: string): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return formatDateWithLocale({
    value: date.toISOString(),
    language,
    options: { weekday: "long", day: "numeric", month: "long", year: "numeric" }
  });
}

function isoToInputDateTime(value: string): string {
  return toLocalDateTimeValue(new Date(value));
}

const BOOKING_STATUS_VALUES: AdminBookingOps["status"][] = ["REQUESTED", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"];

type SortMode = "starts_desc" | "starts_asc" | "professional_az" | "patient_az";

function bookingStatusLabel(language: AppLanguage, status: AdminBookingOps["status"]): string {
  switch (status) {
    case "REQUESTED":
      return t(language, { es: "Solicitada", en: "Requested", pt: "Solicitada" });
    case "CONFIRMED":
      return t(language, { es: "Confirmada", en: "Confirmed", pt: "Confirmada" });
    case "CANCELLED":
      return t(language, { es: "Cancelada", en: "Cancelled", pt: "Cancelada" });
    case "COMPLETED":
      return t(language, { es: "Ejecutada", en: "Executed", pt: "Executada" });
    case "NO_SHOW":
      return t(language, { es: "No realizada / Ausencia", en: "Not held / No-show", pt: "Nao realizada / Falta" });
  }
}

function bookingStatusPillClass(status: AdminBookingOps["status"]): string {
  switch (status) {
    case "REQUESTED":
      return "ops-session-pill--requested";
    case "CONFIRMED":
      return "ops-session-pill--confirmed";
    case "CANCELLED":
      return "ops-session-pill--cancelled";
    case "COMPLETED":
      return "ops-session-pill--completed";
    case "NO_SHOW":
      return "ops-session-pill--no-show";
  }
}

function draftFromBooking(booking: AdminBookingOps): AdminBookingDraft {
  return {
    status: booking.status,
    startsAt: isoToInputDateTime(booking.startsAt),
    endsAt: isoToInputDateTime(booking.endsAt),
    professionalId: booking.professionalId
  };
}

function sortBookings(bookings: AdminBookingOps[], mode: SortMode): AdminBookingOps[] {
  const next = [...bookings];
  next.sort((left, right) => {
    if (mode === "professional_az") {
      const byPro = left.professionalName.localeCompare(right.professionalName, undefined, { sensitivity: "base" });
      if (byPro !== 0) return byPro;
      return new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime();
    }
    if (mode === "patient_az") {
      const byPatient = left.patientName.localeCompare(right.patientName, undefined, { sensitivity: "base" });
      if (byPatient !== 0) return byPatient;
      return new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime();
    }
    const delta = new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();
    return mode === "starts_asc" ? delta : -delta;
  });
  return next;
}

export function SessionsOpsPage(props: { token: string; language: AppLanguage }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState<AdminBookingOps[]>([]);
  const [professionals, setProfessionals] = useState<AdminProfessionalOps[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionOpsLoading, setSessionOpsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"" | AdminBookingOps["status"]>(
    (searchParams.get("status") as AdminBookingOps["status"] | null) &&
      BOOKING_STATUS_VALUES.includes(searchParams.get("status") as AdminBookingOps["status"])
      ? (searchParams.get("status") as AdminBookingOps["status"])
      : ""
  );
  const [professionalFilterId, setProfessionalFilterId] = useState(searchParams.get("professionalId")?.trim() ?? "");
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom")?.trim() ?? "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo")?.trim() ?? "");
  const [sortMode, setSortMode] = useState<SortMode>((searchParams.get("sort") as SortMode | null) ?? "starts_desc");
  const [patientSearchInput, setPatientSearchInput] = useState("");
  const [patientFilterId, setPatientFilterId] = useState(searchParams.get("patientId")?.trim() ?? "");
  const [patientFilterLabel, setPatientFilterLabel] = useState("");
  const [drafts, setDrafts] = useState<Record<string, AdminBookingDraft>>({});
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

  const syncQuery = (patch: Record<string, string | null>) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(patch)) {
        if (!value) {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      return next;
    });
  };

  const load = async (overrides?: {
    patientId?: string;
    professionalId?: string;
    status?: "" | AdminBookingOps["status"];
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const patientId = (overrides?.patientId ?? patientFilterId).trim();
    const professionalId = (overrides?.professionalId ?? professionalFilterId).trim();
    const status = overrides?.status ?? statusFilter;
    const from = (overrides?.dateFrom ?? dateFrom).trim();
    const to = (overrides?.dateTo ?? dateTo).trim();
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (status) query.set("status", status);
      if (patientId) query.set("patientId", patientId);
      if (professionalId) query.set("professionalId", professionalId);
      if (from) query.set("dateFrom", from);
      if (to) query.set("dateTo", to);
      const response = await apiRequest<AdminBookingsResponse>(
        `/api/admin/bookings${query.toString().length > 0 ? `?${query.toString()}` : ""}`,
        {},
        props.token
      );
      setBookings(response.bookings);
      setDrafts((current) => {
        const next: Record<string, AdminBookingDraft> = { ...current };
        for (const booking of response.bookings) {
          next[booking.id] = draftFromBooking(booking);
        }
        return next;
      });
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("sessions-ops-load", props.language, raw));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const response = await apiRequest<ProfessionalsResponse>("/api/admin/professionals", {}, props.token);
        setProfessionals(
          [...(response.professionals ?? [])].sort((a, b) =>
            a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base" })
          )
        );
      } catch {
        // Directory is optional for filters; session list still works.
      }
    })();
  }, [props.token]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.token, statusFilter, patientFilterId, professionalFilterId, dateFrom, dateTo]);

  useEffect(() => {
    const patientId = searchParams.get("patientId")?.trim() ?? "";
    if (patientId && patientId !== patientFilterId) {
      setPatientFilterId(patientId);
    }
  }, [patientFilterId, searchParams]);

  useEffect(() => {
    setExpandedBookingId((current) => {
      if (!current) return null;
      return bookings.some((item) => item.id === current) ? current : null;
    });
  }, [bookings]);

  const sortedBookings = useMemo(() => sortBookings(bookings, sortMode), [bookings, sortMode]);

  const dayGroups = useMemo(() => {
    const groups: Array<{ dayKey: string; items: AdminBookingOps[] }> = [];
    const indexByDay = new Map<string, number>();
    for (const booking of sortedBookings) {
      const dayKey = localDayKeyFromIso(booking.startsAt);
      const existing = indexByDay.get(dayKey);
      if (existing == null) {
        indexByDay.set(dayKey, groups.length);
        groups.push({ dayKey, items: [booking] });
      } else {
        groups[existing].items.push(booking);
      }
    }
    return groups;
  }, [sortedBookings]);

  const resolvePatientFilter = async () => {
    const query = patientSearchInput.trim();
    if (!query) {
      setError(
        t(props.language, {
          es: "Ingresá email, nombre o ID del paciente.",
          en: "Enter the patient email, name, or ID.",
          pt: "Informe email, nome ou ID do paciente."
        })
      );
      return;
    }

    setError("");
    setSuccess("");

    if (/^[a-z0-9]{20,}$/i.test(query) || (/^[a-z0-9-]{8,}$/i.test(query) && query.includes("-"))) {
      setPatientFilterId(query);
      setPatientFilterLabel(query);
      syncQuery({ patientId: query });
      return;
    }

    try {
      const response = await apiRequest<PatientsResponse>(
        `/api/admin/patients?search=${encodeURIComponent(query)}&pageSize=10`,
        {},
        props.token
      );
      const matches = response.patients ?? [];
      if (matches.length === 0) {
        setError(
          t(props.language, {
            es: "No encontramos pacientes con ese criterio.",
            en: "No patients matched that search.",
            pt: "Nenhum paciente encontrado."
          })
        );
        return;
      }
      const patient = matches[0] as AdminPatientOps;
      setPatientFilterId(patient.id);
      setPatientFilterLabel(`${patient.fullName} · ${patient.email}`);
      syncQuery({ patientId: patient.id });
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("sessions-ops-load", props.language, raw));
    }
  };

  const clearAllFilters = () => {
    setPatientFilterId("");
    setPatientFilterLabel("");
    setPatientSearchInput("");
    setProfessionalFilterId("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("");
    setSortMode("starts_desc");
    syncQuery({
      patientId: null,
      professionalId: null,
      dateFrom: null,
      dateTo: null,
      status: null,
      sort: null
    });
  };

  const saveBooking = async (booking: AdminBookingOps) => {
    const draft = drafts[booking.id];
    if (!draft) return;
    setError("");
    setSuccess("");
    try {
      await apiRequest<{ booking: AdminBookingOps }>(
        `/api/admin/bookings/${booking.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: draft.status,
            startsAt: new Date(draft.startsAt).toISOString(),
            endsAt: new Date(draft.endsAt).toISOString(),
            professionalId: draft.professionalId
          })
        },
        props.token
      );
      setSuccess(t(props.language, { es: "Sesión actualizada", en: "Session updated", pt: "Sessao atualizada" }));
      await load();
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("sessions-ops-update", props.language, raw));
    }
  };

  const runSessionOp = async (operation: () => Promise<void>) => {
    setSessionOpsLoading(true);
    setError("");
    setSuccess("");
    try {
      await operation();
    } finally {
      setSessionOpsLoading(false);
    }
  };

  const cancelBooking = async (booking: AdminBookingOps) => {
    const draft = drafts[booking.id];
    if (!draft) return;
    await runSessionOp(async () => {
      try {
        await cancelAdminBookingSession({
          token: props.token,
          bookingId: booking.id,
          draft,
          cancellationReason: isAdminTrialBooking(booking)
            ? "Admin: cancelación sesión de prueba"
            : "Admin: sesión cancelada"
        });
        setSuccess(t(props.language, { es: "Sesión cancelada", en: "Session cancelled", pt: "Sessao cancelada" }));
        await load();
      } catch (requestError) {
        const raw = requestError instanceof Error ? requestError.message : "";
        setError(adminSurfaceMessage("patients-cancel", props.language, raw));
      }
    });
  };

  const forceCancelTrialBooking = async (booking: AdminBookingOps, confirmationPhrase: string) => {
    const draft = drafts[booking.id];
    if (!draft) return;
    await runSessionOp(async () => {
      try {
        await cancelAdminBookingSession({
          token: props.token,
          bookingId: booking.id,
          draft,
          cancellationReason: "Admin: cancelación sesión de prueba",
          adminTrialCancelConfirmation: confirmationPhrase
        });
        setSuccess(
          t(props.language, {
            es: "Sesión de prueba cancelada",
            en: "Trial session cancelled",
            pt: "Sessao de teste cancelada"
          })
        );
        await load();
      } catch (requestError) {
        const raw = requestError instanceof Error ? requestError.message : "";
        setError(adminSurfaceMessage("patients-trial-cancel", props.language, raw));
      }
    });
  };

  const reactivateBooking = async (booking: AdminBookingOps) => {
    const draft = drafts[booking.id];
    if (!draft) return;
    await runSessionOp(async () => {
      try {
        await reactivateAdminBookingSession({
          token: props.token,
          bookingId: booking.id,
          draft
        });
        setSuccess(t(props.language, { es: "Sesión reactivada", en: "Session reactivated", pt: "Sessao reativada" }));
        await load();
      } catch (requestError) {
        const raw = requestError instanceof Error ? requestError.message : "";
        setError(adminSurfaceMessage("patients-reactivate", props.language, raw));
      }
    });
  };

  const activeFilterCount = [
    statusFilter,
    patientFilterId,
    professionalFilterId,
    dateFrom,
    dateTo
  ].filter(Boolean).length;

  return (
    <div className="ops-page finance-page sessions-ops-premium">
      <section className="card stack finance-kpi-card finance-page-hero sessions-ops-hero">
        <header className="sessions-ops-hero-header">
          <div>
            <p className="sessions-ops-kicker">
              {t(props.language, { es: "Operaciones", en: "Operations", pt: "Operacoes" })}
            </p>
            <h2>{t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" })}</h2>
            <p className="settings-section-lead">
              {t(props.language, {
                es: "Filtrá, ordená y corregí agendas. Para QA: expandí una sesión → atajo «Hace ~2 h».",
                en: "Filter, sort, and correct schedules. For QA: expand a session → “~2 h ago” shortcut.",
                pt: "Filtre, ordene e corrija agendas. Para QA: abra uma sessao → atalho «Há ~2 h»."
              })}
            </p>
          </div>
          <div className="sessions-ops-hero-stats">
            <div>
              <span>{t(props.language, { es: "En vista", en: "In view", pt: "Na vista" })}</span>
              <strong>{sortedBookings.length}</strong>
            </div>
            <div>
              <span>{t(props.language, { es: "Filtros", en: "Filters", pt: "Filtros" })}</span>
              <strong>{activeFilterCount}</strong>
            </div>
          </div>
        </header>

        <div className="sessions-ops-filters">
          <label className="sessions-ops-filter-field sessions-ops-filter-field--grow">
            <span>{t(props.language, { es: "Paciente", en: "Patient", pt: "Paciente" })}</span>
            <div className="sessions-ops-inline-search">
              <input
                type="search"
                value={patientSearchInput}
                placeholder="email, nombre o ID"
                onChange={(event) => setPatientSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void resolvePatientFilter();
                  }
                }}
              />
              <button type="button" className="primary" onClick={() => void resolvePatientFilter()}>
                {t(props.language, { es: "Buscar", en: "Search", pt: "Buscar" })}
              </button>
            </div>
          </label>

          <label className="sessions-ops-filter-field">
            <span>{t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}</span>
            <select
              value={professionalFilterId}
              onChange={(event) => {
                const value = event.target.value;
                setProfessionalFilterId(value);
                syncQuery({ professionalId: value || null });
              }}
            >
              <option value="">{t(props.language, { es: "Todos", en: "All", pt: "Todos" })}</option>
              {professionals.map((pro) => (
                <option key={pro.id} value={pro.id}>
                  {pro.fullName}
                </option>
              ))}
            </select>
          </label>

          <label className="sessions-ops-filter-field">
            <span>{t(props.language, { es: "Desde", en: "From", pt: "De" })}</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                const value = event.target.value;
                setDateFrom(value);
                syncQuery({ dateFrom: value || null });
              }}
            />
          </label>

          <label className="sessions-ops-filter-field">
            <span>{t(props.language, { es: "Hasta", en: "To", pt: "Ate" })}</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                const value = event.target.value;
                setDateTo(value);
                syncQuery({ dateTo: value || null });
              }}
            />
          </label>

          <label className="sessions-ops-filter-field">
            <span>{t(props.language, { es: "Orden", en: "Sort", pt: "Ordem" })}</span>
            <select
              value={sortMode}
              onChange={(event) => {
                const value = event.target.value as SortMode;
                setSortMode(value);
                syncQuery({ sort: value === "starts_desc" ? null : value });
              }}
            >
              <option value="starts_desc">
                {t(props.language, { es: "Fecha · más reciente", en: "Date · newest", pt: "Data · mais recente" })}
              </option>
              <option value="starts_asc">
                {t(props.language, { es: "Fecha · más antigua", en: "Date · oldest", pt: "Data · mais antiga" })}
              </option>
              <option value="professional_az">
                {t(props.language, { es: "Profesional A–Z", en: "Professional A–Z", pt: "Profissional A–Z" })}
              </option>
              <option value="patient_az">
                {t(props.language, { es: "Paciente A–Z", en: "Patient A–Z", pt: "Paciente A–Z" })}
              </option>
            </select>
          </label>
        </div>

        {patientFilterId ? (
          <p className="sessions-ops-active-filter">
            {t(props.language, { es: "Filtrando paciente:", en: "Filtering patient:", pt: "Filtrando paciente:" })}{" "}
            <strong>{patientFilterLabel || patientFilterId}</strong>
            {" · "}
            <Link to={`/patients?patientId=${encodeURIComponent(patientFilterId)}`}>
              {t(props.language, { es: "Abrir ficha", en: "Open record", pt: "Abrir ficha" })}
            </Link>
            {" · "}
            <button
              type="button"
              className="sessions-ops-linkish"
              onClick={() => {
                setPatientFilterId("");
                setPatientFilterLabel("");
                setPatientSearchInput("");
                syncQuery({ patientId: null });
              }}
            >
              {t(props.language, { es: "Quitar", en: "Clear", pt: "Limpar" })}
            </button>
          </p>
        ) : null}

        <div
          className="ops-status-filter ops-status-filter--hero toolbar--wrap"
          role="group"
          aria-label={t(props.language, { es: "Filtrar por estado", en: "Filter by status", pt: "Filtrar por estado" })}
        >
          <button
            type="button"
            className={statusFilter === "" ? "is-active" : undefined}
            onClick={() => {
              setStatusFilter("");
              syncQuery({ status: null });
            }}
          >
            {t(props.language, { es: "Todos", en: "All", pt: "Todos" })}
          </button>
          {BOOKING_STATUS_VALUES.map((st) => (
            <button
              key={st}
              type="button"
              className={statusFilter === st ? "is-active" : undefined}
              onClick={() => {
                setStatusFilter(st);
                syncQuery({ status: st });
              }}
            >
              {bookingStatusLabel(props.language, st)}
            </button>
          ))}
          {activeFilterCount > 0 ? (
            <button type="button" className="sessions-ops-clear-filters" onClick={clearAllFilters}>
              {t(props.language, { es: "Limpiar filtros", en: "Clear filters", pt: "Limpar filtros" })}
            </button>
          ) : null}
        </div>

        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}
        {loading ? <p>{t(props.language, { es: "Cargando...", en: "Loading...", pt: "Carregando..." })}</p> : null}
      </section>

      <div className="stack-lg sessions-ops-list">
        {bookings.length === 0 && !loading ? (
          <section className="card stack">
            <p>
              {t(props.language, {
                es: "No hay sesiones con estos filtros.",
                en: "No sessions match these filters.",
                pt: "Nenhuma sessao com estes filtros."
              })}
            </p>
          </section>
        ) : null}

        {dayGroups.map((group) => (
          <section key={group.dayKey} className="sessions-ops-day-group">
            <header className="sessions-ops-day-heading">
              <h3>{formatDayHeading(props.language, group.dayKey)}</h3>
              <span>
                {group.items.length}{" "}
                {t(props.language, {
                  es: group.items.length === 1 ? "sesión" : "sesiones",
                  en: group.items.length === 1 ? "session" : "sessions",
                  pt: group.items.length === 1 ? "sessao" : "sessoes"
                })}
              </span>
            </header>

            {group.items.map((booking) => {
              const draft = drafts[booking.id];
              if (!draft) return null;
              const expanded = expandedBookingId === booking.id;
              const trial = isAdminTrialBooking(booking);
              return (
                <article
                  key={booking.id}
                  className={`card stack ops-panel ops-session-card${expanded ? " ops-session-card--open" : ""}`}
                >
                  <button
                    type="button"
                    className="ops-session-summary"
                    aria-expanded={expanded}
                    onClick={() => setExpandedBookingId((current) => (current === booking.id ? null : booking.id))}
                  >
                    <span className="ops-session-summary-main">
                      <span className="ops-session-summary-names">
                        {booking.patientName} ↔ {booking.professionalName}
                      </span>
                      <span className={`ops-session-pill ${bookingStatusPillClass(draft.status)}`}>
                        {bookingStatusLabel(props.language, draft.status)}
                      </span>
                      {trial ? <span className="ops-session-pill ops-session-pill--requested">Trial</span> : null}
                      {!trial
                      && booking.packageSessionNumber
                      && booking.packageCredits
                      && booking.packageSessionNumber > 0
                      && booking.packageCredits > 0 ? (
                        <span className="ops-session-pill ops-session-pill--confirmed" title={booking.packageName ?? undefined}>
                          {booking.packageSessionNumber}/{booking.packageCredits}
                          {booking.packageDiscountPercent != null && booking.packageDiscountPercent > 0
                            ? ` (−${booking.packageDiscountPercent}%)`
                            : ""}
                        </span>
                      ) : null}
                    </span>
                    <span className="ops-session-summary-meta">
                      {formatSessionWhen(props.language, booking.startsAt, booking.endsAt)}
                    </span>
                    <span className="ops-session-chevron" aria-hidden>
                      {expanded ? "▾" : "▸"}
                    </span>
                  </button>

                  {expanded ? (
                    <div className="ops-session-editor">
                      <p className="ops-session-id">
                        ID: <code>{booking.id}</code>
                        {" · "}
                        <Link to={`/patients?patientId=${encodeURIComponent(booking.patientId)}`}>
                          {t(props.language, { es: "Ver paciente", en: "View patient", pt: "Ver paciente" })}
                        </Link>
                      </p>
                      {booking.cancellationReason ? (
                        <p className="ops-session-id">
                          {t(props.language, { es: "Motivo cancelación:", en: "Cancel reason:", pt: "Motivo:" })}{" "}
                          {booking.cancellationReason}
                        </p>
                      ) : null}
                      {!trial && booking.packageName ? (
                        <p className="ops-session-id">
                          {t(props.language, { es: "Paquete:", en: "Package:", pt: "Pacote:" })}{" "}
                          {booking.packageName}
                          {booking.packageSessionNumber && booking.packageCredits
                            ? ` · ${booking.packageSessionNumber}/${booking.packageCredits}`
                            : ""}
                          {booking.packageDiscountPercent != null && booking.packageDiscountPercent > 0
                            ? ` · −${booking.packageDiscountPercent}%`
                            : ""}
                        </p>
                      ) : null}

                      <div className="ops-status-field">
                        <span className="ops-status-field-label">
                          {t(props.language, { es: "Estado", en: "Status", pt: "Estado" })}
                        </span>
                        <div className="ops-status-filter" role="group">
                          {BOOKING_STATUS_VALUES.map((st) => (
                            <button
                              key={st}
                              type="button"
                              className={draft.status === st ? "is-active" : undefined}
                              onClick={() =>
                                setDrafts((current) => ({
                                  ...current,
                                  [booking.id]: { ...current[booking.id], status: st }
                                }))
                              }
                            >
                              {bookingStatusLabel(props.language, st)}
                            </button>
                          ))}
                        </div>
                        <p className="ops-status-field-hint">
                          {t(props.language, {
                            es: "«Ejecutada» genera el registro a liquidar. Si ya estuvo en un payout, no se puede revertir hasta ajustar la liquidación.",
                            en: "“Executed” creates the payout ledger row. If it was already paid out, you can’t reverse it until the payout is adjusted.",
                            pt: "«Executada» gera o registro a liquidar. Se ja entrou num payout, nao da para reverter sem ajustar a liquidacao."
                          })}
                        </p>
                      </div>

                      <label className="sessions-ops-filter-field">
                        <span>{t(props.language, { es: "Profesional asignado", en: "Assigned professional", pt: "Profissional" })}</span>
                        <select
                          value={draft.professionalId}
                          disabled={sessionOpsLoading}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [booking.id]: { ...current[booking.id], professionalId: event.target.value }
                            }))
                          }
                        >
                          {!professionals.some((pro) => pro.id === draft.professionalId) ? (
                            <option value={draft.professionalId}>{booking.professionalName}</option>
                          ) : null}
                          {professionals.map((pro) => (
                            <option key={pro.id} value={pro.id}>
                              {pro.fullName}
                            </option>
                          ))}
                        </select>
                      </label>

                      <AdminSessionScheduleField
                        language={props.language}
                        startsAt={draft.startsAt}
                        endsAt={draft.endsAt}
                        disabled={sessionOpsLoading}
                        onChange={(next) =>
                          setDrafts((current) => ({
                            ...current,
                            [booking.id]: {
                              ...current[booking.id],
                              startsAt: next.startsAt,
                              endsAt: next.endsAt
                            }
                          }))
                        }
                      />

                      <div className="button-row ops-actions">
                        <button
                          type="button"
                          className="primary"
                          onClick={() => void saveBooking(booking)}
                          disabled={sessionOpsLoading}
                        >
                          {t(props.language, { es: "Guardar cambios", en: "Save changes", pt: "Salvar alteracoes" })}
                        </button>
                      </div>
                      <AdminBookingSessionActions
                        language={props.language}
                        booking={booking}
                        draft={draft}
                        loading={sessionOpsLoading}
                        onCancel={() => cancelBooking(booking)}
                        onForceCancelTrial={(phrase) => forceCancelTrialBooking(booking, phrase)}
                        onReactivate={() => reactivateBooking(booking)}
                      />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
