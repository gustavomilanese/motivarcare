import { type AppLanguage, type LocalizedText, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AdminBookingSessionActions } from "../components/sessions/AdminBookingSessionActions";
import {
  cancelAdminBookingSession,
  isAdminTrialBooking,
  reactivateAdminBookingSession,
  type AdminBookingDraft
} from "../lib/adminBookingSessionOps";
import { adminSurfaceMessage } from "../lib/friendlyAdminSurfaceMessages";
import { apiRequest } from "../services/api";
import type { AdminBookingOps, AdminBookingsResponse, AdminPatientOps, PatientsResponse } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatSessionWhen(language: AppLanguage, startsAt: string, endsAt: string): string {
  const opts = { month: "short" as const, day: "numeric" as const, hour: "numeric" as const, minute: "2-digit" as const };
  return `${formatDateWithLocale({ value: startsAt, language, options: opts })} → ${formatDateWithLocale({ value: endsAt, language, options: opts })}`;
}

function isoToInputDateTime(value: string): string {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const BOOKING_STATUS_VALUES: AdminBookingOps["status"][] = ["REQUESTED", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"];

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

export function SessionsOpsPage(props: { token: string; language: AppLanguage }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState<AdminBookingOps[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionOpsLoading, setSessionOpsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"" | AdminBookingOps["status"]>("");
  const [patientSearchInput, setPatientSearchInput] = useState("");
  const [patientFilterId, setPatientFilterId] = useState(searchParams.get("patientId")?.trim() ?? "");
  const [patientFilterLabel, setPatientFilterLabel] = useState("");
  const [drafts, setDrafts] = useState<Record<string, AdminBookingDraft>>({});
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

  const load = async (patientIdOverride?: string) => {
    const patientId = (patientIdOverride ?? patientFilterId).trim();
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (statusFilter) {
        query.set("status", statusFilter);
      }
      if (patientId) {
        query.set("patientId", patientId);
      }
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
    void load();
  }, [props.token, statusFilter, patientFilterId]);

  useEffect(() => {
    const patientId = searchParams.get("patientId")?.trim() ?? "";
    if (patientId && patientId !== patientFilterId) {
      setPatientFilterId(patientId);
    }
  }, [patientFilterId, searchParams]);

  useEffect(() => {
    setExpandedBookingId((current) => {
      if (!current) {
        return null;
      }
      return bookings.some((item) => item.id === current) ? current : null;
    });
  }, [bookings]);

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

    if (/^[a-z0-9-]{8,}$/i.test(query) && query.includes("-")) {
      setPatientFilterId(query);
      setPatientFilterLabel(query);
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set("patientId", query);
        return next;
      });
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
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set("patientId", patient.id);
        return next;
      });
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("sessions-ops-load", props.language, raw));
    }
  };

  const clearPatientFilter = () => {
    setPatientFilterId("");
    setPatientFilterLabel("");
    setPatientSearchInput("");
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("patientId");
      return next;
    });
  };

  const saveBooking = async (booking: AdminBookingOps) => {
    const draft = drafts[booking.id];
    if (!draft) {
      return;
    }
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
    if (!draft) {
      return;
    }
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
    if (!draft) {
      return;
    }
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
    if (!draft) {
      return;
    }
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

  return (
    <div className="ops-page finance-page">
      <section className="card stack finance-kpi-card finance-page-hero">
        <header className="toolbar">
          <h2>{t(props.language, { es: "Sesiones · operaciones", en: "Sessions · operations", pt: "Sessoes · operacoes" })}</h2>
        </header>
        <p className="settings-section-lead">
          {t(props.language, {
            es: "Buscá por paciente, filtrá por estado y corregí ejecuciones: El profesional marca «Ejecutada»; vos podés disputar o cambiar el estado si hubo un error. También Pacientes → editar → Ver sesiones.",
            en: "Search by patient, filter by status, and correct executions: the therapist marks “Executed”; you can dispute or change status if something is wrong. Also Patients → edit → View sessions.",
            pt: "Busque por paciente, filtre por estado e corrija execucoes: o profissional marca «Executada»; voce pode disputar ou mudar o status. Tambem Pacientes → editar → Ver sessoes."
          })}
        </p>

        <div className="grid-form sessions-ops-patient-filter">
          <label>
            {t(props.language, { es: "Paciente (email, nombre o ID)", en: "Patient (email, name, or ID)", pt: "Paciente" })}
            <input
              type="search"
              value={patientSearchInput}
              placeholder="gustavo@example.com"
              onChange={(event) => setPatientSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void resolvePatientFilter();
                }
              }}
            />
          </label>
          <div className="button-row ops-actions">
            <button type="button" className="primary" onClick={() => void resolvePatientFilter()}>
              {t(props.language, { es: "Buscar paciente", en: "Find patient", pt: "Buscar paciente" })}
            </button>
            {patientFilterId ? (
              <button type="button" onClick={clearPatientFilter}>
                {t(props.language, { es: "Quitar filtro", en: "Clear filter", pt: "Limpar filtro" })}
              </button>
            ) : null}
          </div>
        </div>

        {patientFilterId ? (
          <p className="sessions-ops-active-filter">
            {t(props.language, { es: "Filtrando paciente:", en: "Filtering patient:", pt: "Filtrando paciente:" })}{" "}
            <strong>{patientFilterLabel || patientFilterId}</strong>
            {" · "}
            <Link to={`/patients?patientId=${encodeURIComponent(patientFilterId)}`}>
              {t(props.language, { es: "Abrir ficha del paciente", en: "Open patient record", pt: "Abrir ficha" })}
            </Link>
          </p>
        ) : null}

        <div
          className="ops-status-filter ops-status-filter--hero toolbar--wrap"
          role="group"
          aria-label={t(props.language, { es: "Filtrar por estado", en: "Filter by status", pt: "Filtrar por estado" })}
        >
          <button type="button" className={statusFilter === "" ? "is-active" : undefined} onClick={() => setStatusFilter("")}>
            {t(props.language, { es: "Todos", en: "All", pt: "Todos" })}
          </button>
          {BOOKING_STATUS_VALUES.map((st) => (
            <button
              key={st}
              type="button"
              className={statusFilter === st ? "is-active" : undefined}
              onClick={() => setStatusFilter(st)}
            >
              {bookingStatusLabel(props.language, st)}
            </button>
          ))}
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
        {bookings.map((booking) => {
          const draft = drafts[booking.id];
          if (!draft) {
            return null;
          }
          const expanded = expandedBookingId === booking.id;
          const trial = isAdminTrialBooking(booking);
          return (
            <section key={booking.id} className={`card stack ops-panel ops-session-card${expanded ? " ops-session-card--open" : ""}`}>
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
                </span>
                <span className="ops-session-summary-meta">{formatSessionWhen(props.language, booking.startsAt, booking.endsAt)}</span>
                <span className="ops-session-chevron" aria-hidden>
                  {expanded ? "▾" : "▸"}
                </span>
              </button>
              {expanded ? (
                <>
                  <p className="ops-session-id">
                    ID: <code>{booking.id}</code>
                    {" · "}
                    <Link to={`/patients?patientId=${encodeURIComponent(booking.patientId)}`}>
                      {t(props.language, { es: "Ver paciente", en: "View patient", pt: "Ver paciente" })}
                    </Link>
                  </p>
                  {booking.cancellationReason ? (
                    <p className="ops-session-id">
                      {t(props.language, { es: "Motivo:", en: "Reason:", pt: "Motivo:" })} {booking.cancellationReason}
                    </p>
                  ) : null}
                  <div className="grid-form">
                    <div className="ops-status-field">
                      <span className="ops-status-field-label">
                        {t(props.language, { es: "Estado", en: "Status", pt: "Estado" })}
                      </span>
                      <div
                        className="ops-status-filter ops-status-filter--compact"
                        role="group"
                        aria-label={t(props.language, { es: "Estado de la sesión", en: "Session status", pt: "Estado da sessao" })}
                      >
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
                    <label>
                      Inicio
                      <input
                        type="datetime-local"
                        value={draft.startsAt}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [booking.id]: { ...current[booking.id], startsAt: event.target.value }
                          }))
                        }
                      />
                    </label>
                    <label>
                      Fin
                      <input
                        type="datetime-local"
                        value={draft.endsAt}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [booking.id]: { ...current[booking.id], endsAt: event.target.value }
                          }))
                        }
                      />
                    </label>
                  </div>
                  <div className="button-row ops-actions">
                    <button type="button" className="primary" onClick={() => void saveBooking(booking)} disabled={sessionOpsLoading}>
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
                </>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
