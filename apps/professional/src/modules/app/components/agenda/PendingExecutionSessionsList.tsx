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
            es: "No hay sesiones en esta lista",
            en: "No sessions in this list",
            pt: "Nao ha sessoes nesta lista"
          })}
        </strong>
        <p>
          {t(props.language, {
            es: "Cuando una sesión ya haya iniciado, aparecerá acá para confirmarla y registrarla en liquidación.",
            en: "When a session has started, it will show here so you can confirm it and record it for payout.",
            pt: "Quando uma sessao ja tiver iniciado, aparecera aqui para confirma-la e registra-la na liquidacao."
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
        <span>{t(props.language, { es: "Estado", en: "Status", pt: "Status" })}</span>
      </div>
      <div className="agenda-upcoming-list">
        {props.sessions.map((booking) => {
          const patientPhotoSrc = resolveApiAssetUrl(booking.patientAvatarUrl ?? null);
          const busy = props.busyBookingId === booking.id;
          const isCompleted = booking.status.toLowerCase() === "completed";
          return (
            <article
              className={`agenda-upcoming-row agenda-execution-row${isCompleted ? " agenda-execution-row--done" : ""}`}
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
                {isCompleted ? (
                  <span className="agenda-execution-status">
                    {t(props.language, { es: "Registrada", en: "Recorded", pt: "Registrada" })}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="agenda-complete-button"
                    disabled={busy}
                    onClick={() => props.onMarkExecuted(booking)}
                    title={t(props.language, {
                      es: "Confirmar sesión y registrarla en liquidación.",
                      en: "Confirm session and record it for payout.",
                      pt: "Confirmar sessao e registra-la na liquidacao."
                    })}
                  >
                    {busy
                      ? t(props.language, { es: "Guardando…", en: "Saving…", pt: "Salvando…" })
                      : t(props.language, {
                          es: "Confirmar sesión",
                          en: "Confirm session",
                          pt: "Confirmar sessao"
                        })}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
