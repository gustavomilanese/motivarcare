import { useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { PATIENT_SUPPORT_EMAIL } from "../constants/support";
import { requestProfessionalChange } from "../services/professionalChangeRequestApi";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfessionalChangeSupportPanel(props: {
  language: AppLanguage;
  authToken: string | null;
  assignedProfessionalName?: string | null;
  /** `link`: solo un enlace discreto (dashboard). `full`: formulario en Perfil → Soporte. */
  variant?: "full" | "link";
  /** @deprecated Usar variant="link" */
  compact?: boolean;
}) {
  const variant = props.variant ?? (props.compact ? "link" : "full");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    if (!props.authToken) {
      setError(
        t(props.language, {
          es: "Necesitás iniciar sesión para enviar la solicitud.",
          en: "You need to be signed in to send this request.",
          pt: "Voce precisa estar conectado/a para enviar a solicitacao."
        })
      );
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await requestProfessionalChange(props.authToken, {
        reason: reason.trim() || undefined,
        language: props.language
      });

      if (response.emailDelivered) {
        setMessage(
          t(props.language, {
            es: "Recibimos tu solicitud. Soporte te contactará por email a la brevedad.",
            en: "We received your request. Support will email you shortly.",
            pt: "Recebemos sua solicitacao. O suporte entrara em contato por e-mail em breve."
          })
        );
        setReason("");
      } else {
        setMessage(
          t(props.language, {
            es: `No pudimos enviar el correo automáticamente. Escribinos a ${response.supportEmail || PATIENT_SUPPORT_EMAIL}.`,
            en: `We couldn't send the email automatically. Write to ${response.supportEmail || PATIENT_SUPPORT_EMAIL}.`,
            pt: `Nao foi possivel enviar o e-mail automaticamente. Escreva para ${response.supportEmail || PATIENT_SUPPORT_EMAIL}.`
          })
        );
      }
    } catch (requestError) {
      const fallback = `mailto:${PATIENT_SUPPORT_EMAIL}?subject=${encodeURIComponent("Solicitud de cambio de profesional")}`;
      setError(
        t(props.language, {
          es: `No pudimos enviar la solicitud ahora. Probá de nuevo o escribinos a ${PATIENT_SUPPORT_EMAIL}.`,
          en: `We couldn't send the request right now. Try again or email ${PATIENT_SUPPORT_EMAIL}.`,
          pt: `Nao foi possivel enviar agora. Tente de novo ou escreva para ${PATIENT_SUPPORT_EMAIL}.`
        })
      );
      if (requestError instanceof Error) {
        console.warn("[professional-change]", requestError.message, fallback);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`professional-change-support${variant === "link" ? " professional-change-support--link" : ""}`}>
      {variant === "full" ? (
        <p className="professional-change-support-lead">
          {t(props.language, {
            es: "Si querés cambiar de profesional, nuestro equipo lo gestiona manualmente. Contanos brevemente el motivo y te respondemos por email.",
            en: "If you'd like to change professionals, our team handles it manually. Tell us briefly why and we'll reply by email.",
            pt: "Se quiser trocar de profissional, nossa equipe faz isso manualmente. Conte brevemente o motivo e responderemos por e-mail."
          })}
        </p>
      ) : null}
      {variant === "full" && props.assignedProfessionalName ? (
        <p className="professional-change-support-meta">
          {t(props.language, {
            es: `Profesional actual: ${props.assignedProfessionalName}`,
            en: `Current professional: ${props.assignedProfessionalName}`,
            pt: `Profissional atual: ${props.assignedProfessionalName}`
          })}
        </p>
      ) : null}
      {variant === "full" ? (
        <textarea
          className="professional-change-support-reason"
          rows={3}
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
      <button
        className={variant === "link" ? "professional-change-link-btn" : "ghost professional-change-support-btn"}
        type="button"
        disabled={loading}
        onClick={() => void submit()}
      >
        {loading
          ? t(props.language, { es: "Enviando…", en: "Sending…", pt: "Enviando…" })
          : t(props.language, {
              es: "Solicitar cambio de profesional",
              en: "Request a professional change",
              pt: "Solicitar troca de profissional"
            })}
      </button>
      {message ? <p className="success-text professional-change-support-feedback">{message}</p> : null}
      {error ? <p className="error-text professional-change-support-feedback">{error}</p> : null}
    </div>
  );
}
