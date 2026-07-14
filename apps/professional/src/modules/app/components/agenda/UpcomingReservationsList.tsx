import { type AppLanguage, type LocalizedText, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { PatientAvatarImage } from "../PatientAvatarImage";
import { ProPageLoader } from "../ProPageLoader";
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
    return t(language, { es: "Ejecutada", en: "Executed", pt: "Executada" });
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
  /** Primera reserva con Meet: pulso breve (p. ej. `?meet_hint=1` tras OAuth Calendar). */
  highlightJoinPulseBookingId?: string | null;
  /** Primera reserva con Meet: target del tour guiado Maca. */
  joinTourTargetBookingId?: string | null;
}) {
  const loading = Boolean(props.loading);
  const error = props.error ?? "";

  const joinSessionTooltip = t(props.language, {
    es: "Abrir la videollamada de Google Meet con tu paciente.",
    en: "Open the Google Meet video call with your patient.",
    pt: "Abrir a videochamada do Google Meet com seu paciente."
  });
  const noLinkTooltip = t(props.language, {
    es: "Sin enlace de Meet. Conectá Google Calendar en Ajustes para generarlo automáticamente.",
    en: "No Meet link yet. Connect Google Calendar in Settings to generate it automatically.",
    pt: "Sem link do Meet. Conecte o Google Calendar em Ajustes para gerar automaticamente."
  });
  const rescheduleTooltip = t(props.language, {
    es: "Reagendar esta sesión con el paciente.",
    en: "Reschedule this session with the patient.",
    pt: "Reagendar esta sessao com o paciente."
  });
  const cancelTooltip = t(props.language, {
    es: "Cancelar esta reserva.",
    en: "Cancel this booking.",
    pt: "Cancelar esta reserva."
  });

  if (loading) {
    return <ProPageLoader language={props.language} layout="inline" />;
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
          const joinTrim = typeof booking.joinUrl === "string" ? booking.joinUrl.trim() : "";
          const pulseJoin =
            Boolean(props.highlightJoinPulseBookingId && props.highlightJoinPulseBookingId === booking.id && joinTrim);
          const joinTourTarget =
            Boolean(props.joinTourTargetBookingId && props.joinTourTargetBookingId === booking.id && joinTrim);
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
            <div className="agenda-upcoming-cell">
              <span className="agenda-upcoming-cell-label">{t(props.language, { es: "Estado", en: "Status", pt: "Status" })}</span>
              <span className={`agenda-status agenda-status-${booking.status.toLowerCase()}`}>{formatBookingStatus(booking.status, props.language)}</span>
            </div>
            <div className="agenda-upcoming-cell agenda-upcoming-actions">
              <span className="agenda-upcoming-cell-label">{t(props.language, { es: "Acciones", en: "Actions", pt: "Acoes" })}</span>
              <div className="agenda-row-actions">
                {booking.joinUrl ? (
                  <a
                    href={booking.joinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`agenda-join-button${pulseJoin ? " pro-join-session--pulse" : ""}`}
                    title={joinSessionTooltip}
                    data-tour={joinTourTarget ? "pro-join-first-meet" : undefined}
                  >
                    {t(props.language, { es: "Abrir sesión", en: "Open session", pt: "Abrir sessão" })}
                  </a>
                ) : (
                  <span className="agenda-no-link" title={noLinkTooltip}>
                    {t(props.language, { es: "Sin link", en: "No link", pt: "Sem link" })}
                  </span>
                )}
                {props.onRequestReschedule && (booking.status === "confirmed" || booking.status === "requested") ? (
                  <button
                    type="button"
                    className="icon-only"
                    aria-label={t(props.language, { es: "Reagendar", en: "Reschedule", pt: "Reagendar" })}
                    title={rescheduleTooltip}
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
                    title={cancelTooltip}
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
