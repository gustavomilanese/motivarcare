import { useEffect } from "react";
import { type AppLanguage, type LocalizedText, formatDateWithLocale, replaceTemplate, textByLanguage } from "@therapy/i18n-config";
import type { Booking } from "../../app/types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatDateTime(params: { isoDate: string; timezone: string; language: AppLanguage }): string {
  return formatDateWithLocale({
    value: params.isoDate,
    language: params.language,
    timeZone: params.timezone,
    options: {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  });
}

function formatDateOnly(params: { isoDate: string; timezone: string; language: AppLanguage }): string {
  return formatDateWithLocale({
    value: params.isoDate,
    language: params.language,
    timeZone: params.timezone,
    options: {
      weekday: "long",
      month: "long",
      day: "numeric"
    }
  });
}

export function SessionDetailModal(props: {
  booking: Booking;
  timezone: string;
  language: AppLanguage;
  professional: {
    fullName: string;
    title: string;
    approach: string;
  };
  onClose: () => void;
}) {
  const startsAt = new Date(props.booking.startsAt);
  const endsAt = new Date(props.booking.endsAt);
  const durationMinutes = Math.max(1, Math.round((endsAt.getTime() - startsAt.getTime()) / (1000 * 60)));

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        props.onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [props.onClose]);

  return (
    <div className="session-modal-backdrop" role="presentation" onClick={props.onClose}>
      <section
        aria-label={t(props.language, {
          es: "Detalle de sesion",
          en: "Session details",
          pt: "Detalhes da sessao"
        })}
        aria-modal="true"
        className="session-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="session-modal-header">
          <div>
            <span className="chip">
              {t(props.language, { es: "Sesion confirmada", en: "Confirmed session", pt: "Sessao confirmada" })}
            </span>
            <h2>{t(props.language, { es: "Detalle de tu sesion", en: "Your session details", pt: "Detalhes da sua sessao" })}</h2>
          </div>
          <button type="button" onClick={props.onClose}>
            {t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
          </button>
        </header>

        <div className="session-modal-grid">
          <article className="session-modal-card">
            <h3>{props.professional.fullName}</h3>
            <p>{props.professional.title}</p>
            <p>
              <strong>{t(props.language, { es: "Tipo:", en: "Type:", pt: "Tipo:" })}</strong>{" "}
              {props.booking.bookingMode === "trial"
                ? t(props.language, { es: "Sesion de prueba", en: "Trial session", pt: "Sessao de teste" })
                : t(props.language, { es: "Sesion regular", en: "Regular session", pt: "Sessao regular" })}
            </p>
            <p>
              <strong>{t(props.language, { es: "Enfoque:", en: "Approach:", pt: "Abordagem:" })}</strong> {props.professional.approach}
            </p>
          </article>

          <article className="session-modal-card">
            <p>
              <strong>{t(props.language, { es: "Fecha:", en: "Date:", pt: "Data:" })}</strong>{" "}
              {formatDateOnly({ isoDate: props.booking.startsAt, timezone: props.timezone, language: props.language })}
            </p>
            <p>
              <strong>{t(props.language, { es: "Horario:", en: "Time:", pt: "Horario:" })}</strong>{" "}
              {formatDateTime({ isoDate: props.booking.startsAt, timezone: props.timezone, language: props.language })}
            </p>
            <p>
              <strong>{t(props.language, { es: "Duracion:", en: "Duration:", pt: "Duracao:" })}</strong>{" "}
              {replaceTemplate(t(props.language, { es: "{m} minutos", en: "{m} minutes", pt: "{m} minutos" }), {
                m: durationMinutes
              })}
            </p>
            <p>
              <strong>{t(props.language, { es: "Estado:", en: "Status:", pt: "Status:" })}</strong>{" "}
              {t(props.language, { es: "Confirmada", en: "Confirmed", pt: "Confirmada" })}
            </p>
            <p>
              <strong>{t(props.language, { es: "Reserva ID:", en: "Booking ID:", pt: "ID da reserva:" })}</strong> {props.booking.id}
            </p>
            <p>
              <strong>{t(props.language, { es: "Zona horaria:", en: "Time zone:", pt: "Fuso horario:" })}</strong> {props.timezone}
            </p>
          </article>
        </div>

        <section className="session-modal-footer">
          <a className="session-link" href={props.booking.joinUrl} rel="noreferrer" target="_blank">
            {t(props.language, {
              es: "Entrar a videollamada (simulada)",
              en: "Join video call (simulated)",
              pt: "Entrar na videochamada (simulada)"
            })}
          </a>
          <p>
            {t(props.language, {
              es: "Politica de cancelacion: puedes cancelar hasta 24 horas antes del inicio.",
              en: "Cancellation policy: you can cancel up to 24 hours before start.",
              pt: "Politica de cancelamento: voce pode cancelar ate 24 horas antes."
            })}
          </p>
          <p>
            {t(props.language, {
              es: "Tip: conecta 5 minutos antes para probar audio y camara.",
              en: "Tip: connect 5 minutes early to test audio and camera.",
              pt: "Dica: conecte 5 minutos antes para testar audio e camera."
            })}
          </p>
        </section>
      </section>
    </div>
  );
}
