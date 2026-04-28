import { useEffect, useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import {
  finalizeWebOnboardingAfterEmailLink,
  persistProfessionalSessionFromVerifyEmailApi,
  readContinueWebOnboardingAfterEmailVerify,
  readPendingWebOnboardingAuth,
  type VerifyEmailApiResponse
} from "../../onboarding/webOnboardingResumeStorage.js";
import { professionalSurfaceMessage } from "../lib/friendlyProfessionalSurfaceMessages";
import { apiRequest } from "../services/api";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Strict Mode (dev) runs the effect twice; el primer GET ya consume el token un solo uso. */
function emailVerifySuccessStorageKey(token: string): string {
  return `motivarcare:email-verified:${token}`;
}

const verifyEmailRequestByToken = new Map<string, Promise<VerifyEmailApiResponse>>();

function redirectAfterProfessionalVerifyEmail(): void {
  const origin = window.location.origin.replace(/\/+$/, "");
  const resume = readContinueWebOnboardingAfterEmailVerify();
  window.location.replace(resume ? `${origin}/?resumeWebOnboarding=1` : `${origin}/`);
}

export function VerifyEmailTokenScreen(props: { language: AppLanguage }) {
  const [state, setState] = useState<"loading" | "error">("loading");
  const [message, setMessage] = useState("");

  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token")?.trim() ?? "";
  }, []);

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage(professionalSurfaceMessage("verify-token-missing", props.language));
      return;
    }

    const storageKey = emailVerifySuccessStorageKey(token);
    if (sessionStorage.getItem(storageKey) === "1") {
      redirectAfterProfessionalVerifyEmail();
      return;
    }

    let cancelled = false;

    const verifyEmail = async () => {
      try {
        let request = verifyEmailRequestByToken.get(token);
        if (!request) {
          const pending = apiRequest<VerifyEmailApiResponse>(
            `/api/auth/verify-email?token=${encodeURIComponent(token)}`
          );
          request = pending.finally(() => {
            verifyEmailRequestByToken.delete(token);
          });
          verifyEmailRequestByToken.set(token, request);
        }
        const data = await request;

        const pendingAuth = readPendingWebOnboardingAuth();
        let finalized = false;
        if (pendingAuth && data.token && data.user?.role === "PROFESSIONAL") {
          const uidMatch = Boolean(
            pendingAuth.user.id === data.user.id || (data.userId ? pendingAuth.user.id === data.userId : false)
          );
          const emailMatch = Boolean(
            data.user.email
            && pendingAuth.user.email.toLowerCase() === String(data.user.email).trim().toLowerCase()
          );
          if (uidMatch || emailMatch) {
            finalizeWebOnboardingAfterEmailLink({
              ...pendingAuth,
              token: data.token,
              emailVerificationRequired: data.emailVerificationRequired,
              user: {
                ...pendingAuth.user,
                id: data.user.id,
                email: data.user.email,
                fullName: data.user.fullName,
                emailVerified: true,
                avatarUrl: data.user.avatarUrl ?? pendingAuth.user.avatarUrl ?? null,
                professionalProfileId: data.user.professionalProfileId ?? pendingAuth.user.professionalProfileId
              }
            });
            finalized = true;
          }
        }

        if (!finalized) {
          persistProfessionalSessionFromVerifyEmailApi(data);
        }

        sessionStorage.setItem(storageKey, "1");
        if (!cancelled) {
          redirectAfterProfessionalVerifyEmail();
        }
      } catch (requestError) {
        if (cancelled) {
          return;
        }
        setState("error");
        const raw = requestError instanceof Error ? requestError.message : "";
        setMessage(professionalSurfaceMessage("verify-token-fail", props.language, raw));
      }
    };

    void verifyEmail();

    return () => {
      cancelled = true;
    };
  }, [props.language, token]);

  return (
    <div className="pro-auth-shell">
      <section
        className="pro-auth-card pro-auth-card-verify-email"
        aria-busy={state === "loading"}
        aria-live="polite"
        aria-labelledby="pro-verify-token-title"
      >
        <div className="pro-verify-email-panel">
          {state === "loading" ? (
            <>
              <div className="pro-verify-email-icon pro-verify-email-icon--loading" aria-hidden="true">
                <svg className="pro-verify-email-spinner-svg" viewBox="0 0 48 48" width="52" height="52" fill="none">
                  <circle cx="24" cy="24" r="20" stroke="#c4b5fd" strokeWidth="3" />
                  <path
                    d="M24 12a12 12 0 0 1 12 12"
                    stroke="#5f44eb"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span className="pro-chip">
                {t(props.language, { es: "Verificación", en: "Verification", pt: "Verificacao" })}
              </span>
              <h1 id="pro-verify-token-title">
                {t(props.language, { es: "Verificando tu email…", en: "Verifying your email…", pt: "Verificando seu e-mail…" })}
              </h1>
              <p className="pro-verify-email-hint">
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
              <div className="pro-verify-email-icon pro-verify-email-icon--error" aria-hidden="true">
                <svg viewBox="0 0 48 48" width="52" height="52" fill="none">
                  <circle cx="24" cy="24" r="22" fill="rgba(220, 38, 38, 0.1)" />
                  <path d="M18 18 30 30M30 18 18 30" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="pro-chip pro-chip--error">
                {t(props.language, { es: "Error", en: "Error", pt: "Erro" })}
              </span>
              <h1 id="pro-verify-token-title">
                {t(props.language, {
                  es: "No pudimos verificar tu email",
                  en: "We could not verify your email",
                  pt: "Nao conseguimos verificar seu e-mail"
                })}
              </h1>
              <p className="pro-verify-email-lead pro-error pro-verify-email-feedback">{message}</p>
              <p className="pro-verify-email-hint">
                {t(props.language, {
                  es: "Pedí un nuevo enlace desde la pantalla de verificación o registrate de nuevo.",
                  en: "Request a new link from the verification screen or sign up again.",
                  pt: "Solicite um novo link na tela de verificacao ou cadastre-se novamente."
                })}
              </p>
              <div className="pro-stack pro-verify-email-actions">
                <button className="pro-primary" type="button" onClick={() => window.location.assign("/")}>
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
