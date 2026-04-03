import { type AppLanguage, type LocalizedText, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import type { AdminBookingOps, AdminBookingsResponse } from "../types";

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
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
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
      return t(language, { es: "Completada", en: "Completed", pt: "Concluida" });
    case "NO_SHOW":
      return t(language, { es: "Ausencia", en: "No-show", pt: "Falta" });
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

export function SessionsOpsPage(props: { token: string; language: AppLanguage }) {
  const [bookings, setBookings] = useState<AdminBookingOps[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"" | AdminBookingOps["status"]>("");
  const [drafts, setDrafts] = useState<Record<string, { status: AdminBookingOps["status"]; startsAt: string; endsAt: string }>>({});
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (statusFilter) {
        query.set("status", statusFilter);
      }
      const response = await apiRequest<AdminBookingsResponse>(
        `/api/admin/bookings${query.toString().length > 0 ? `?${query.toString()}` : ""}`,
        {},
        props.token
      );
      setBookings(response.bookings);
      setDrafts((current) => {
        const next: Record<string, { status: AdminBookingOps["status"]; startsAt: string; endsAt: string }> = { ...current };
        for (const booking of response.bookings) {
          if (!next[booking.id]) {
            next[booking.id] = {
              status: booking.status,
              startsAt: isoToInputDateTime(booking.startsAt),
              endsAt: isoToInputDateTime(booking.endsAt)
            };
          }
        }
        return next;
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [props.token, statusFilter]);

  useEffect(() => {
    setExpandedBookingId((current) => {
      if (!current) {
        return null;
      }
      return bookings.some((item) => item.id === current) ? current : null;
    });
  }, [bookings]);

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
            endsAt: new Date(draft.endsAt).toISOString()
          })
        },
        props.token
      );
      setSuccess(
        t(props.language, { es: "Sesión actualizada", en: "Session updated", pt: "Sessao atualizada" })
      );
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update booking");
    }
  };

  return (
    <div className="ops-page finance-page">
      <section className="card stack finance-kpi-card finance-page-hero">
        <header className="toolbar">
          <h2>{t(props.language, { es: "Sesiones · ABM operativo", en: "Sessions · Operational CRUD", pt: "Sessoes · CRUD operacional" })}</h2>
        </header>
        <p className="settings-section-lead">
          {t(props.language, {
            es: "Filtra por estado y edita reservas en lote.",
            en: "Filter by status and edit bookings in place.",
            pt: "Filtre por estado e edite reservas."
          })}
        </p>
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
      {bookings.map((booking) => {
        const draft = drafts[booking.id];
        if (!draft) {
          return null;
        }
        const expanded = expandedBookingId === booking.id;
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
                </p>
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
                  <button type="button" className="primary" onClick={() => void saveBooking(booking)}>
                    Guardar sesion
                  </button>
                </div>
              </>
            ) : null}
          </section>
        );
      })}
      </div>
    </div>
  );
}
