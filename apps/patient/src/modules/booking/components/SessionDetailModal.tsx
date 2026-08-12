import { useEffect, useState, type SyntheticEvent } from "react";
import {
  type AppLanguage,
  type LocalizedText,
  formatDateWithLocale,
  textByLanguage,
  resolvePatientChangeNoticeHours,
  canPatientCancelBooking,
  canPatientRescheduleBooking,
  willPatientLoseCreditOnCancel
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
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }
  });
}

export function SessionDetailModal(props: {
  booking: Booking;
  timezone: string;
  language: AppLanguage;
  patientName?: string | null;
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
  const isCancelled = props.booking.status === "cancelled";
  const isCompleted = !isCancelled && new Date(props.booking.endsAt).getTime() < Date.now();
  const canReschedule = !isCompleted && !isCancelled && canPatientRescheduleBooking(props.booking.startsAt, noticeHours);
  const canCancel = !isCompleted && !isCancelled && canPatientCancelBooking(props.booking.startsAt, noticeHours);
  const losesCreditOnCancel = canCancel && willPatientLoseCreditOnCancel(props.booking.startsAt, noticeHours);
  const joinUrl = isCompleted || isCancelled ? "" : (props.booking.joinUrl?.trim() ?? "");
  const isGoogleMeet = joinUrl.includes("meet.google.");
  const isLikelyNonMeetVideoLink =
    Boolean(joinUrl)
    && !isGoogleMeet
    && (/\bdaily\.co\b/i.test(joinUrl) || /\bvideo\.therapy\.local\b/i.test(joinUrl));
  const reviewCount = props.professional.reviewsCount ?? 0;
  const averageRating = props.professional.rating ?? null;
  const displayRating = resolveProfessionalDisplayRating(averageRating, reviewCount);
  const professionalName = professionalAccessibleName(props.professional);
  const isPastSummary = isCompleted || isCancelled;

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        props.onClose();
      }
    };

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
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

  const statusChipLabel = isCancelled
    ? isTrialBooking
      ? t(props.language, {
          es: "Prueba cancelada",
          en: "Trial cancelled",
          pt: "Teste cancelada"
        })
      : t(props.language, {
          es: "Cancelada",
          en: "Cancelled",
          pt: "Cancelada"
        })
    : isCompleted
      ? isTrialBooking
        ? t(props.language, {
            es: "Prueba realizada",
            en: "Trial done",
            pt: "Teste feita"
          })
        : t(props.language, {
            es: "Realizada",
            en: "Completed",
            pt: "Realizada"
          })
      : isTrialBooking
        ? t(props.language, {
            es: "Prueba",
            en: "Trial",
            pt: "Teste"
          })
        : t(props.language, {
            es: "Reservada",
            en: "Booked",
            pt: "Reservada"
          });

  const dateLabel = formatDateOnly({
    isoDate: props.booking.startsAt,
    timezone: props.timezone,
    language: props.language
  });
  const timeLabel = formatTimeOnly({
    isoDate: props.booking.startsAt,
    timezone: props.timezone,
    language: props.language
  });

  const proBlock = (
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
            <span className="session-detail-pro-name">{professionalName}</span>
            <span className="session-detail-pro-rating">
              <ProfessionalReviewStarsRow averageRating={averageRating} reviewCount={reviewCount} size="md" />
              <span className="session-detail-pro-rating-value">{displayRating.toFixed(1)}</span>
            </span>
          </button>
        ) : (
          <>
            <span className="session-detail-pro-name">{professionalName}</span>
            <span className="session-detail-pro-rating session-detail-pro-rating--static">
              <ProfessionalReviewStarsRow averageRating={averageRating} reviewCount={reviewCount} size="md" />
              <span className="session-detail-pro-rating-value">{displayRating.toFixed(1)}</span>
            </span>
          </>
        )}
        {props.professional.title ? <p className="session-detail-pro-title">{props.professional.title}</p> : null}
      </div>
    </div>
  );

  return (
    <div className="session-modal-backdrop" role="presentation" onClick={props.onClose}>
      <section
        aria-label={t(props.language, {
          es: "Detalle de sesión",
          en: "Session details",
          pt: "Detalhes da sessao"
        })}
        aria-modal="true"
        className={`session-modal session-detail-modal${
          isCompleted ? " session-detail-modal--completed" : isCancelled ? " session-detail-modal--cancelled" : ""
        }${confirmCancel ? " session-detail-modal--cancel" : ""}`}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="session-detail-head">
          <span
            className={`session-detail-status${
              isCompleted ? " session-detail-status--done" : isCancelled ? " session-detail-status--cancelled" : ""
            }`}
          >
            {statusChipLabel}
          </span>
          <button
            className="session-detail-close"
            type="button"
            onClick={props.onClose}
            aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
          >
            ×
          </button>
        </header>

        {confirmCancel && props.onCancel ? (
          <div className="session-detail-cancel-confirm">
            <h2 className="session-detail-cancel-title">
              {t(props.language, {
                es: "Cancelar sesión",
                en: "Cancel session",
                pt: "Cancelar sessão"
              })}
            </h2>
            <p className="session-detail-cancel-copy">
              {losesCreditOnCancel
                ? isTrialBooking
                  ? t(props.language, {
                      es: `ATENCIÓN: faltan menos de ${noticeHours} h. Si cancelás ahora, PERDÉS la sesión de prueba. No se puede reprogramar ni recuperar. Si necesitás coordinar algo, escribile por el chat interno a tu terapeuta para que quede constancia en el sistema.`,
                      en: `WARNING: less than ${noticeHours} h left. Cancelling now means you LOSE the trial session. It cannot be rescheduled or recovered. If you need to coordinate, message your therapist in the in-app chat so there is a record in the system.`,
                      pt: `ATENÇÃO: faltam menos de ${noticeHours} h. Se cancelar agora, VOCÊ PERDE a sessão de teste. Não dá para reagendar nem recuperar. Se precisar combinar algo, escreva no chat interno para seu terapeuta para ficar registrado no sistema.`
                    })
                  : t(props.language, {
                      es: `ATENCIÓN: faltan menos de ${noticeHours} h. Si cancelás ahora, PERDÉS el crédito de esta sesión. No vuelve a tu saldo. Si necesitás coordinar algo, escribile por el chat interno a tu terapeuta para que quede constancia en el sistema.`,
                      en: `WARNING: less than ${noticeHours} h left. Cancelling now means you LOSE this session credit. It will not return to your balance. If you need to coordinate, message your therapist in the in-app chat so there is a record in the system.`,
                      pt: `ATENÇÃO: faltam menos de ${noticeHours} h. Se cancelar agora, VOCÊ PERDE o crédito desta sessão. Não volta ao saldo. Se precisar combinar algo, escreva no chat interno para seu terapeuta para ficar registrado no sistema.`
                    })
                : isTrialBooking
                  ? t(props.language, {
                      es: `Con al menos ${noticeHours} h de anticipación no se devuelve el dinero, pero podés elegir otro horario sin pagar de nuevo.`,
                      en: `At least ${noticeHours} h ahead: money isn’t refunded, but you can pick another time without paying again.`,
                      pt: `Com pelo menos ${noticeHours} h de antecedência o dinheiro não volta, mas você pode escolher outro horário sem pagar de novo.`
                    })
                  : t(props.language, {
                      es: `Con al menos ${noticeHours} h de anticipación el crédito vuelve a tus sesiones disponibles (sin reembolso en dinero).`,
                      en: `At least ${noticeHours} h ahead: the credit returns to your available sessions (no cash refund).`,
                      pt: `Com pelo menos ${noticeHours} h de antecedência o crédito volta para suas sessões (sem reembolso).`
                    })}
            </p>
            <label className="session-detail-cancel-reason">
              <span>
                {t(props.language, {
                  es: "Motivo",
                  en: "Reason",
                  pt: "Motivo"
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
                  ? t(props.language, { es: "Cancelando…", en: "Cancelling…", pt: "Cancelando…" })
                  : losesCreditOnCancel
                    ? t(props.language, {
                        es: "Cancelar y perder el crédito",
                        en: "Cancel and lose credit",
                        pt: "Cancelar e perder o crédito"
                      })
                    : t(props.language, { es: "Confirmar", en: "Confirm", pt: "Confirmar" })}
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
          <>
            {proBlock}

            <div className="session-detail-when">
              <p className="session-detail-when-date">{dateLabel}</p>
              <p className="session-detail-when-time">{timeLabel}</p>
              <p className="session-detail-when-tz">{props.timezone}</p>
            </div>

            {!isPastSummary ? (
              <section
                className="session-detail-meet"
                aria-label={t(props.language, { es: "Videollamada", en: "Video call", pt: "Videochamada" })}
              >
                {joinUrl ? (
                  <>
                    {isLikelyNonMeetVideoLink ? (
                      <p className="session-detail-meet-fallback-hint">
                        {t(props.language, {
                          es: "Enlace de respaldo: no se pudo crear Google Meet.",
                          en: "Fallback link: Google Meet couldn’t be created.",
                          pt: "Link de respaldo: não foi possível criar o Google Meet."
                        })}
                      </p>
                    ) : null}
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
                          ? t(props.language, { es: "Copiado", en: "Copied", pt: "Copiado" })
                          : t(props.language, { es: "Copiar enlace", en: "Copy link", pt: "Copiar link" })}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="session-detail-meet-empty">
                    {t(props.language, {
                      es: "El enlace de videollamada aparece acá cuando esté listo.",
                      en: "Your video link will show up here when it’s ready.",
                      pt: "O link da videochamada aparece aqui quando estiver pronto."
                    })}
                  </p>
                )}
              </section>
            ) : null}

            {!isPastSummary && (props.onReschedule || props.onCancel) ? (
              <div className="session-detail-change-actions">
                {props.onReschedule ? (
                  <button
                    type="button"
                    className="session-detail-action session-detail-action--ghost"
                    disabled={!canReschedule}
                    title={
                      canReschedule
                        ? undefined
                        : t(props.language, {
                            es: `Reprogramá con al menos ${noticeHours} h de anticipación.`,
                            en: `Reschedule at least ${noticeHours} h in advance.`,
                            pt: `Reagende com pelo menos ${noticeHours} h de antecedência.`
                          })
                    }
                    onClick={props.onReschedule}
                  >
                    {t(props.language, { es: "Reprogramar", en: "Reschedule", pt: "Reagendar" })}
                  </button>
                ) : null}
                {props.onCancel ? (
                  <button
                    type="button"
                    className="session-detail-action session-detail-action--danger-outline"
                    disabled={!canCancel}
                    onClick={() => setConfirmCancel(true)}
                  >
                    {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
                  </button>
                ) : null}
              </div>
            ) : null}

            {!isPastSummary ? (
              <p className="session-detail-footnote">
                {t(props.language, {
                  es: `Conectate 5 min antes · reprogramar con ${noticeHours} h · cancelar tarde pierde el crédito`,
                  en: `Join 5 min early · reschedule needs ${noticeHours} h · late cancel loses credit`,
                  pt: `Entre 5 min antes · reagendar com ${noticeHours} h · cancelar tarde perde o crédito`
                })}
              </p>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
