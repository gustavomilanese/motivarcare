import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import type { AdminBookingOps, AdminBookingsResponse } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
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

export function SessionsOpsPage(props: { token: string; language: AppLanguage }) {
  const [bookings, setBookings] = useState<AdminBookingOps[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"" | AdminBookingOps["status"]>("");
  const [drafts, setDrafts] = useState<Record<string, { status: AdminBookingOps["status"]; startsAt: string; endsAt: string }>>({});

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
      setSuccess("Booking updated");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update booking");
    }
  };

  return (
    <div className="stack-lg ops-page">
      <section className="card stack ops-panel">
        <header className="toolbar">
          <h2>{t(props.language, { es: "Sesiones · ABM operativo", en: "Sessions · Operational CRUD", pt: "Sessoes · CRUD operacional" })}</h2>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "" | AdminBookingOps["status"])}>
            <option value="">Todos</option>
            <option value="REQUESTED">REQUESTED</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="NO_SHOW">NO_SHOW</option>
          </select>
        </header>
        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}
        {loading ? <p>{t(props.language, { es: "Cargando...", en: "Loading...", pt: "Carregando..." })}</p> : null}
      </section>

      {bookings.map((booking) => {
        const draft = drafts[booking.id];
        if (!draft) {
          return null;
        }
        return (
          <section key={booking.id} className="card stack ops-panel">
            <header>
              <h3>{booking.patientName} ↔ {booking.professionalName}</h3>
              <p>ID: {booking.id}</p>
            </header>
            <div className="grid-form">
              <label>
                Estado
                <select
                  value={draft.status}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [booking.id]: { ...current[booking.id], status: event.target.value as AdminBookingOps["status"] }
                    }))
                  }
                >
                  <option value="REQUESTED">REQUESTED</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="NO_SHOW">NO_SHOW</option>
                </select>
              </label>
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
              <button type="button" className="primary" onClick={() => void saveBooking(booking)}>Guardar sesion</button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
