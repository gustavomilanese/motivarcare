import { useEffect, useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { friendlyVerifyEmailTokenFailedMessage, friendlyVerifyEmailTokenMissingMessage } from "../lib/friendlyPatientMessages";
import { apiRequest } from "../services/api";
import type { AuthApiResponse } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Strict Mode (dev) runs the effect twice; the first /verify-email call already consumes the one-time token. */
function emailVerifySuccessStorageKey(token: string): string {
  return `motivarcare:email-verified:${token}`;
}

const verifyEmailRequestByToken = new Map<string, Promise<unknown>>();

type VerificationState = "loading" | "error";

/** Respuesta GET /verify-email tras el cambio que devuelve JWT igual que login. */
type VerifyEmailApiBody = AuthApiResponse & { message: string };

export type PatientVerifyEmailCompletePayload = {
  token: string;
  user: AuthApiResponse["user"];
  emailVerificationRequired: boolean;
};

export function VerifyEmailTokenScreen(props: {
  language: AppLanguage;
  /** Con sesión nueva desde el servidor si el GET devolvió token (pestaña del mail sin localStorage previo). */
  onVerificationComplete?: (payload?: PatientVerifyEmailCompletePayload) => void;
}) {
  const [state, setState] = useState<VerificationState>("loading");
  const [message, setMessage] = useState("");

  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token")?.trim() ?? "";
  }, []);

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage(friendlyVerifyEmailTokenMissingMessage(props.language));
      return;
    }

    const storageKey = emailVerifySuccessStorageKey(token);
    if (sessionStorage.getItem(storageKey) === "1") {
      props.onVerificationComplete?.();
      return;
    }

    let cancelled = false;

    const verifyEmail = async () => {
      try {
        let request = verifyEmailRequestByToken.get(token);
        if (!request) {
          const pending = apiRequest<VerifyEmailApiBody>(
            `/api/auth/verify-email?token=${encodeURIComponent(token)}`
          );
          request = pending.finally(() => {
            verifyEmailRequestByToken.delete(token);
          });
          verifyEmailRequestByToken.set(token, request);
        }
        const data = await request;
        sessionStorage.setItem(storageKey, "1");
        if (!cancelled) {
          if (
            typeof data.token === "string"
            && data.token.length > 0
            && data.user?.role === "PATIENT"
          ) {
            props.onVerificationComplete?.({
              token: data.token,
              user: data.user,
              emailVerificationRequired: Boolean(data.emailVerificationRequired)
            });
          } else {
            props.onVerificationComplete?.();
          }
        }
      } catch (requestError) {
        if (cancelled) {
          return;
        }
        setState("error");
        setMessage(
          friendlyVerifyEmailTokenFailedMessage(
            requestError instanceof Error ? requestError.message : "",
            props.language
          )
        );
      }
    };

    void verifyEmail();

    return () => {
      cancelled = true;
    };
  }, [props.language, props.onVerificationComplete, token]);

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

          {state === "error" ? (
            <>
              <div className="verify-email-icon verify-email-icon--error" aria-hidden="true">
                <svg viewBox="0 0 48 48" width="52" height="52" fill="none">
                  <circle cx="24" cy="24" r="22" fill="rgba(220, 38, 38, 0.1)" />
                  <path d="M18 18 30 30M30 18 18 30" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="chip chip--error">
                {t(props.language, { es: "Enlace", en: "Link", pt: "Link" })}
              </span>
              <h1 id="verify-token-title">
                {t(props.language, {
                  es: "Este enlace no sirvió para confirmar el correo",
                  en: "This link didn’t confirm your email",
                  pt: "Este link nao confirmou seu e-mail"
                })}
              </h1>
              <p className="verify-email-lead error-text verify-email-feedback">{message}</p>
              <p className="verify-email-hint">
                {t(props.language, {
                  es: "Podés volver al inicio, iniciar sesión si ya verificaste antes, o pedir otro correo desde «Reenviar email» en la pantalla de verificación.",
                  en: "You can go home, sign in if you already verified, or request another email with «Resend email» on the verification screen.",
                  pt: "Voce pode ir ao inicio, entrar se ja verificou antes, ou pedir outro e-mail em reenviar na tela de verificacao."
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
