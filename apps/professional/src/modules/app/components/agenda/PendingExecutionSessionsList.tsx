import { useEffect, useMemo, useRef, useState } from "react";
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

function isSelectableSession(session: UpcomingReservationItem): boolean {
  return !isLiquidatedSession(session);
}

const PAGE_SIZE = 20;

export type SessionListFilter = "all" | "reserved" | "executed" | "liquidated";

export function PendingExecutionSessionsList(props: {
  language: AppLanguage;
  sessions: UpcomingReservationItem[];
  loading?: boolean;
  busyBookingId?: string | null;
  filter: SessionListFilter;
  selectionEpoch?: number;
  onMarkExecuted: (booking: UpcomingReservationItem) => void;
  onUndoExecuted: (booking: UpcomingReservationItem) => void;
  onRequestBulkComplete: (bookings: UpcomingReservationItem[]) => void;
  onRequestBulkUncomplete: (bookings: UpcomingReservationItem[]) => void;
}) {
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

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
    setSelectedIds([]);
  }, [props.filter, props.selectionEpoch]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pageSessions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredSessions.slice(start, start + PAGE_SIZE);
  }, [filteredSessions, page]);

  const selectableOnPage = useMemo(
    () => pageSessions.filter(isSelectableSession),
    [pageSessions]
  );
  const selectableInView = useMemo(
    () => filteredSessions.filter(isSelectableSession),
    [filteredSessions]
  );

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedOnPageCount = selectableOnPage.filter((session) => selectedSet.has(session.id)).length;
  const allPageSelected = selectableOnPage.length > 0 && selectedOnPageCount === selectableOnPage.length;
  const somePageSelected = selectedOnPageCount > 0 && !allPageSelected;
  const allViewSelected =
    selectableInView.length > 0 && selectableInView.every((session) => selectedSet.has(session.id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = somePageSelected;
    }
  }, [somePageSelected]);

  useEffect(() => {
    const valid = new Set(filteredSessions.map((session) => session.id));
    setSelectedIds((current) => {
      const next = current.filter((id) => valid.has(id));
      return next.length === current.length ? current : next;
    });
  }, [filteredSessions]);

  const selectedSessions = useMemo(
    () => filteredSessions.filter((session) => selectedSet.has(session.id) && isSelectableSession(session)),
    [filteredSessions, selectedSet]
  );
  const selectedReserved = selectedSessions.filter((session) => !isCompletedBooking(session));
  const selectedExecuted = selectedSessions.filter((session) => isExecutedPendingSession(session));

  const rangeStart = filteredSessions.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filteredSessions.length);
  const busyAll = props.busyBookingId === "__bulk__";

  const toggleOne = (bookingId: string, checked: boolean) => {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(bookingId) ? current : [...current, bookingId];
      }
      return current.filter((id) => id !== bookingId);
    });
  };

  const togglePage = (checked: boolean) => {
    const pageIds = selectableOnPage.map((session) => session.id);
    setSelectedIds((current) => {
      if (checked) {
        const next = new Set(current);
        for (const id of pageIds) {
          next.add(id);
        }
        return [...next];
      }
      return current.filter((id) => !pageIds.includes(id));
    });
  };

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
          {selectedSessions.length > 0 ? (
            <div className="agenda-session-select-bar" role="toolbar" aria-label={t(props.language, { es: "Acciones de selección", en: "Selection actions", pt: "Acoes da selecao" })}>
              <span className="agenda-session-select-count">
                {t(props.language, {
                  es: `${selectedSessions.length} seleccionadas`,
                  en: `${selectedSessions.length} selected`,
                  pt: `${selectedSessions.length} selecionadas`
                })}
              </span>
              {selectedReserved.length > 0 ? (
                <button
                  type="button"
                  className="agenda-session-bulk-btn"
                  disabled={busyAll}
                  onClick={() => props.onRequestBulkComplete(selectedReserved)}
                >
                  {t(props.language, {
                    es: "Marcar como ejecutadas",
                    en: "Mark as executed",
                    pt: "Marcar como executadas"
                  })}
                </button>
              ) : null}
              {selectedExecuted.length > 0 ? (
                <button
                  type="button"
                  className="agenda-session-bulk-btn agenda-session-bulk-btn--ghost"
                  disabled={busyAll}
                  onClick={() => props.onRequestBulkUncomplete(selectedExecuted)}
                >
                  {t(props.language, {
                    es: "Volver a reservadas",
                    en: "Revert to reserved",
                    pt: "Voltar para reservadas"
                  })}
                </button>
              ) : null}
              <button
                type="button"
                className="agenda-session-select-clear"
                disabled={busyAll}
                onClick={() => setSelectedIds([])}
              >
                {t(props.language, { es: "Quitar selección", en: "Clear selection", pt: "Limpar selecao" })}
              </button>
            </div>
          ) : null}

          {allPageSelected && !allViewSelected && selectableInView.length > selectableOnPage.length ? (
            <p className="agenda-session-select-hint">
              {t(props.language, {
                es: `Las ${selectableOnPage.length} de esta página están seleccionadas.`,
                en: `All ${selectableOnPage.length} on this page are selected.`,
                pt: `As ${selectableOnPage.length} desta pagina estao selecionadas.`
              })}{" "}
              <button
                type="button"
                className="agenda-session-select-hint-btn"
                disabled={busyAll}
                onClick={() => setSelectedIds(selectableInView.map((session) => session.id))}
              >
                {t(props.language, {
                  es: `Seleccionar las ${selectableInView.length} de este mes`,
                  en: `Select all ${selectableInView.length} this month`,
                  pt: `Selecionar as ${selectableInView.length} deste mes`
                })}
              </button>
            </p>
          ) : null}

          {selectableOnPage.length > 0 ? (
            <div className="agenda-session-select-master">
              <label className="agenda-session-check">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  disabled={busyAll}
                  onChange={(event) => togglePage(event.target.checked)}
                  aria-label={t(props.language, {
                    es: "Seleccionar las sesiones de esta página",
                    en: "Select sessions on this page",
                    pt: "Selecionar as sessoes desta pagina"
                  })}
                />
              </label>
              <span>
                {t(props.language, {
                  es: "Seleccionar esta página",
                  en: "Select this page",
                  pt: "Selecionar esta pagina"
                })}
              </span>
            </div>
          ) : null}

          <div className="agenda-session-table agenda-session-table--settle">
            <div className="agenda-session-table-head">
              <span className="agenda-session-cell--check">
                {selectableOnPage.length > 0 ? (
                  <label className="agenda-session-check">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allPageSelected}
                      disabled={busyAll}
                      onChange={(event) => togglePage(event.target.checked)}
                      aria-label={t(props.language, {
                        es: "Seleccionar las sesiones de esta página",
                        en: "Select sessions on this page",
                        pt: "Selecionar as sessoes desta pagina"
                      })}
                    />
                  </label>
                ) : null}
              </span>
              <span>{t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}</span>
              <span>{t(props.language, { es: "Hora", en: "Time", pt: "Hora" })}</span>
              <span>{t(props.language, { es: "Paciente", en: "Patient", pt: "Paciente" })}</span>
              <span>{t(props.language, { es: "Estado", en: "Status", pt: "Status" })}</span>
            </div>
            <div className="agenda-session-table-body">
              {pageSessions.map((booking) => {
                const patientPhotoSrc = resolveApiAssetUrl(booking.patientAvatarUrl ?? null);
                const busy = props.busyBookingId === booking.id || busyAll;
                const liquidated = isLiquidatedSession(booking);
                const executed = isExecutedPendingSession(booking);
                const selectable = isSelectableSession(booking);
                const selected = selectedSet.has(booking.id);
                const statusValue = executed || liquidated ? "executed" : "reserved";

                return (
                  <article
                    className={`agenda-session-table-row${selected ? " is-selected" : ""}`}
                    key={booking.id}
                  >
                    <div className="agenda-session-cell agenda-session-cell--check">
                      {selectable ? (
                        <label className="agenda-session-check">
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={busy}
                            onChange={(event) => toggleOne(booking.id, event.target.checked)}
                            aria-label={t(props.language, {
                              es: `Seleccionar sesión con ${booking.patientName || "paciente"}`,
                              en: `Select session with ${booking.patientName || "patient"}`,
                              pt: `Selecionar sessao com ${booking.patientName || "paciente"}`
                            })}
                          />
                        </label>
                      ) : (
                        <span className="agenda-session-check agenda-session-check--empty" aria-hidden="true" />
                      )}
                    </div>
                    <div className="agenda-session-cell agenda-session-cell--date">
                      <span className="agenda-upcoming-cell-label">
                        {t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}
                      </span>
                      <strong>{formatDateHeading(booking.startsAt, props.language)}</strong>
                    </div>
                    <div className="agenda-session-cell agenda-session-cell--time">
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
