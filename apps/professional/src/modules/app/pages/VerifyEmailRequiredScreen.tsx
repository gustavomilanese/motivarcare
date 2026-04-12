import { useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { professionalSurfaceMessage } from "../lib/friendlyProfessionalSurfaceMessages";
import { apiRequest } from "../services/api";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function VerifyEmailRequiredScreen(props: {
  language: AppLanguage;
  token: string;
  email: string;
  onLogout: () => void;
}) {
  const [loadingResend, setLoadingResend] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleResend = async () => {
    setLoadingResend(true);
    setError("");
    setMessage("");

    try {
      const response = await apiRequest<{ message: string }>("/api/auth/email-verification/resend", props.token, {
        method: "POST"
      });
      setMessage(response.message);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(professionalSurfaceMessage("verify-resend", props.language, raw));
    } finally {
      setLoadingResend(false);
    }
  };

  return (
    <div className="pro-auth-shell">
      <section className="pro-auth-card pro-auth-card-verify-email" aria-labelledby="pro-verify-email-title">
        <div className="pro-verify-email-panel">
          <div className="pro-verify-email-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" width="48" height="48" fill="none">
              <circle cx="24" cy="24" r="22" fill="url(#proVerifyEmailGrad)" opacity="0.2" />
              <path
                d="M12 18.5h24v14a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2v-14z"
                stroke="#5f44eb"
                strokeWidth="2"
                fill="none"
              />
              <path d="M12 18.5 24 27l12-8.5" stroke="#5f44eb" strokeWidth="2" fill="none" strokeLinecap="round" />
              <defs>
                <linearGradient id="proVerifyEmailGrad" x1="12" y1="12" x2="36" y2="36">
                  <stop stopColor="#5f44eb" />
                  <stop offset="1" stopColor="#7b5bff" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="pro-chip">
            {t(props.language, {
              es: "Verificación requerida",
              en: "Verification required",
              pt: "Verificacao obrigatoria"
            })}
          </span>
          <h1 id="pro-verify-email-title">
            {t(props.language, {
              es: "Revisa tu correo para continuar",
              en: "Check your email to continue",
              pt: "Verifique seu e-mail para continuar"
            })}
          </h1>
          <p className="pro-verify-email-lead">
            {t(props.language, {
              es: "Te enviamos un enlace a",
              en: "We sent a link to",
              pt: "Enviamos um link para"
            })}{" "}
            <span className="pro-verify-email-address">{props.email}</span>
          </p>
          <p className="pro-verify-email-hint">
            {t(props.language, {
              es: "Revisa también la carpeta de spam. El enlace puede caducar.",
              en: "Check your spam folder too. The link may expire.",
              pt: "Verifique também o spam. O link pode expirar."
            })}
          </p>
          <div className="pro-stack pro-verify-email-actions">
            <button className="pro-primary" type="button" onClick={handleResend} disabled={loadingResend}>
              {loadingResend
                ? t(props.language, { es: "Enviando...", en: "Sending...", pt: "Enviando..." })
                : t(props.language, { es: "Reenviar email", en: "Resend email", pt: "Reenviar e-mail" })}
            </button>

            <button
              type="button"
              className="pro-verify-email-secondary"
              onClick={props.onLogout}
              disabled={loadingResend}
            >
              {t(props.language, { es: "Salir", en: "Log out", pt: "Sair" })}
            </button>
          </div>
          {message ? <p className="pro-success pro-verify-email-feedback">{message}</p> : null}
          {error ? <p className="pro-error pro-verify-email-feedback">{error}</p> : null}
        </div>
      </section>
    </div>
  );
}
