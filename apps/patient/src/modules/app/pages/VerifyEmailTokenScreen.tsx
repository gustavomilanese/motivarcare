import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { friendlyVerifyEmailTokenFailedMessage, friendlyVerifyEmailTokenMissingMessage } from "../lib/friendlyPatientMessages";
import { apiRequest } from "../services/api";

type VerificationState = "loading" | "success" | "error";

function preIntakeIntroCopy(language: AppLanguage): {
  title: string;
  body: readonly [string, string];
  cta: string;
} {
  return {
    title: textByLanguage(language, {
      es: "Antes de las preguntas",
      en: "Before the questions",
      pt: "Antes das perguntas"
    }),
    body: [
      textByLanguage(language, {
        es: "A continuación te haremos unas breves preguntas para orientarte hacia el profesional más adecuado para tu necesidad particular.",
        en: "Next, we’ll ask you a few short questions to guide you toward the professional best suited to your particular needs.",
        pt: "Em seguida, faremos algumas perguntas breves para orientar você ao profissional mais adequado à sua necessidade."
      }),
      textByLanguage(language, {
        es: "Toda la información que nos brindes es confidencial y solo se utilizará para alimentar nuestro motor de búsqueda especialmente diseñado para lograr el mejor matcheo entre profesionales y pacientes.",
        en: "Everything you share is confidential and is only used to power our search engine, designed to achieve the best possible match between professionals and patients.",
        pt: "Todas as informações que você compartilhar são confidenciais e serão usadas apenas para alimentar nosso motor de busca, pensado para o melhor match entre profissionais e pacientes."
      })
    ] as const,
    cta: textByLanguage(language, {
      es: "Continuar",
      en: "Continue",
      pt: "Continuar"
    })
  };
}

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Strict Mode (dev) runs the effect twice; the first /verify-email call already consumes the one-time token. */
function emailVerifySuccessStorageKey(token: string): string {
  return `motivarcare:email-verified:${token}`;
}

const verifyEmailRequestByToken = new Map<string, Promise<unknown>>();

export function VerifyEmailTokenScreen(props: {
  language: AppLanguage;
  /** Misma pestaña con sesión: evita que, al salir de /verify-email, el guard te mande otra vez a «confirmar correo». */
  onSessionEmailVerified?: () => void;
}) {
  const navigate = useNavigate();
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
      props.onSessionEmailVerified?.();
      setState("success");
      return;
    }

    let cancelled = false;

    const verifyEmail = async () => {
      try {
        let request = verifyEmailRequestByToken.get(token);
        if (!request) {
          const pending = apiRequest<{ message: string }>(
            `/api/auth/verify-email?token=${encodeURIComponent(token)}`
          );
          request = pending.finally(() => {
            verifyEmailRequestByToken.delete(token);
          });
          verifyEmailRequestByToken.set(token, request);
        }
        await request;
        sessionStorage.setItem(storageKey, "1");
        if (!cancelled) {
          props.onSessionEmailVerified?.();
          setState("success");
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
  }, [props.language, props.onSessionEmailVerified, token]);

  const intro = preIntakeIntroCopy(props.language);

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
                  es: "Tu correo quedó confirmado. En el siguiente paso te contamos cómo seguimos y arrancamos el cuestionario.",
                  en: "Your email is confirmed. Next, we’ll explain how we’ll proceed and start the questionnaire.",
                  pt: "Seu e-mail foi confirmado. No proximo passo explicamos como seguimos e iniciamos o questionario."
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

      {state === "success" ? (
        <div className="pre-intake-intro-backdrop" role="presentation">
          <div
            className="pre-intake-intro-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pre-intake-intro-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pre-intake-intro-modal-inner">
              <div className="pre-intake-intro-accent" aria-hidden="true" />
              <p className="pre-intake-intro-eyebrow">
                {t(props.language, { es: "MotivarCare", en: "MotivarCare", pt: "MotivarCare" })}
              </p>
              <h2 id="pre-intake-intro-title" className="pre-intake-intro-title">
                {intro.title}
              </h2>
              <div className="pre-intake-intro-body-stack">
                {intro.body.map((paragraph, index) => (
                  <p key={index} className="pre-intake-intro-body">
                    {paragraph}
                  </p>
                ))}
              </div>
              <div className="pre-intake-intro-actions">
                <button
                  type="button"
                  className="primary"
                  onClick={() => navigate("/", { replace: true })}
                >
                  {intro.cta}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
