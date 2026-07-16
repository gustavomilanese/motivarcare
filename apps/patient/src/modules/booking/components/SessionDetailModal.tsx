import { useEffect, useState, type SyntheticEvent } from "react";
import {
  type AppLanguage,
  type LocalizedText,
  formatDateWithLocale,
  textByLanguage,
  resolvePatientChangeNoticeHours,
  canPatientCancelBooking,
  canPatientRescheduleBooking
} from "@therapy/i18n-config";
import { professionalPhotoAlt } from "../../app/components/ProfessionalNameStack";
import { professionalAccessibleName } from "../../app/lib/professionalDisplayName";
import { professionalPhotoSrc } from "../../app/services/api";
import { ProfessionalReviewStarsRow } from "../../reviews/components/ProfessionalReviewStarsRow";
import { resolveProfessionalDisplayRating } from "../../reviews/lib/professionalReviewsDisplay";
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
    rating?: number | null;
    reviewsCount?: number;
  };
  onClose: () => void;
  onOpenProfessionalReviews?: () => void;
  onImageFallback?: (event: SyntheticEvent<HTMLImageElement>) => void;
  noticeHours?: number;
  onReschedule?: () => void;
  onCancel?: (reason: string) => void | Promise<void>;
  cancelSubmitting?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const noticeHours = resolvePatientChangeNoticeHours(props.noticeHours);
  const isTrialBooking = props.booking.bookingMode === "trial";
  const canReschedule = canPatientRescheduleBooking(props.booking.startsAt, noticeHours);
  const canCancel = canPatientCancelBooking(props.booking.startsAt, noticeHours);
  const joinUrl = props.booking.joinUrl?.trim() ?? "";
  const isGoogleMeet = joinUrl.includes("meet.google.");
  /** Enlace provisional del API cuando no se pudo crear Meet (Daily demo / placeholder local). */
  const isLikelyNonMeetVideoLink =
    Boolean(joinUrl)
    && !isGoogleMeet
    && (/\bdaily\.co\b/i.test(joinUrl) || /\bvideo\.therapy\.local\b/i.test(joinUrl));
  const reviewCount = props.professional.reviewsCount ?? 0;
  const averageRating = props.professional.rating ?? null;
  const displayRating = resolveProfessionalDisplayRating(averageRating, reviewCount);
  const professionalName = professionalAccessibleName(props.professional);

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

  useEffect(() => {
    if (!confirmCancel) {
      setCancelReason("");
    }
  }, [confirmCancel]);

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
                ? t(props.language, { es: "Sesión de prueba reservada", en: "Booked trial session", pt: "Sessao de teste reservada" })
                : t(props.language, { es: "Sesión reservada", en: "Booked session", pt: "Sessao reservada" })}
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
            <div className="session-detail-pro-copy">
              {props.onOpenProfessionalReviews ? (
                <button
                  type="button"
                  className="session-detail-pro-reviews-trigger"
                  aria-label={t(props.language, {
                    es: `Ver opiniones de ${professionalName}`,
                    en: `View reviews for ${professionalName}`,
                    pt: `Ver avaliações de ${professionalName}`
                  })}
                  onClick={props.onOpenProfessionalReviews}
                >
                  <span className="session-detail-pro-identity-row">
                    <span className="session-detail-pro-name">{professionalName}</span>
                    <span className="session-detail-pro-rating">
                      <ProfessionalReviewStarsRow
                        averageRating={averageRating}
                        reviewCount={reviewCount}
                        size="md"
                      />
                      <span className="session-detail-pro-rating-value">{displayRating.toFixed(1)}</span>
                    </span>
                  </span>
                </button>
              ) : (
                <span className="session-detail-pro-identity-row session-detail-pro-identity-row--static">
                  <span className="session-detail-pro-name">{professionalName}</span>
                  <span className="session-detail-pro-rating session-detail-pro-rating--static">
                    <ProfessionalReviewStarsRow
                      averageRating={averageRating}
                      reviewCount={reviewCount}
                      size="md"
                    />
                    <span className="session-detail-pro-rating-value">{displayRating.toFixed(1)}</span>
                  </span>
                </span>
              )}
              <p className="session-detail-pro-title">{props.professional.title}</p>
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
                        es: "Este enlace es un respaldo: no pudimos crear el evento de Google Meet. Si tenés dudas, escribinos por soporte.",
                        en: "This link is a fallback—we couldn’t create the Google Meet event. If you have questions, contact support.",
                        pt: "Este link e um respaldo: nao foi possivel criar o evento do Google Meet. Se tiver duvidas, fale com o suporte."
                      })}
                      {import.meta.env.DEV ? (
                        <span className="session-detail-meet-dev-hint">
                          {" "}
                          {t(props.language, {
                            es: "(Dev: revisá GOOGLE_CLIENT_ID/SECRET y tokens de calendario en el API.)",
                            en: "(Dev: check GOOGLE_CLIENT_ID/SECRET and calendar tokens on the API.)",
                            pt: "(Dev: confira GOOGLE_CLIENT_ID/SECRET e tokens de calendario no API.)"
                          })}
                        </span>
                      ) : null}
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
                es: "Todavía no hay enlace de videollamada para esta sesión. Si ya está reservada, actualiza la página en unos minutos o escribe por chat a tu profesional.",
                en: "There is no video link for this session yet. If it is already booked, refresh in a few minutes or message your professional in chat.",
                pt: "Ainda nao ha link de video para esta sessao. Se ja estiver reservada, atualize em alguns minutos ou fale no chat com seu profissional."
              })}
            </p>
          )}
        </section>

        <section className="session-modal-footer session-detail-footer session-detail-footer-actions">
          {props.onReschedule || props.onCancel ? (
            <div className="session-detail-change-actions">
              {props.onReschedule ? (
                <button
                  type="button"
                  className="session-detail-action session-detail-action--primary"
                  disabled={!canReschedule}
                  title={
                    canReschedule
                      ? undefined
                      : t(props.language, {
                          es: `Solo podés reprogramar con al menos ${noticeHours} h de anticipación.`,
                          en: `You can only reschedule at least ${noticeHours} h in advance.`,
                          pt: `Só é possível reagendar com pelo menos ${noticeHours} h de antecedência.`
                        })
                  }
                  onClick={props.onReschedule}
                >
                  {t(props.language, { es: "Reprogramar", en: "Reschedule", pt: "Reagendar" })}
                </button>
              ) : null}
              {props.onCancel ? (
                confirmCancel ? (
                  <div className="session-detail-cancel-confirm">
                    <p>
                      {isTrialBooking
                        ? t(props.language, {
                            es: `¿Cancelar tu sesión de prueba? Si cancelás con al menos ${noticeHours} h de anticipación, no se devuelve el dinero pero podés elegir otro horario sin volver a pagar.`,
                            en: `Cancel your trial session? If you cancel at least ${noticeHours} h in advance, money is not refunded but you can pick another time without paying again.`,
                            pt: `Cancelar sua sessão de teste? Se cancelar com pelo menos ${noticeHours} h de antecedência, o dinheiro não é devolvido, mas você pode escolher outro horário sem pagar de novo.`
                          })
                        : t(props.language, {
                            es: `¿Cancelar esta sesión? Si cancelás con al menos ${noticeHours} h de anticipación, no se devuelve el dinero: el crédito vuelve a tus sesiones disponibles.`,
                            en: `Cancel this session? If you cancel at least ${noticeHours} h in advance, money is not refunded — the credit returns to your available sessions.`,
                            pt: `Cancelar esta sessão? Se cancelar com pelo menos ${noticeHours} h de antecedência, o dinheiro não é devolvido — o crédito volta para suas sessões disponíveis.`
                          })}
                    </p>
                    <label className="session-detail-cancel-reason">
                      <span>
                        {t(props.language, {
                          es: "Motivo de la cancelación",
                          en: "Cancellation reason",
                          pt: "Motivo do cancelamento"
                        })}
                      </span>
                      <textarea
                        value={cancelReason}
                        onChange={(event) => setCancelReason(event.target.value)}
                        rows={3}
                        maxLength={500}
                        placeholder={t(props.language, {
                          es: "Contanos brevemente por qué cancelás…",
                          en: "Briefly tell us why you are cancelling…",
                          pt: "Conte brevemente por que está cancelando…"
                        })}
                        disabled={props.cancelSubmitting}
                      />
                    </label>
                    <div className="session-detail-cancel-confirm-actions">
                      <button
                        type="button"
                        className="session-detail-action session-detail-action--danger"
                        disabled={!canCancel || props.cancelSubmitting || cancelReason.trim().length < 3}
                        onClick={() => void props.onCancel?.(cancelReason.trim())}
                      >
                        {props.cancelSubmitting
                          ? t(props.language, { es: "Cancelando...", en: "Cancelling...", pt: "Cancelando..." })
                          : t(props.language, { es: "Confirmar cancelación", en: "Confirm cancellation", pt: "Confirmar cancelamento" })}
                      </button>
                      <button
                        type="button"
                        className="session-detail-action session-detail-action--ghost"
                        disabled={props.cancelSubmitting}
                        onClick={() => setConfirmCancel(false)}
                      >
                        {t(props.language, { es: "Volver", en: "Back", pt: "Voltar" })}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="session-detail-action session-detail-action--ghost"
                    disabled={!canCancel}
                    title={
                      canCancel
                        ? undefined
                        : t(props.language, {
                            es: `Solo podés cancelar con al menos ${noticeHours} h de anticipación.`,
                            en: `You can only cancel at least ${noticeHours} h in advance.`,
                            pt: `Só é possível cancelar com pelo menos ${noticeHours} h de antecedência.`
                          })
                    }
                    onClick={() => setConfirmCancel(true)}
                  >
                    {t(props.language, { es: "Cancelar sesión", en: "Cancel session", pt: "Cancelar sessão" })}
                  </button>
                )
              ) : null}
            </div>
          ) : null}
          <p className="session-detail-footer-hint">
            {isTrialBooking
              ? t(props.language, {
                  es: `Podés reprogramar o cancelar la sesión de prueba con al menos ${noticeHours} h de anticipación. Conectate 5 min antes.`,
                  en: `You can reschedule or cancel the trial session at least ${noticeHours} h in advance. Join 5 min early.`,
                  pt: `Você pode reagendar ou cancelar a sessão de teste com pelo menos ${noticeHours} h de antecedência. Entre 5 min antes.`
                })
              : t(props.language, {
                  es: `Para cambiar o cancelar, hacelo con al menos ${noticeHours} h de anticipación. Conectate 5 min antes.`,
                  en: `To change or cancel, do it at least ${noticeHours} h in advance. Join 5 min early.`,
                  pt: `Para mudar ou cancelar, faça com pelo menos ${noticeHours} h de antecedência. Entre 5 min antes.`
                })}
          </p>
        </section>
      </section>
    </div>
  );
}
