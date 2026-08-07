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

function isCompletedSession(session: UpcomingReservationItem): boolean {
  return session.status.toLowerCase() === "completed";
}

const PAGE_SIZE = 10;

type SessionListFilter = "pending" | "recorded" | "all";

export function PendingExecutionSessionsList(props: {
  language: AppLanguage;
  sessions: UpcomingReservationItem[];
  loading?: boolean;
  busyBookingId?: string | null;
  onMarkExecuted: (booking: UpcomingReservationItem) => void;
  onUndoExecuted: (booking: UpcomingReservationItem) => void;
}) {
  const [filter, setFilter] = useState<SessionListFilter>("pending");
  const [page, setPage] = useState(1);

  const pendingCount = useMemo(
    () => props.sessions.filter((session) => !isCompletedSession(session)).length,
    [props.sessions]
  );
  const recordedCount = props.sessions.length - pendingCount;

  const filteredSessions = useMemo(() => {
    if (filter === "pending") {
      return props.sessions.filter((session) => !isCompletedSession(session));
    }
    if (filter === "recorded") {
      return props.sessions.filter((session) => isCompletedSession(session));
    }
    return props.sessions;
  }, [filter, props.sessions]);

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [filter]);

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
      <div className="agenda-session-inbox-toolbar" role="tablist" aria-label={t(props.language, { es: "Filtro de sesiones", en: "Session filter", pt: "Filtro de sessoes" })}>
        {(
          [
            {
              id: "pending" as const,
              label: t(props.language, { es: "Por confirmar", en: "To confirm", pt: "Por confirmar" }),
              count: pendingCount
            },
            {
              id: "recorded" as const,
              label: t(props.language, { es: "Registradas", en: "Recorded", pt: "Registradas" }),
              count: recordedCount
            },
            {
              id: "all" as const,
              label: t(props.language, { es: "Todas", en: "All", pt: "Todas" }),
              count: props.sessions.length
            }
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={filter === tab.id}
            className={`agenda-session-inbox-tab${filter === tab.id ? " is-active" : ""}`}
            onClick={() => setFilter(tab.id)}
          >
            <span>{tab.label}</span>
            <em>{tab.count}</em>
          </button>
        ))}
      </div>

      {pageSessions.length === 0 ? (
        <div className="agenda-upcoming-empty">
          <strong>
            {filter === "pending"
              ? t(props.language, {
                  es: "No hay sesiones por confirmar",
                  en: "No sessions to confirm",
                  pt: "Nao ha sessoes por confirmar"
                })
              : filter === "recorded"
                ? t(props.language, {
                    es: "No hay sesiones registradas",
                    en: "No recorded sessions",
                    pt: "Nao ha sessoes registradas"
                  })
                : t(props.language, {
                    es: "No hay sesiones en este período",
                    en: "No sessions in this period",
                    pt: "Nao ha sessoes neste periodo"
                  })}
          </strong>
        </div>
      ) : (
        <>
          <div className="agenda-upcoming-table-wrap">
            <div className="agenda-upcoming-table-head agenda-execution-table-head" aria-hidden="true">
              <span>{t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}</span>
              <span>{t(props.language, { es: "Hora", en: "Time", pt: "Hora" })}</span>
              <span>{t(props.language, { es: "Paciente", en: "Patient", pt: "Paciente" })}</span>
              <span>{t(props.language, { es: "Estado", en: "Status", pt: "Status" })}</span>
            </div>
            <div className="agenda-upcoming-list">
              {pageSessions.map((booking) => {
                const patientPhotoSrc = resolveApiAssetUrl(booking.patientAvatarUrl ?? null);
                const busy = props.busyBookingId === booking.id;
                const completed = isCompletedSession(booking);
                const canUncomplete = booking.canUncomplete !== false;
                return (
                  <article
                    className={`agenda-upcoming-row agenda-execution-row${completed ? " agenda-execution-row--done" : " agenda-execution-row--pending"}`}
                    key={booking.id}
                  >
                    <div className="agenda-upcoming-cell">
                      <span className="agenda-upcoming-cell-label">{t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}</span>
                      <strong>{formatDateHeading(booking.startsAt, props.language)}</strong>
                    </div>
                    <div className="agenda-upcoming-cell">
                      <span className="agenda-upcoming-cell-label">{t(props.language, { es: "Hora", en: "Time", pt: "Hora" })}</span>
                      <span>
                        {formatTime(booking.startsAt, props.language)} – {formatTime(booking.endsAt, props.language)}
                      </span>
                    </div>
                    <div className="agenda-upcoming-cell agenda-upcoming-patient">
                      <span className="agenda-upcoming-cell-label">{t(props.language, { es: "Paciente", en: "Patient", pt: "Paciente" })}</span>
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
                    <div className="agenda-upcoming-cell agenda-execution-action">
                      <span className="agenda-upcoming-cell-label">
                        {t(props.language, { es: "Estado", en: "Status", pt: "Status" })}
                      </span>
                      {completed ? (
                        <div className="agenda-execution-status-stack">
                          <span className="agenda-execution-status">
                            {t(props.language, { es: "Registrada", en: "Recorded", pt: "Registrada" })}
                          </span>
                          {canUncomplete ? (
                            <button
                              type="button"
                              className="agenda-uncomplete-button"
                              disabled={busy}
                              onClick={() => props.onUndoExecuted(booking)}
                              title={t(props.language, {
                                es: "Volver a pendiente si te equivocaste. Sale de liquidación.",
                                en: "Move back to pending if this was a mistake. Removes it from payout.",
                                pt: "Voltar para pendente se errou. Sai da liquidacao."
                              })}
                            >
                              {busy
                                ? t(props.language, { es: "Guardando…", en: "Saving…", pt: "Salvando…" })
                                : t(props.language, { es: "Deshacer", en: "Undo", pt: "Desfazer" })}
                            </button>
                          ) : (
                            <span className="agenda-execution-locked">
                              {t(props.language, {
                                es: "En liquidación",
                                en: "In payout",
                                pt: "Em liquidacao"
                              })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="agenda-complete-button"
                          disabled={busy}
                          onClick={() => props.onMarkExecuted(booking)}
                          title={t(props.language, {
                            es: "Confirmar que la sesión se realizó. Entra a liquidación pendiente.",
                            en: "Confirm the session took place. It enters pending payout.",
                            pt: "Confirmar que a sessao ocorreu. Entra na liquidacao pendente."
                          })}
                        >
                          {busy
                            ? t(props.language, { es: "Guardando…", en: "Saving…", pt: "Salvando…" })
                            : t(props.language, {
                                es: "Confirmar ejecución",
                                en: "Confirm execution",
                                pt: "Confirmar execucao"
                              })}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {filteredSessions.length > PAGE_SIZE ? (
            <div className="agenda-session-inbox-pagination" aria-label={t(props.language, { es: "Paginación", en: "Pagination", pt: "Paginacao" })}>
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
