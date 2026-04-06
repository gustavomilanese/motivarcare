import { useEffect, useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { apiRequest } from "../services/api";

type VerificationState = "loading" | "success" | "error";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function VerifyEmailTokenScreen(props: { language: AppLanguage }) {
  const [state, setState] = useState<VerificationState>("loading");
  const [message, setMessage] = useState("");

  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token")?.trim() ?? "";
  }, []);

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage(
        t(props.language, {
          es: "Falta el token de verificación.",
          en: "Verification token is missing.",
          pt: "Token de verificacao ausente."
        })
      );
      return;
    }

    let cancelled = false;

    const verifyEmail = async () => {
      try {
        await apiRequest<{ message: string }>(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        if (cancelled) {
          return;
        }
        setState("success");
      } catch (requestError) {
        if (cancelled) {
          return;
        }
        setState("error");
        setMessage(
          requestError instanceof Error
            ? requestError.message
            : t(props.language, {
                es: "No se pudo verificar tu email.",
                en: "Your email could not be verified.",
                pt: "Nao foi possivel verificar seu e-mail."
              })
        );
      }
    };

    void verifyEmail();

    return () => {
      cancelled = true;
    };
  }, [props.language, token]);

  return (
    <div className="auth-shell">
      <section
        className="auth-card auth-card-verify-email"
        aria-busy={state === "loading"}
        aria-live="polite"
        aria-labelledby="verify-token-title"
      >
        <div className="verify-email-panel">
          {state === "loading" ? (
            <>
              <div className="verify-email-icon verify-email-icon--loading" aria-hidden="true">
                <svg className="verify-email-spinner-svg" viewBox="0 0 48 48" width="52" height="52" fill="none">
                  <circle cx="24" cy="24" r="20" stroke="#c4b5fd" strokeWidth="3" />
                  <path
                    d="M24 12a12 12 0 0 1 12 12"
                    stroke="#5f44eb"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span className="chip">
                {t(props.language, { es: "Verificación", en: "Verification", pt: "Verificacao" })}
              </span>
              <h1 id="verify-token-title">
                {t(props.language, { es: "Verificando tu email…", en: "Verifying your email…", pt: "Verificando seu e-mail…" })}
              </h1>
              <p className="verify-email-hint">
                {t(props.language, {
                  es: "Estamos validando tu enlace. Solo lleva un momento.",
                  en: "We are validating your link. This only takes a moment.",
                  pt: "Estamos validando seu link. So um instante."
                })}
              </p>
            </>
          ) : null}

          {state === "success" ? (
            <>
              <div className="verify-email-icon verify-email-icon--success" aria-hidden="true">
                <svg viewBox="0 0 48 48" width="52" height="52" fill="none">
                  <circle cx="24" cy="24" r="22" fill="rgba(22, 163, 74, 0.12)" />
                  <path
                    d="M16 24.5 21.2 30 32 18"
                    stroke="#16a34a"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="chip chip--success">
                {t(props.language, { es: "Email", en: "Email", pt: "E-mail" })}
              </span>
              <p className="verify-email-success-kicker">
                {t(props.language, { es: "Cuenta confirmada", en: "Account confirmed", pt: "Conta confirmada" })}
              </p>
              <h1 id="verify-token-title">
                {t(props.language, { es: "Email verificado", en: "Email verified", pt: "E-mail verificado" })}
              </h1>
              <p className="verify-email-lead">
                {t(props.language, {
                  es: "Tu correo quedó confirmado. Volvé al inicio para entrar con tu cuenta.",
                  en: "Your email is confirmed. Go to home to sign in with your account.",
                  pt: "Seu e-mail foi confirmado. Volte ao inicio para entrar com sua conta."
                })}
              </p>
              <div className="stack verify-email-actions">
                <button className="primary" type="button" onClick={() => window.location.assign("/")}>
                  {t(props.language, { es: "Ir al inicio", en: "Go to home", pt: "Ir ao inicio" })}
                </button>
              </div>
            </>
          ) : null}

          {state === "error" ? (
            <>
              <div className="verify-email-icon verify-email-icon--error" aria-hidden="true">
                <svg viewBox="0 0 48 48" width="52" height="52" fill="none">
                  <circle cx="24" cy="24" r="22" fill="rgba(220, 38, 38, 0.1)" />
                  <path d="M18 18 30 30M30 18 18 30" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="chip chip--error">
                {t(props.language, { es: "Error", en: "Error", pt: "Erro" })}
              </span>
              <h1 id="verify-token-title">
                {t(props.language, {
                  es: "No pudimos verificar tu email",
                  en: "We could not verify your email",
                  pt: "Nao conseguimos verificar seu e-mail"
                })}
              </h1>
              <p className="verify-email-lead error-text verify-email-feedback">{message}</p>
              <p className="verify-email-hint">
                {t(props.language, {
                  es: "Pedí un nuevo enlace desde la pantalla de verificación o registrate de nuevo.",
                  en: "Request a new link from the verification screen or sign up again.",
                  pt: "Solicite um novo link na tela de verificacao ou cadastre-se novamente."
                })}
              </p>
              <div className="stack verify-email-actions">
                <button className="primary" type="button" onClick={() => window.location.assign("/")}>
                  {t(props.language, { es: "Ir al inicio", en: "Go to home", pt: "Ir ao inicio" })}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
