import { type AppLanguage, type LocalizedText, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { resolveApiAssetUrl } from "../../services/api";

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

function formatBookingStatus(status: string, language: AppLanguage): string {
  const normalized = status.toLowerCase();
  if (normalized === "confirmed") {
    return t(language, { es: "Confirmada", en: "Confirmed", pt: "Confirmada" });
  }
  if (normalized === "requested") {
    return t(language, { es: "Solicitada", en: "Requested", pt: "Solicitada" });
  }
  if (normalized === "completed") {
    return t(language, { es: "Completada", en: "Completed", pt: "Concluida" });
  }
  if (normalized === "cancelled") {
    return t(language, { es: "Cancelada", en: "Cancelled", pt: "Cancelada" });
  }
  return t(language, { es: "Programada", en: "Scheduled", pt: "Agendada" });
}

export type UpcomingReservationItem = {
  id: string;
  startsAt: string;
  endsAt: string;
  patientName: string;
  patientEmail: string;
  patientAvatarUrl?: string | null;
  status: string;
  joinUrl: string | null;
};

export function UpcomingReservationsList(props: {
  language: AppLanguage;
  reservations: UpcomingReservationItem[];
  loading?: boolean;
  error?: string;
  busyBookingId?: string | null;
  onRequestReschedule?: (booking: UpcomingReservationItem) => void;
  onRequestCancel?: (booking: UpcomingReservationItem) => void;
}) {
  const loading = Boolean(props.loading);
  const error = props.error ?? "";

  if (loading) {
    return <p>{t(props.language, { es: "Cargando reservas...", en: "Loading bookings...", pt: "Carregando reservas..." })}</p>;
  }

  if (error) {
    return <p className="pro-error">{error}</p>;
  }

  if (props.reservations.length === 0) {
    return (
      <div className="agenda-upcoming-empty">
        <strong>{t(props.language, { es: "No tienes reservas próximas", en: "You have no upcoming bookings", pt: "Voce nao tem reservas proximas" })}</strong>
        <p>{t(props.language, { es: "Aqui apareceran los pacientes que tienes que atender, ordenados por cercania.", en: "Patients you need to attend will appear here, sorted by proximity.", pt: "Aqui aparecerao os pacientes que voce precisa atender, ordenados por proximidade." })}</p>
      </div>
    );
  }

  return (
    <div className="agenda-upcoming-table-wrap">
      <div className="agenda-upcoming-table-head" aria-hidden="true">
        <span>{t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}</span>
        <span>{t(props.language, { es: "Hora", en: "Time", pt: "Hora" })}</span>
        <span>{t(props.language, { es: "Paciente", en: "Patient", pt: "Paciente" })}</span>
        <span>{t(props.language, { es: "Estado", en: "Status", pt: "Status" })}</span>
        <span>{t(props.language, { es: "Acciones", en: "Actions", pt: "Acoes" })}</span>
      </div>
      <div className="agenda-upcoming-list">
        {props.reservations.map((booking) => {
          const patientPhotoSrc = resolveApiAssetUrl(booking.patientAvatarUrl ?? null);
          return (
          <article className="agenda-upcoming-row" key={booking.id}>
            <div className="agenda-upcoming-cell">
              <span className="agenda-upcoming-cell-label">{t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}</span>
              <strong>{formatDateHeading(booking.startsAt, props.language)}</strong>
            </div>
            <div className="agenda-upcoming-cell">
              <span className="agenda-upcoming-cell-label">{t(props.language, { es: "Hora", en: "Time", pt: "Hora" })}</span>
              <span>{formatTime(booking.startsAt, props.language)}</span>
            </div>
            <div className="agenda-upcoming-cell agenda-upcoming-patient">
              <span className="agenda-upcoming-cell-label">{t(props.language, { es: "Paciente", en: "Patient", pt: "Paciente" })}</span>
              <div className="agenda-upcoming-patient-inner">
                {patientPhotoSrc ? (
                  <img src={patientPhotoSrc} alt="" className="agenda-patient-avatar" />
                ) : (
                  <div className="agenda-patient-avatar agenda-patient-avatar--empty" aria-hidden />
                )}
                <div className="agenda-upcoming-patient-text">
                  <strong>{booking.patientName || "-"}</strong>
                  <small>{booking.patientEmail || ""}</small>
                </div>
              </div>
            </div>
            <div className="agenda-upcoming-cell">
              <span className="agenda-upcoming-cell-label">{t(props.language, { es: "Estado", en: "Status", pt: "Status" })}</span>
              <span className={`agenda-status agenda-status-${booking.status.toLowerCase()}`}>{formatBookingStatus(booking.status, props.language)}</span>
            </div>
            <div className="agenda-upcoming-cell agenda-upcoming-actions">
              <span className="agenda-upcoming-cell-label">{t(props.language, { es: "Acciones", en: "Actions", pt: "Acoes" })}</span>
              <div className="agenda-row-actions">
                {booking.joinUrl ? (
                  <a href={booking.joinUrl} target="_blank" rel="noreferrer" className="agenda-join-button">
                    {t(props.language, { es: "Abrir sesión", en: "Open session", pt: "Abrir sessão" })}
                  </a>
                ) : (
                  <span className="agenda-no-link">{t(props.language, { es: "Sin link", en: "No link", pt: "Sem link" })}</span>
                )}
                {props.onRequestReschedule && (booking.status === "confirmed" || booking.status === "requested") ? (
                  <button
                    type="button"
                    className="icon-only"
                    aria-label={t(props.language, { es: "Reagendar", en: "Reschedule", pt: "Reagendar" })}
                    onClick={() => props.onRequestReschedule?.(booking)}
                    disabled={props.busyBookingId === booking.id}
                  >
                    <span className="session-action-icon reschedule" aria-hidden="true" />
                  </button>
                ) : null}
                {props.onRequestCancel && (booking.status === "confirmed" || booking.status === "requested") ? (
                  <button
                    type="button"
                    className="danger icon-only"
                    aria-label={t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
                    onClick={() => props.onRequestCancel?.(booking)}
                    disabled={props.busyBookingId === booking.id}
                  >
                    <span className="session-action-icon cancel" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>
          </article>
          );
        })}
      </div>
    </div>
  );
}
