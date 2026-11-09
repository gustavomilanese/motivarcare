import { useEffect, useState, type SyntheticEvent } from "react";
import {
  type AppLanguage,
  type LocalizedText,
  textByLanguage,
  resolvePatientChangeNoticeHours,
  canPatientCancelBooking,
  canPatientRescheduleBooking,
  willPatientLoseCreditOnCancel
} from "@therapy/i18n-config";
import { professionalPhotoAlt } from "../../app/components/ProfessionalNameStack";
import { professionalAccessibleName } from "../../app/lib/professionalDisplayName";
import { professionalPhotoSrc } from "../../app/services/api";
import {
  formatClock,
  formatWeekday,
  isSameZonedDay,
  sessionChipLabel,
  sessionLengthMinutes,
  sessionTiming,
  timezoneCaption
} from "../../home/calm/calmHomeFormat";
import { IconVideo } from "../../home/calm/calmIcons";
import type { Booking } from "../../app/types";
import { DeviceTestLink } from "./DeviceTestLink";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
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
  onMessageProfessional?: () => void;
  onCancel?: (reason: string) => void | Promise<void>;
  cancelSubmitting?: boolean;
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [rescheduleBlocked, setRescheduleBlocked] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const noticeHours = resolvePatientChangeNoticeHours(props.noticeHours);
  const isTrialBooking = props.booking.bookingMode === "trial";
  const isCancelled = props.booking.status === "cancelled";
  const isCompleted = !isCancelled && new Date(props.booking.endsAt).getTime() < Date.now();
  const canReschedule = !isCompleted && !isCancelled && canPatientRescheduleBooking(props.booking.startsAt, noticeHours);
  const canCancel = !isCompleted && !isCancelled && canPatientCancelBooking(props.booking.startsAt, noticeHours);
  const losesCreditOnCancel = canCancel && willPatientLoseCreditOnCancel(props.booking.startsAt, noticeHours);
  const joinUrl = isCompleted || isCancelled ? "" : (props.booking.joinUrl?.trim() ?? "");
  const professionalName = professionalAccessibleName(props.professional);
  const isPastSummary = isCompleted || isCancelled;
  const now = new Date();
  const timing = sessionTiming(props.booking.startsAt, props.booking.endsAt, now, props.timezone);
  const sameDay = isSameZonedDay(new Date(props.booking.startsAt), now, props.timezone);
  const clock = formatClock(props.booking.startsAt, props.timezone, props.language);
  const minutes = sessionLengthMinutes(props.booking.startsAt, props.booking.endsAt);
  const whenTitle = sameDay
    ? t(props.language, { es: `Hoy, ${clock}`, en: `Today, ${clock}`, pt: `Hoje, ${clock}` })
    : `${formatWeekday(props.booking.startsAt, props.timezone, props.language)}, ${clock}`;
  const zoneLabel = timezoneCaption(props.timezone, props.language, now);
  const whenMeta = isPastSummary
    ? zoneLabel
    : minutes
      ? t(props.language, {
          es: `Videollamada de ${minutes} min · ${zoneLabel}`,
          en: `${minutes}-min video call · ${zoneLabel}`,
          pt: `Videochamada de ${minutes} min · ${zoneLabel}`
        })
      : t(props.language, {
          es: `Videollamada · ${zoneLabel}`,
          en: `Video call · ${zoneLabel}`,
          pt: `Videochamada · ${zoneLabel}`
        });
  const personMeta = [props.professional.title, props.professional.approach].filter(Boolean).join(" · ");

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

  useEffect(() => {
    if (canReschedule) {
      setRescheduleBlocked(false);
    }
  }, [canReschedule]);

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

  const chipLabel = isPastSummary ? statusChipLabel : sessionChipLabel(timing, props.language);
  const chipLive = !isPastSummary && (timing.kind === "live" || timing.kind === "soon");

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
        }${confirmCancel || rescheduleBlocked ? " session-detail-modal--cancel" : ""}`}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="session-detail-close"
          type="button"
          onClick={props.onClose}
          aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
        >
          ×
        </button>

        {rescheduleBlocked ? (
          <div className="session-detail-cancel-confirm">
            <h2 className="session-detail-cancel-title">
              {t(props.language, {
                es: "No se puede reprogramar",
                en: "Can't reschedule yet",
                pt: "Não dá para reagendar"
              })}
            </h2>
            <p className="session-detail-cancel-copy">
              {t(props.language, {
                es: `Faltan menos de ${noticeHours} h para esta sesión. La reprogramación pide al menos esa anticipación. Si necesitás moverla, escribinos por el chat para coordinar.`,
                en: `There are less than ${noticeHours} h left before this session. Rescheduling needs at least that much notice. If you need to move it, message your therapist in chat to coordinate.`,
                pt: `Faltam menos de ${noticeHours} h para esta sessão. O reagendamento pede pelo menos essa antecedência. Se precisar mudar, escreva no chat para combinar.`
              })}
            </p>
            <div className="session-detail-cancel-confirm-actions">
              {props.onMessageProfessional ? (
                <button type="button" className="calm-btn calm-btn--yellow" onClick={props.onMessageProfessional}>
                  {t(props.language, {
                    es: "Escribile a tu profesional",
                    en: "Message your therapist",
                    pt: "Escrever para seu profissional"
                  })}
                </button>
              ) : null}
              <button type="button" className="calm-text-link" onClick={() => setRescheduleBlocked(false)}>
                {t(props.language, { es: "Volver", en: "Back", pt: "Voltar" })}
              </button>
            </div>
          </div>
        ) : confirmCancel && props.onCancel ? (
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
                className="calm-btn calm-btn--yellow"
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
                className="calm-text-link"
                disabled={props.cancelSubmitting}
                onClick={() => setConfirmCancel(false)}
              >
                {t(props.language, { es: "Volver", en: "Back", pt: "Voltar" })}
              </button>
            </div>
          </div>
        ) : (
          <>
            <svg className="calm-session-blob" viewBox="0 0 500 520" aria-hidden="true">
              <path d="M438.7 372.7 C410.4 424.2 340.8 463.3 284.5 475.3 C228.1 487.3 140.1 482.6 100.4 444.8 C60.7 407.0 42.8 312.5 46.0 248.6 C49.2 184.7 76.7 94.1 119.7 61.4 C162.7 28.6 248.1 34.5 303.8 52.0 C359.6 69.4 431.7 112.8 454.2 166.3 C476.7 219.7 467.0 321.2 438.7 372.7Z" fill="#E7F1EA" />
              <circle cx="380" cy="150" r="14" fill="#F5C33B" />
            </svg>
            <p className={`calm-chip${chipLive ? " calm-chip--live" : ""}`}>
              <span className="calm-chip-dot" aria-hidden="true" />
              {chipLabel}
            </p>
            <div>
              <h2 className="calm-session-when">{whenTitle}</h2>
              <p className="calm-session-meta">{whenMeta}</p>
            </div>
            <div className="calm-person">
              <span className="calm-person-ring">
                <img
                  src={professionalPhotoSrc(props.professional.photoUrl)}
                  alt={professionalPhotoAlt(props.professional)}
                  width={52}
                  height={52}
                  onError={props.onImageFallback}
                />
              </span>
              <div>
                {props.onOpenProfessionalReviews ? (
                  <button
                    type="button"
                    className="session-detail-name"
                    onClick={props.onOpenProfessionalReviews}
                  >
                    {professionalName}
                  </button>
                ) : (
                  <strong>{professionalName}</strong>
                )}
                {personMeta ? <span>{personMeta}</span> : null}
              </div>
            </div>
            {!isPastSummary ? (
              <div className="calm-session-actions">
                {joinUrl ? (
                  <a className="calm-btn calm-btn--yellow" href={joinUrl} rel="noreferrer" target="_blank">
                    <IconVideo size={18} />
                    {t(props.language, { es: "Entrar a la sesión", en: "Join session", pt: "Entrar na sessão" })}
                  </a>
                ) : (
                  <button className="calm-btn calm-btn--yellow" type="button" disabled>
                    {t(props.language, {
                      es: "El enlace llega por mail",
                      en: "The link arrives by email",
                      pt: "O link chega por e-mail"
                    })}
                  </button>
                )}
                {props.onReschedule ? (
                  <button
                    type="button"
                    className="calm-btn calm-btn--outline"
                    onClick={() => {
                      if (canReschedule) {
                        props.onReschedule?.();
                        return;
                      }
                      setRescheduleBlocked(true);
                    }}
                  >
                    {t(props.language, { es: "Reprogramar", en: "Reschedule", pt: "Reagendar" })}
                  </button>
                ) : null}
              </div>
            ) : null}
            {!isPastSummary ? (
              <div className="session-detail-footer-links">
                {props.onCancel ? (
                  <button
                    type="button"
                    className="calm-text-link session-detail-cancel-link"
                    disabled={!canCancel}
                    onClick={() => setConfirmCancel(true)}
                  >
                    {t(props.language, { es: "Cancelar sesión", en: "Cancel session", pt: "Cancelar sessão" })}
                  </button>
                ) : (
                  <span />
                )}
                <DeviceTestLink language={props.language} className="session-detail-av-link" />
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
