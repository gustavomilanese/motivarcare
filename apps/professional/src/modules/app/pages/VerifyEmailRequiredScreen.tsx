import { useEffect, useRef, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { resendVerificationEmail } from "../lib/ensureVerificationEmailSent";
import { professionalSurfaceMessage } from "../lib/friendlyProfessionalSurfaceMessages";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function VerifyEmailRequiredScreen(props: {
  language: AppLanguage;
  token: string;
  email: string;
  emailDeliveryConfigured?: boolean;
  onLogout: () => void;
}) {
  const [loadingInitialSend, setLoadingInitialSend] = useState(true);
  const [loadingResend, setLoadingResend] = useState(false);
  const [initialSendSucceeded, setInitialSendSucceeded] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const initialSendStarted = useRef(false);

  const runResend = async (isInitial: boolean) => {
    if (isInitial) {
      setLoadingInitialSend(true);
    } else {
      setLoadingResend(true);
    }
    if (!isInitial) {
      setError("");
      setMessage("");
    }

    const result = await resendVerificationEmail(props.token);
    if (result.ok) {
      setInitialSendSucceeded(true);
      setMessage(
        isInitial
          ? t(props.language, {
              es: "Te enviamos un enlace de verificación.",
              en: "We sent you a verification link.",
              pt: "Enviamos um link de verificacao."
            })
          : result.message
      );
      setError("");
    } else {
      setError(professionalSurfaceMessage("verify-resend", props.language, result.raw));
    }

    if (isInitial) {
      setLoadingInitialSend(false);
    } else {
      setLoadingResend(false);
    }
  };

  useEffect(() => {
    if (initialSendStarted.current) {
      return;
    }
    initialSendStarted.current = true;

    void (async () => {
      setLoadingInitialSend(true);
      const result = await resendVerificationEmail(props.token);
      if (result.ok) {
        setInitialSendSucceeded(true);
        setMessage(
          t(props.language, {
            es: "Te enviamos un enlace de verificación.",
            en: "We sent you a verification link.",
            pt: "Enviamos um link de verificacao."
          })
        );
        setError("");
      } else {
        setError(professionalSurfaceMessage("verify-resend", props.language, result.raw));
      }
      setLoadingInitialSend(false);
    })();
  }, [props.token, props.language]);

  const deliveryKnownUnavailable = props.emailDeliveryConfigured === false;
  const showSentLead =
    !loadingInitialSend && initialSendSucceeded && !deliveryKnownUnavailable && !error;

  const leadCopy = showSentLead
    ? t(props.language, {
        es: "Te enviamos un enlace a",
        en: "We sent a link to",
        pt: "Enviamos um link para"
      })
    : t(props.language, {
        es: "Necesitamos enviarte un enlace a",
        en: "We need to send a link to",
        pt: "Precisamos enviar um link para"
      });

  const busy = loadingInitialSend || loadingResend;

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
            {loadingInitialSend
              ? t(props.language, {
                  es: "Enviando enlace de verificación…",
                  en: "Sending verification link…",
                  pt: "Enviando link de verificacao…"
                })
              : t(props.language, {
                  es: "Revisa tu correo para continuar",
                  en: "Check your email to continue",
                  pt: "Verifique seu e-mail para continuar"
                })}
          </h1>
          <p className="pro-verify-email-lead">
            {leadCopy}{" "}
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
            <button
              className="pro-primary"
              type="button"
              onClick={() => void runResend(false)}
              disabled={busy}
            >
              {loadingResend
                ? t(props.language, { es: "Enviando...", en: "Sending...", pt: "Enviando..." })
                : t(props.language, { es: "Reenviar email", en: "Resend email", pt: "Reenviar e-mail" })}
            </button>

            <button
              type="button"
              className="pro-verify-email-secondary"
              onClick={props.onLogout}
              disabled={busy}
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
