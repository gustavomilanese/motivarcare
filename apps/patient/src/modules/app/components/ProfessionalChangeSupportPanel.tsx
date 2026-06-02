import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { buildProfessionalChangeMailtoUrl, PATIENT_SUPPORT_EMAIL } from "../constants/support";
import { requestProfessionalChange } from "../services/professionalChangeRequestApi";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function openMailtoFallback(params: {
  supportEmail?: string;
  patientName?: string | null;
  patientEmail?: string | null;
  assignedProfessionalName?: string | null;
  reason?: string | null;
}): void {
  window.location.href = buildProfessionalChangeMailtoUrl(params);
}

function ProfessionalChangeRequestModal(props: {
  language: AppLanguage;
  authToken: string | null;
  patientName?: string | null;
  patientEmail?: string | null;
  assignedProfessionalName?: string | null;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showMailtoFallback, setShowMailtoFallback] = useState(false);
  const [fallbackSupportEmail, setFallbackSupportEmail] = useState(PATIENT_SUPPORT_EMAIL);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        props.onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loading, props.onClose]);

  const mailtoParams = {
    supportEmail: fallbackSupportEmail,
    patientName: props.patientName,
    patientEmail: props.patientEmail,
    assignedProfessionalName: props.assignedProfessionalName,
    reason: reason.trim() || undefined
  };

  const offerMailtoFallback = (supportEmail: string) => {
    setFallbackSupportEmail(supportEmail || PATIENT_SUPPORT_EMAIL);
    setShowMailtoFallback(true);
    setMessage(
      t(props.language, {
        es: "No pudimos enviar el correo automáticamente. Podés abrir tu cliente de email con el mensaje ya preparado.",
        en: "We couldn't send the email automatically. You can open your email app with a pre-filled message.",
        pt: "Nao foi possivel enviar o e-mail automaticamente. Voce pode abrir seu app de e-mail com a mensagem pronta."
      })
    );
  };

  const submit = async () => {
    if (!props.authToken) {
      offerMailtoFallback(PATIENT_SUPPORT_EMAIL);
      return;
    }

    setLoading(true);
    setMessage("");
    setShowMailtoFallback(false);
    setSuccess(false);

    try {
      const response = await requestProfessionalChange(props.authToken, {
        reason: reason.trim() || undefined,
        language: props.language
      });

      if (response.emailDelivered) {
        setSuccess(true);
        setMessage(
          t(props.language, {
            es: "Recibimos tu solicitud. Soporte te contactará por email a la brevedad.",
            en: "We received your request. Support will email you shortly.",
            pt: "Recebemos sua solicitacao. O suporte entrara em contato por e-mail em breve."
          })
        );
        setReason("");
        return;
      }

      offerMailtoFallback(response.supportEmail);
    } catch (requestError) {
      console.warn("[professional-change]", requestError instanceof Error ? requestError.message : requestError);
      offerMailtoFallback(PATIENT_SUPPORT_EMAIL);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="session-modal-backdrop professional-change-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="professional-change-modal-title"
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget || loading) {
          return;
        }
        props.onClose();
      }}
    >
      <div
        className="session-modal professional-change-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="professional-change-modal-title" className="intake-question-title">
          {t(props.language, {
            es: "Cambio de profesional",
            en: "Change professional",
            pt: "Troca de profissional"
          })}
        </h2>
        <p className="intake-question-help">
          {t(props.language, {
            es: "Si querés trabajar con otro psicólogo/a, nuestro equipo lo gestiona de forma manual. No podés elegir otro profesional directamente desde la app por ahora.",
            en: "If you'd like to work with a different therapist, our team handles the change manually. You can't pick another professional directly in the app yet.",
            pt: "Se quiser trabalhar com outro/a profissional, nossa equipe faz a troca manualmente. Por enquanto nao e possivel escolher outro profissional direto no app."
          })}
        </p>
        <p className="intake-question-help">
          {t(props.language, {
            es: "Contanos brevemente el motivo (opcional) y te respondemos por email con los próximos pasos.",
            en: "Tell us briefly why (optional) and we'll reply by email with next steps.",
            pt: "Conte brevemente o motivo (opcional) e responderemos por e-mail com os proximos passos."
          })}
        </p>
        {props.assignedProfessionalName ? (
          <p className="professional-change-modal-meta">
            {t(props.language, {
              es: `Profesional actual: ${props.assignedProfessionalName}`,
              en: `Current professional: ${props.assignedProfessionalName}`,
              pt: `Profissional atual: ${props.assignedProfessionalName}`
            })}
          </p>
        ) : null}

        {!success ? (
          <textarea
            className="professional-change-support-reason"
            rows={4}
            value={reason}
            disabled={loading}
            placeholder={t(props.language, {
              es: "Motivo del cambio (opcional)",
              en: "Reason for the change (optional)",
              pt: "Motivo da troca (opcional)"
            })}
            onChange={(event) => setReason(event.target.value)}
          />
        ) : null}

        {message ? (
          <p className={success ? "success-text professional-change-modal-feedback" : "professional-change-modal-feedback"}>
            {message}
          </p>
        ) : null}

        <div className="intake-wizard-actions professional-change-modal-actions">
          <button
            className="ghost intake-wizard-secondary"
            type="button"
            disabled={loading}
            onClick={props.onClose}
          >
            {success
              ? t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })
              : t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
          </button>
          {!success && showMailtoFallback ? (
            <button
              className="ghost intake-wizard-secondary"
              type="button"
              onClick={() => openMailtoFallback(mailtoParams)}
            >
              {t(props.language, {
                es: "Abrir email",
                en: "Open email",
                pt: "Abrir e-mail"
              })}
            </button>
          ) : null}
          {!success ? (
            <button
              className="primary intake-wizard-primary"
              type="button"
              disabled={loading}
              onClick={() => void submit()}
            >
              {loading
                ? t(props.language, { es: "Enviando…", en: "Sending…", pt: "Enviando…" })
                : t(props.language, {
                    es: "Enviar solicitud",
                    en: "Send request",
                    pt: "Enviar solicitacao"
                  })}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Botón + modal en portal (body): la card del dashboard solo muestra el trigger.
 */
export function ProfessionalChangeSupportPanel(props: {
  language: AppLanguage;
  authToken: string | null;
  patientName?: string | null;
  patientEmail?: string | null;
  assignedProfessionalName?: string | null;
  /** Botón dentro de la fila de acciones de la card del home. */
  triggerStyle?: "card-action" | "profile-button";
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const triggerStyle = props.triggerStyle ?? "profile-button";

  const openModal = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    setOpen(true);
  };

  const triggerLabel =
    triggerStyle === "card-action"
      ? t(props.language, {
          es: "Solicitar cambio",
          en: "Request change",
          pt: "Solicitar troca"
        })
      : t(props.language, {
          es: "Solicitar cambio de profesional",
          en: "Request a professional change",
          pt: "Solicitar troca de profissional"
        });

  return (
    <>
      <button
        type="button"
        className={
          triggerStyle === "card-action"
            ? "active-professional-action-btn active-professional-action-btn--secondary"
            : "ghost professional-change-support-btn"
        }
        onClick={openModal}
        aria-haspopup="dialog"
      >
        {triggerLabel}
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <ProfessionalChangeRequestModal
              language={props.language}
              authToken={props.authToken}
              patientName={props.patientName}
              patientEmail={props.patientEmail}
              assignedProfessionalName={props.assignedProfessionalName}
              onClose={close}
            />,
            document.body
          )
        : null}
    </>
  );
}
