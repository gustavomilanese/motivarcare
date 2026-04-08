import { useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { friendlyVerifyEmailDevMessage, friendlyVerifyEmailResendMessage } from "../lib/friendlyPatientMessages";
import { apiRequest } from "../services/api";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function VerifyEmailRequiredScreen(props: {
  language: AppLanguage;
  token: string;
  email: string;
  showDevBypass: boolean;
  onVerified: () => void;
  onLogout: () => void;
}) {
  const [loadingResend, setLoadingResend] = useState(false);
  const [loadingDevVerify, setLoadingDevVerify] = useState(false);
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

  const handleDevVerify = async () => {
    setLoadingDevVerify(true);
    setError("");
    setMessage("");

    try {
      await apiRequest<{ message: string }>("/api/auth/email-verification/dev-verify", { method: "POST" }, props.token);
      props.onVerified();
    } catch {
      setError(friendlyVerifyEmailDevMessage(props.language));
    } finally {
      setLoadingDevVerify(false);
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
          <p className="verify-email-lead">
            {t(props.language, {
              es: "Te enviamos un enlace a",
              en: "We sent a link to",
              pt: "Enviamos um link para"
            })}{" "}
            <span className="verify-email-address">{props.email}</span>
          </p>
          <p className="verify-email-hint">
            {t(props.language, {
              es: "Revisa también la carpeta de spam. El enlace puede caducar.",
              en: "Check your spam folder too. The link may expire.",
              pt: "Verifique também o spam. O link pode expirar."
            })}
          </p>
          <div className="stack verify-email-actions">
            <button className="primary" type="button" onClick={handleResend} disabled={loadingResend || loadingDevVerify}>
              {loadingResend
                ? t(props.language, { es: "Enviando...", en: "Sending...", pt: "Enviando..." })
                : t(props.language, { es: "Reenviar email", en: "Resend email", pt: "Reenviar e-mail" })}
            </button>

            {props.showDevBypass ? (
              <button type="button" className="verify-email-dev" onClick={handleDevVerify} disabled={loadingResend || loadingDevVerify}>
                {loadingDevVerify ? "Verify Email (DEV)..." : "Verify Email (DEV)"}
              </button>
            ) : null}

            <button type="button" className="verify-email-secondary" onClick={props.onLogout} disabled={loadingResend || loadingDevVerify}>
              {t(props.language, { es: "Salir", en: "Log out", pt: "Sair" })}
            </button>
          </div>
          {message ? <p className="success-text verify-email-feedback">{message}</p> : null}
          {error ? <p className="error-text verify-email-feedback">{error}</p> : null}
        </div>
      </section>
    </div>
  );
}
