import { useEffect, useState, type SyntheticEvent } from "react";
import { type AppLanguage, type LocalizedText, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { ProfessionalNameStack, professionalPhotoAlt } from "../../app/components/ProfessionalNameStack";
import { professionalPhotoSrc } from "../../app/services/api";
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

function formatTimeOnly(params: { isoDate: string; timezone: string; language: AppLanguage }): string {
  return formatDateWithLocale({
    value: params.isoDate,
    language: params.language,
    timeZone: params.timezone,
    options: {
      hour: "numeric",
      minute: "2-digit"
    }
  });
}

export function SessionDetailModal(props: {
  booking: Booking;
  timezone: string;
  language: AppLanguage;
  professional: {
    fullName: string;
    firstName?: string;
    lastName?: string;
    title: string;
    approach: string;
    photoUrl?: string;
  };
  onClose: () => void;
  onImageFallback?: (event: SyntheticEvent<HTMLImageElement>) => void;
}) {
  const [copied, setCopied] = useState(false);
  const joinUrl = props.booking.joinUrl?.trim() ?? "";
  const isGoogleMeet = joinUrl.includes("meet.google.");
  /** Enlace provisional del API cuando no se pudo crear Meet (Daily demo / placeholder local). */
  const isLikelyNonMeetVideoLink =
    Boolean(joinUrl)
    && !isGoogleMeet
    && (/\bdaily\.co\b/i.test(joinUrl) || /\bvideo\.therapy\.local\b/i.test(joinUrl));

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

  const copyMeetLink = async () => {
    if (!joinUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="session-modal-backdrop" role="presentation" onClick={props.onClose}>
      <section
        aria-label={t(props.language, {
          es: "Detalle de sesión",
          en: "Session details",
          pt: "Detalhes da sessao"
        })}
        aria-modal="true"
        className="session-modal session-detail-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="session-modal-header session-detail-head">
          <div className="session-detail-head-copy">
            <span className="chip">
              {props.booking.bookingMode === "trial"
                ? t(props.language, { es: "Sesión de prueba confirmada", en: "Confirmed trial session", pt: "Sessao de teste confirmada" })
                : t(props.language, { es: "Sesión confirmada", en: "Confirmed session", pt: "Sessao confirmada" })}
            </span>
            <p>{formatDateTime({ isoDate: props.booking.startsAt, timezone: props.timezone, language: props.language })}</p>
          </div>
          <button className="session-detail-close" type="button" onClick={props.onClose} aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}>
            ×
          </button>
        </header>

        <section className="session-detail-summary">
          <div className="session-detail-pro">
            <img
              src={professionalPhotoSrc(props.professional.photoUrl)}
              alt={professionalPhotoAlt(props.professional)}
              onError={props.onImageFallback}
            />
            <div>
              <h3>
                <ProfessionalNameStack professional={props.professional} as="span" />
              </h3>
              <p>{props.professional.title}</p>
            </div>
          </div>
        </section>

        <div className="session-detail-meta-grid">
          <p>
            <strong>{t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}</strong>
            <span>{formatDateOnly({ isoDate: props.booking.startsAt, timezone: props.timezone, language: props.language })}</span>
          </p>
          <p>
            <strong>{t(props.language, { es: "Horario", en: "Time", pt: "Horario" })}</strong>
            <span>{formatTimeOnly({ isoDate: props.booking.startsAt, timezone: props.timezone, language: props.language })}</span>
          </p>
          <p>
            <strong>{t(props.language, { es: "Zona horaria", en: "Time zone", pt: "Fuso" })}</strong>
            <span>{props.timezone}</span>
          </p>
        </div>

        <section className="session-detail-meet" aria-label={t(props.language, { es: "Videollamada", en: "Video call", pt: "Videochamada" })}>
          {joinUrl ? (
            <>
              <div className="session-detail-meet-head">
                <span className={`session-meet-badge ${isGoogleMeet ? "" : "session-meet-badge--brand"}`} aria-hidden="true">
                  {isGoogleMeet ? "Meet" : "▶"}
                </span>
                <div>
                  <h4 className="session-detail-meet-title">
                    {isGoogleMeet
                      ? t(props.language, { es: "Google Meet", en: "Google Meet", pt: "Google Meet" })
                      : t(props.language, { es: "Videollamada", en: "Video call", pt: "Videochamada" })}
                  </h4>
                  <p className="session-detail-meet-lead">
                    {isGoogleMeet
                      ? t(props.language, {
                          es: "El enlace se creó al reservar. Abrí Meet en el navegador o en la app.",
                          en: "Your link was created when you booked. Open Meet in your browser or the app.",
                          pt: "O link foi criado ao reservar. Abra o Meet no navegador ou no app."
                        })
                      : t(props.language, {
                          es: "Usa este enlace para conectarte a la sesión en la hora acordada.",
                          en: "Use this link to join your session at the scheduled time.",
                          pt: "Use este link para entrar na sessao no horario combinado."
                        })}
                  </p>
                  {isLikelyNonMeetVideoLink ? (
                    <p className="session-detail-meet-fallback-hint">
                      {t(props.language, {
                        es: "Si esperabas Google Meet: el servidor no pudo crear el evento Meet (revisá GOOGLE_CLIENT_ID/SECRET, tokens del calendario del profesional o tuyo, o consola del API). Este enlace es solo respaldo.",
                        en: "If you expected Google Meet, the server could not create the Meet event (check GOOGLE_CLIENT_ID/SECRET, your or your professional’s calendar tokens, or the API console). This link is only a fallback.",
                        pt: "Se voce esperava Google Meet, o servidor nao criou o evento Meet (confira GOOGLE_CLIENT_ID/SECRET, tokens do calendario seu ou do profissional, ou o console da API). Este link e apenas reserva."
                      })}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="session-detail-meet-actions">
                <a
                  className={`session-meet-primary ${isGoogleMeet ? "" : "session-meet-primary--brand"}`}
                  href={joinUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {isGoogleMeet
                    ? t(props.language, { es: "Abrir Google Meet", en: "Open Google Meet", pt: "Abrir Google Meet" })
                    : t(props.language, { es: "Abrir videollamada", en: "Open video call", pt: "Abrir videochamada" })}
                </a>
                <button className="session-meet-secondary" type="button" onClick={() => void copyMeetLink()}>
                  {copied
                    ? t(props.language, { es: "Enlace copiado", en: "Link copied", pt: "Link copiado" })
                    : t(props.language, { es: "Copiar enlace", en: "Copy link", pt: "Copiar link" })}
                </button>
              </div>
            </>
          ) : (
            <p className="session-detail-meet-empty">
              {t(props.language, {
                es: "Todavía no hay enlace de videollamada para esta sesión. Si ya esta confirmada, actualiza la página en unos minutos o escribe por chat a tu profesional.",
                en: "There is no video link for this session yet. If it is already confirmed, refresh in a few minutes or message your professional in chat.",
                pt: "Ainda nao ha link de video para esta sessao. Se ja estiver confirmada, atualize em alguns minutos ou fale no chat com seu profissional."
              })}
            </p>
          )}
        </section>

        <section className="session-modal-footer session-detail-footer session-detail-footer-hint">
          <p>
            {t(props.language, {
              es: "Para cambiar el horario, reprogramá desde Sesiones con al menos 24 h de anticipación. Conectate 5 min antes.",
              en: "To change the time, reschedule from Sessions at least 24 h in advance. Join 5 min early.",
              pt: "Para mudar o horario, reagende em Sessoes com pelo menos 24 h de antecedência. Entre 5 min antes."
            })}
          </p>
        </section>
      </section>
    </div>
  );
}
