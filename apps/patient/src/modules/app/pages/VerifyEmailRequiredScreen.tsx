import { useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
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
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo reenviar el email de verificación.",
              en: "Could not resend verification email.",
              pt: "Nao foi possivel reenviar o email de verificacao."
            })
      );
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
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo verificar en modo desarrollo.",
              en: "Could not verify in development mode.",
              pt: "Nao foi possivel validar no modo de desenvolvimento."
            })
      );
    } finally {
      setLoadingDevVerify(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <span className="chip">{t(props.language, { es: "Verificación requerida", en: "Verification required", pt: "Verificacao obrigatoria" })}</span>
        <h1>{t(props.language, { es: "Revisa tu correo para continuar", en: "Check your email to continue", pt: "Verifique seu e-mail para continuar" })}</h1>
        <p>
          {t(props.language, {
            es: `Te enviamos un enlace de verificación a ${props.email}.`,
            en: `We sent a verification link to ${props.email}.`,
            pt: `Enviamos um link de verificacao para ${props.email}.`
          })}
        </p>
        <div className="stack">
          <button className="primary" type="button" onClick={handleResend} disabled={loadingResend || loadingDevVerify}>
            {loadingResend
              ? t(props.language, { es: "Enviando...", en: "Sending...", pt: "Enviando..." })
              : t(props.language, { es: "Reenviar email", en: "Resend email", pt: "Reenviar e-mail" })}
          </button>

          {props.showDevBypass ? (
            <button type="button" onClick={handleDevVerify} disabled={loadingResend || loadingDevVerify}>
              {loadingDevVerify ? "Verify Email (DEV)..." : "Verify Email (DEV)"}
            </button>
          ) : null}

          <button type="button" onClick={props.onLogout} disabled={loadingResend || loadingDevVerify}>
            {t(props.language, { es: "Salir", en: "Logout", pt: "Sair" })}
          </button>
        </div>
        {message ? <p className="success-text">{message}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
      </section>
    </div>
  );
}
