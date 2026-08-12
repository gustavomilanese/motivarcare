import { useEffect, useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { PatientAvatarImage } from "../PatientAvatarImage";
import { ProPageLoader } from "../ProPageLoader";
import { resolveApiAssetUrl } from "../../services/api";
import type { UpcomingReservationItem } from "./UpcomingReservationsList";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatDateHeading(value: string, language: AppLanguage): string {
  return formatDateWithLocale({
    value,
    language,
    options: {
      weekday: "short",
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
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }
  });
}

function isCompletedBooking(session: UpcomingReservationItem): boolean {
  return session.status.toLowerCase() === "completed";
}

/** Ejecutada ya tomada por una corrida de payout: solo lectura. */
function isLiquidatedSession(session: UpcomingReservationItem): boolean {
  return isCompletedBooking(session) && session.canUncomplete === false;
}

/** Ejecutada y aún reversible (pendiente de liquidación). */
function isExecutedPendingSession(session: UpcomingReservationItem): boolean {
  return isCompletedBooking(session) && session.canUncomplete !== false;
}

const PAGE_SIZE = 10;

export type SessionListFilter = "all" | "reserved" | "executed" | "liquidated";

export function PendingExecutionSessionsList(props: {
  language: AppLanguage;
  sessions: UpcomingReservationItem[];
  loading?: boolean;
  busyBookingId?: string | null;
  filter: SessionListFilter;
  onMarkExecuted: (booking: UpcomingReservationItem) => void;
  onUndoExecuted: (booking: UpcomingReservationItem) => void;
}) {
  const [page, setPage] = useState(1);

  const filteredSessions = useMemo(() => {
    if (props.filter === "reserved") {
      return props.sessions.filter((session) => !isCompletedBooking(session));
    }
    if (props.filter === "executed") {
      return props.sessions.filter((session) => isExecutedPendingSession(session));
    }
    if (props.filter === "liquidated") {
      return props.sessions.filter((session) => isLiquidatedSession(session));
    }
    return props.sessions;
  }, [props.filter, props.sessions]);

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [props.filter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pageSessions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredSessions.slice(start, start + PAGE_SIZE);
  }, [filteredSessions, page]);

  const rangeStart = filteredSessions.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filteredSessions.length);

  if (props.loading) {
    return <ProPageLoader language={props.language} layout="inline" />;
  }

  return (
    <div className="agenda-session-inbox">
      {pageSessions.length === 0 ? (
        <div className="agenda-upcoming-empty agenda-session-empty">
          <strong>
            {props.filter === "reserved"
              ? t(props.language, {
                  es: "No hay sesiones reservadas",
                  en: "No reserved sessions",
                  pt: "Nao ha sessoes reservadas"
                })
              : props.filter === "executed"
                ? t(props.language, {
                    es: "No hay sesiones ejecutadas pendientes de liquidar",
                    en: "No executed sessions pending payout",
                    pt: "Nao ha sessoes executadas pendentes de liquidar"
                  })
                : props.filter === "liquidated"
                  ? t(props.language, {
                      es: "No hay sesiones liquidadas",
                      en: "No settled sessions",
                      pt: "Nao ha sessoes liquidadas"
                    })
                  : t(props.language, {
                      es: "No hay sesiones",
                      en: "No sessions",
                      pt: "Nao ha sessoes"
                    })}
          </strong>
        </div>
      ) : (
        <>
          <div className="agenda-session-table">
            <div className="agenda-session-table-head" aria-hidden="true">
              <span>{t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}</span>
              <span>{t(props.language, { es: "Hora", en: "Time", pt: "Hora" })}</span>
              <span>{t(props.language, { es: "Paciente", en: "Patient", pt: "Paciente" })}</span>
              <span>{t(props.language, { es: "Estado", en: "Status", pt: "Status" })}</span>
            </div>
            <div className="agenda-session-table-body">
              {pageSessions.map((booking) => {
                const patientPhotoSrc = resolveApiAssetUrl(booking.patientAvatarUrl ?? null);
                const busy = props.busyBookingId === booking.id;
                const liquidated = isLiquidatedSession(booking);
                const executed = isExecutedPendingSession(booking);
                const statusValue = executed || liquidated ? "executed" : "reserved";

                return (
                  <article className="agenda-session-table-row" key={booking.id}>
                    <div className="agenda-session-cell">
                      <span className="agenda-upcoming-cell-label">
                        {t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}
                      </span>
                      <strong>{formatDateHeading(booking.startsAt, props.language)}</strong>
                    </div>
                    <div className="agenda-session-cell">
                      <span className="agenda-upcoming-cell-label">
                        {t(props.language, { es: "Hora", en: "Time", pt: "Hora" })}
                      </span>
                      <span>
                        {formatTime(booking.startsAt, props.language)} – {formatTime(booking.endsAt, props.language)}
                      </span>
                    </div>
                    <div className="agenda-session-cell agenda-session-cell--patient">
                      <span className="agenda-upcoming-cell-label">
                        {t(props.language, { es: "Paciente", en: "Patient", pt: "Paciente" })}
                      </span>
                      <div className="agenda-upcoming-patient-inner">
                        <PatientAvatarImage
                          src={patientPhotoSrc}
                          imgClassName="agenda-patient-avatar"
                          emptyClassName="agenda-patient-avatar agenda-patient-avatar--empty"
                        />
                        <div className="agenda-upcoming-patient-text">
                          <strong>{booking.patientName || "-"}</strong>
                          <small>{booking.patientEmail || ""}</small>
                        </div>
                      </div>
                    </div>
                    <div className="agenda-session-cell agenda-session-cell--status">
                      <span className="agenda-upcoming-cell-label">
                        {t(props.language, { es: "Estado", en: "Status", pt: "Status" })}
                      </span>
                      {liquidated ? (
                        <span className="agenda-session-status-locked agenda-session-status-locked--liquidated">
                          {t(props.language, { es: "Liquidada", en: "Settled", pt: "Liquidada" })}
                        </span>
                      ) : (
                        <select
                          className={`agenda-session-status-select${executed ? " is-executed" : " is-reserved"}`}
                          value={statusValue}
                          disabled={busy}
                          aria-label={t(props.language, {
                            es: `Estado de la sesión con ${booking.patientName || "paciente"}`,
                            en: `Status for session with ${booking.patientName || "patient"}`,
                            pt: `Status da sessao com ${booking.patientName || "paciente"}`
                          })}
                          onChange={(event) => {
                            const next = event.target.value;
                            if (next === "executed" && !executed) {
                              props.onMarkExecuted(booking);
                            } else if (next === "reserved" && executed) {
                              props.onUndoExecuted(booking);
                            }
                          }}
                        >
                          <option value="reserved">
                            {t(props.language, { es: "Reservada", en: "Reserved", pt: "Reservada" })}
                          </option>
                          <option value="executed">
                            {t(props.language, { es: "Ejecutada", en: "Executed", pt: "Executada" })}
                          </option>
                        </select>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {filteredSessions.length > PAGE_SIZE ? (
            <div
              className="agenda-session-inbox-pagination"
              aria-label={t(props.language, { es: "Paginación", en: "Pagination", pt: "Paginacao" })}
            >
              <span className="agenda-session-inbox-pagination-range" aria-live="polite">
                {t(props.language, {
                  es: `${rangeStart}–${rangeEnd} de ${filteredSessions.length}`,
                  en: `${rangeStart}–${rangeEnd} of ${filteredSessions.length}`,
                  pt: `${rangeStart}–${rangeEnd} de ${filteredSessions.length}`
                })}
              </span>
              <div className="agenda-session-inbox-pagination-nav">
                <button
                  type="button"
                  className="agenda-session-inbox-pagination-arrow"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  aria-label={t(props.language, { es: "Anterior", en: "Previous", pt: "Anterior" })}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="agenda-session-inbox-pagination-arrow"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  aria-label={t(props.language, { es: "Siguiente", en: "Next", pt: "Seguinte" })}
                >
                  ›
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
