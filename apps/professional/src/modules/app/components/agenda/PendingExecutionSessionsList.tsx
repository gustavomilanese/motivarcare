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

export function PendingExecutionSessionsList(props: {
  language: AppLanguage;
  sessions: UpcomingReservationItem[];
  loading?: boolean;
  busyBookingId?: string | null;
  onMarkExecuted: (booking: UpcomingReservationItem) => void;
}) {
  if (props.loading) {
    return <ProPageLoader language={props.language} layout="inline" />;
  }

  if (props.sessions.length === 0) {
    return (
      <div className="agenda-upcoming-empty">
        <strong>
          {t(props.language, {
            es: "No hay sesiones pendientes de marcar",
            en: "No sessions waiting to be marked",
            pt: "Nao ha sessoes pendentes de marcar"
          })}
        </strong>
        <p>
          {t(props.language, {
            es: "Cuando termine un turno, aparecerá acá para que lo marques como ejecutado y sume a tu liquidación.",
            en: "After a session ends, it will show up here so you can mark it as executed and include it in payouts.",
            pt: "Ao terminar um turno, ele aparecera aqui para voce marcar como executado e incluir na liquidacao."
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="agenda-upcoming-table-wrap">
      <div className="agenda-upcoming-table-head agenda-execution-table-head" aria-hidden="true">
        <span>{t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}</span>
        <span>{t(props.language, { es: "Hora", en: "Time", pt: "Hora" })}</span>
        <span>{t(props.language, { es: "Paciente", en: "Patient", pt: "Paciente" })}</span>
        <span>{t(props.language, { es: "Ejecutada", en: "Executed", pt: "Executada" })}</span>
      </div>
      <div className="agenda-upcoming-list">
        {props.sessions.map((booking) => {
          const patientPhotoSrc = resolveApiAssetUrl(booking.patientAvatarUrl ?? null);
          const busy = props.busyBookingId === booking.id;
          return (
            <article className="agenda-upcoming-row agenda-execution-row" key={booking.id}>
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
                  {t(props.language, { es: "Ejecutada", en: "Executed", pt: "Executada" })}
                </span>
                <button
                  type="button"
                  className="agenda-complete-button"
                  disabled={busy}
                  onClick={() => props.onMarkExecuted(booking)}
                  title={t(props.language, {
                    es: "Marcar esta sesión como ejecutada. Entra a tu liquidación pendiente.",
                    en: "Mark this session as executed. It will enter your pending payout.",
                    pt: "Marcar esta sessao como executada. Entra na sua liquidacao pendente."
                  })}
                >
                  {busy
                    ? t(props.language, { es: "Guardando…", en: "Saving…", pt: "Salvando…" })
                    : t(props.language, { es: "✓ Marcar ejecutada", en: "✓ Mark executed", pt: "✓ Marcar executada" })}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
