import { useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { friendlyVerifyEmailResendMessage } from "../lib/friendlyPatientMessages";
import { apiRequest } from "../services/api";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function VerifyEmailRequiredScreen(props: {
  language: AppLanguage;
  token: string;
  /** Cierra sesión en el portal (limpia token y estado local). */
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
      const response = await apiRequest<{ message: string }>(
        "/api/auth/email-verification/resend",
        { method: "POST" },
        props.token
      );
      setMessage(response.message);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(friendlyVerifyEmailResendMessage(raw, props.language));
    } finally {
      setLoadingResend(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-card auth-card-verify-email" aria-labelledby="verify-email-title">
        <div className="verify-email-panel">
          <div className="verify-email-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" width="48" height="48" fill="none">
              <circle cx="24" cy="24" r="22" fill="url(#verifyEmailGrad)" opacity="0.2" />
              <path
                d="M12 18.5h24v14a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2v-14z"
                stroke="#5f44eb"
                strokeWidth="2"
                fill="none"
              />
              <path d="M12 18.5 24 27l12-8.5" stroke="#5f44eb" strokeWidth="2" fill="none" strokeLinecap="round" />
              <defs>
                <linearGradient id="verifyEmailGrad" x1="12" y1="12" x2="36" y2="36">
                  <stop stopColor="#5f44eb" />
                  <stop offset="1" stopColor="#7b5bff" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="chip">
            {t(props.language, {
              es: "Verificación requerida",
              en: "Verification required",
              pt: "Verificacao obrigatoria"
            })}
          </span>
          <h1 id="verify-email-title">
            {t(props.language, {
              es: "Revisa tu correo para continuar",
              en: "Check your email to continue",
              pt: "Verifique seu e-mail para continuar"
            })}
          </h1>
          <p className="verify-email-body">
            {t(props.language, {
              es: "Abrí tu correo y seguí las instrucciones.",
              en: "Open your email and follow the instructions.",
              pt: "Abra seu e-mail e siga as instruções."
            })}
          </p>
          <p className="verify-email-body verify-email-body--spam">
            {t(props.language, {
              es: "Chequea SPAM si no lo ves.",
              en: "Check your spam folder if you don’t see it.",
              pt: "Verifique o spam se não encontrar."
            })}
          </p>
          <p className="verify-email-resend-row" role="status" aria-live="polite">
            <span className="verify-email-resend-label">
              {t(props.language, {
                es: "¿No te llegó después de unos minutos?",
                en: "Still nothing after a few minutes?",
                pt: "Ainda nada depois de alguns minutos?"
              })}{" "}
            </span>
            <button
              type="button"
              className="verify-email-resend-link"
              onClick={() => void handleResend()}
              disabled={loadingResend}
            >
              {loadingResend
                ? t(props.language, { es: "Enviando…", en: "Sending…", pt: "Enviando…" })
                : t(props.language, { es: "Reenviar correo", en: "Resend email", pt: "Reenviar e-mail" })}
            </button>
          </p>
          <footer className="verify-email-card-footer">
            <p className="verify-email-footer-label">
              {t(props.language, {
                es: "¿No es tu cuenta o querés usar otro correo?",
                en: "Not your account, or need a different email?",
                pt: "Nao e sua conta ou precisa de outro e-mail?"
              })}
            </p>
            <button
              type="button"
              className="verify-email-logout-link"
              onClick={props.onLogout}
              disabled={loadingResend}
            >
              {t(props.language, { es: "Cerrar sesión", en: "Log out", pt: "Sair" })}
            </button>
          </footer>
          {message ? <p className="success-text verify-email-feedback">{message}</p> : null}
          {error ? <p className="error-text verify-email-feedback">{error}</p> : null}
        </div>
      </section>
    </div>
  );
}
