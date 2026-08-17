import { useEffect, useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { PatientAvatarImage } from "../PatientAvatarImage";
import { ProPageLoader } from "../ProPageLoader";
import { formatPortalBookingStatus } from "../../lib/sessionLifecycle";
import { resolveApiAssetUrl } from "../../services/api";

const PREVIEW_SIZE = 6;

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

export type UpcomingReservationItem = {
  id: string;
  startsAt: string;
  endsAt: string;
  patientId?: string;
  patientName: string;
  patientEmail: string;
  patientAvatarUrl?: string | null;
  status: string;
  joinUrl: string | null;
  canUncomplete?: boolean;
  submittedForPayout?: boolean;
  payoutPaid?: boolean;
  netDisplayCents?: number | null;
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
  /** Informes de diario enviados por paciente (para etiqueta en agenda). */
  diaryReportByPatientId?: Map<string, { unread: boolean }>;
  /** La API recortó el listado; el KPI puede ser mayor. */
  truncated?: boolean;
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
    es: "Reagendar esta sesión (sin límite de 24 h). Elegís el nuevo horario y se notifica al paciente.",
    en: "Reschedule this session (no 24h limit). Pick a new time and the patient is notified.",
    pt: "Reagendar esta sessao (sem limite de 24 h). Escolha o novo horario e o paciente e notificado."
  });
  const cancelTooltip = t(props.language, {
    es: "Cancelar esta reserva (sin límite de 24 h). El crédito vuelve al paciente si aún no empezó.",
    en: "Cancel this booking (no 24h limit). The credit returns to the patient if it has not started.",
    pt: "Cancelar esta reserva (sem limite de 24 h). O credito volta ao paciente se ainda nao comecou."
  });

  const [expanded, setExpanded] = useState(false);

  const liveReservations = useMemo(
    () =>
      props.reservations.filter((booking) => {
        const status = booking.status.toLowerCase();
        return status === "confirmed" || status === "requested";
      }),
    [props.reservations]
  );

  const hiddenCount = Math.max(0, liveReservations.length - PREVIEW_SIZE);
  const visibleReservations = expanded ? liveReservations : liveReservations.slice(0, PREVIEW_SIZE);

  useEffect(() => {
    const targetIds = [props.highlightJoinPulseBookingId, props.joinTourTargetBookingId].filter(
      (id): id is string => Boolean(id)
    );
    if (targetIds.length === 0) {
      return;
    }
    const index = liveReservations.findIndex((booking) => targetIds.includes(booking.id));
    if (index >= PREVIEW_SIZE) {
      setExpanded(true);
    }
  }, [liveReservations, props.highlightJoinPulseBookingId, props.joinTourTargetBookingId]);

  if (loading) {
    return <ProPageLoader language={props.language} layout="inline" />;
  }

  if (error) {
    return <p className="pro-error">{error}</p>;
  }

  if (liveReservations.length === 0) {
    return (
      <div className="agenda-upcoming-empty agenda-session-empty">
        <strong>{t(props.language, { es: "No tenés reservas", en: "No upcoming bookings", pt: "Sem reservas proximas" })}</strong>
      </div>
    );
  }

  return (
    <div className="agenda-session-table agenda-session-table--upcoming">
      <div className="agenda-session-table-head" aria-hidden="true">
        <span>{t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}</span>
        <span>{t(props.language, { es: "Hora", en: "Time", pt: "Hora" })}</span>
        <span>{t(props.language, { es: "Paciente", en: "Patient", pt: "Paciente" })}</span>
        <span>{t(props.language, { es: "Estado", en: "Status", pt: "Status" })}</span>
        <span>{t(props.language, { es: "Acciones", en: "Actions", pt: "Acoes" })}</span>
      </div>
      <div className="agenda-session-table-body">
        {visibleReservations.map((booking) => {
          const patientPhotoSrc = resolveApiAssetUrl(booking.patientAvatarUrl ?? null);
          const joinTrim = typeof booking.joinUrl === "string" ? booking.joinUrl.trim() : "";
          const pulseJoin =
            Boolean(props.highlightJoinPulseBookingId && props.highlightJoinPulseBookingId === booking.id && joinTrim);
          const joinTourTarget =
            Boolean(props.joinTourTargetBookingId && props.joinTourTargetBookingId === booking.id && joinTrim);
          return (
            <article className="agenda-session-table-row" key={booking.id}>
              <div className="agenda-session-cell agenda-session-cell--date">
                <span className="agenda-upcoming-cell-label">{t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}</span>
                <strong>{formatDateHeading(booking.startsAt, props.language)}</strong>
              </div>
              <div className="agenda-session-cell agenda-session-cell--time">
                <span className="agenda-upcoming-cell-label">{t(props.language, { es: "Hora", en: "Time", pt: "Hora" })}</span>
                <span>
                  {formatTime(booking.startsAt, props.language)} – {formatTime(booking.endsAt, props.language)}
                </span>
              </div>
              <div className="agenda-session-cell agenda-session-cell--patient">
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
                    {booking.patientId && props.diaryReportByPatientId?.has(booking.patientId) ? (
                      <span
                        className={`pro-diary-report-badge${
                          props.diaryReportByPatientId.get(booking.patientId)?.unread ? " is-unread" : ""
                        }`}
                      >
                        {t(props.language, {
                          es: "Informe diario",
                          en: "Diary report",
                          pt: "Relatório do diário"
                        })}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="agenda-session-cell agenda-session-cell--status">
                <span className="agenda-upcoming-cell-label">{t(props.language, { es: "Estado", en: "Status", pt: "Status" })}</span>
                <span className="agenda-status agenda-status-reserved">
                  {formatPortalBookingStatus(booking.status, props.language)}
                </span>
              </div>
              <div className="agenda-session-cell agenda-session-cell--actions">
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
                  {props.onRequestReschedule && (booking.status.toLowerCase() === "confirmed" || booking.status.toLowerCase() === "requested") ? (
                    <button
                      type="button"
                      className="agenda-action-btn"
                      aria-label={t(props.language, { es: "Reagendar", en: "Reschedule", pt: "Reagendar" })}
                      title={rescheduleTooltip}
                      onClick={() => props.onRequestReschedule?.(booking)}
                      disabled={props.busyBookingId === booking.id}
                    >
                      <span className="session-action-icon reschedule" aria-hidden="true" />
                      <span className="agenda-action-btn-label">
                        {t(props.language, { es: "Reagendar", en: "Reschedule", pt: "Reagendar" })}
                      </span>
                    </button>
                  ) : null}
                  {props.onRequestCancel && (booking.status.toLowerCase() === "confirmed" || booking.status.toLowerCase() === "requested") ? (
                    <button
                      type="button"
                      className="agenda-action-btn agenda-action-btn--danger icon-only"
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
      {hiddenCount > 0 ? (
        <button
          type="button"
          className="agenda-session-more"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded
            ? t(props.language, { es: "Mostrar menos", en: "Show less", pt: "Mostrar menos" })
            : t(props.language, {
                es: `Mostrar ${hiddenCount} más`,
                en: `Show ${hiddenCount} more`,
                pt: `Mostrar mais ${hiddenCount}`
              })}
        </button>
      ) : null}
      {props.truncated ? (
        <p className="pro-muted agenda-session-truncated">
          {t(props.language, {
            es: "Hay más reservas próximas de las que se listan acá. El recuento del resumen incluye todas.",
            en: "There are more upcoming bookings than this list shows. The summary count includes all of them.",
            pt: "Ha mais reservas proximas do que esta lista mostra. O resumo inclui todas."
          })}
        </p>
      ) : null}
    </div>
  );
}
