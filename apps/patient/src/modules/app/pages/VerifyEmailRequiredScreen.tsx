import { useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { McButton, McNotice } from "@therapy/ui";
import { AuthBrand } from "../../auth/AuthBrand";
import { VerifyEmailMark } from "../../auth/VerifyEmailMark";
import { friendlyVerifyEmailResendMessage } from "../lib/friendlyPatientMessages";
import { apiRequest } from "../services/api";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Vite DEV o portal en esta máquina. En producción (otro host) no aparece. */
function showTestingSkip(): boolean {
  if (import.meta.env.DEV) {
    return true;
  }
  if (typeof window === "undefined") {
    return false;
  }
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
}

export function VerifyEmailRequiredScreen(props: {
  language: AppLanguage;
  token: string;
  email?: string | null;
  /** Cierra sesión en el portal (limpia token y estado local). */
  onLogout: () => void;
  /** Tras POST /email-verification/dev-verify (solo testing). */
  onVerified: () => void;
}) {
  const [loadingResend, setLoadingResend] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const busy = loadingResend || skipping;

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

  const skipForTesting = async () => {
    setSkipping(true);
    setError("");
    setMessage("");
    try {
      await apiRequest("/api/auth/email-verification/dev-verify", { method: "POST" }, props.token);
      props.onVerified();
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(
        raw
          ? friendlyVerifyEmailResendMessage(raw, props.language)
          : t(props.language, {
              es: "No pudimos saltear la verificación. El API tiene que estar en development.",
              en: "We couldn't skip verification. The API must be running in development.",
              pt: "Nao foi possivel pular a verificacao. A API precisa estar em development."
            })
      );
    } finally {
      setSkipping(false);
    }
  };

  const titleMark = t(props.language, {
    es: "correo",
    en: "email",
    pt: "e-mail"
  });

  return (
    <div className="auth-shell">
      <section className="auth-card auth-card-verify-email" aria-labelledby="verify-email-title">
        <div className="verify-email-panel">
          <AuthBrand />
          <VerifyEmailMark />
          <span className="chip">
            {t(props.language, {
              es: "Verificación requerida",
              en: "Verification required",
              pt: "Verificacao obrigatoria"
            })}
          </span>
          <header className="auth-header-copy">
            <h1 id="verify-email-title">
              {t(props.language, {
                es: "Revisa tu",
                en: "Check your",
                pt: "Confira seu"
              })}{" "}
              <em className="auth-mark">
                {titleMark}
                <svg className="auth-wave" viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M3 12 C 30 3, 50 3, 70 10 S 110 18, 130 10 S 170 3, 197 9" />
                </svg>
              </em>{" "}
              {t(props.language, {
                es: "para continuar",
                en: "to continue",
                pt: "para continuar"
              })}
            </h1>
            <p className="auth-lead">
              {props.email
                ? t(props.language, {
                    es: `Abrí el mensaje que enviamos a ${props.email} y seguí las instrucciones.`,
                    en: `Open the message we sent to ${props.email} and follow the instructions.`,
                    pt: `Abra a mensagem que enviamos para ${props.email} e siga as instrucoes.`
                  })
                : t(props.language, {
                    es: "Abrí tu correo y seguí las instrucciones.",
                    en: "Open your email and follow the instructions.",
                    pt: "Abra seu e-mail e siga as instrucoes."
                  })}
            </p>
            <p className="auth-lead">
              {t(props.language, {
                es: "Chequeá SPAM si no lo ves. El enlace puede caducar.",
                en: "Check spam if you don’t see it. The link may expire.",
                pt: "Verifique o spam se nao achar. O link pode expirar."
              })}
            </p>
          </header>

          <div className="verify-email-actions">
            <McButton type="button" disabled={busy} onClick={() => void handleResend()}>
              {loadingResend
                ? t(props.language, { es: "Enviando…", en: "Sending…", pt: "Enviando…" })
                : t(props.language, { es: "Reenviar correo", en: "Resend email", pt: "Reenviar e-mail" })}
            </McButton>

            {showTestingSkip() ? (
              <div className="verify-email-testing">
                <span className="verify-email-testing-label">
                  {t(props.language, { es: "Solo testing", en: "Testing only", pt: "So testing" })}
                </span>
                <button
                  type="button"
                  className="verify-email-testing-link"
                  onClick={() => void skipForTesting()}
                  disabled={busy}
                >
                  {skipping
                    ? t(props.language, { es: "Salteando…", en: "Skipping…", pt: "Pulando…" })
                    : t(props.language, {
                        es: "Saltear verificación",
                        en: "Skip verification",
                        pt: "Pular verificacao"
                      })}
                </button>
              </div>
            ) : null}
          </div>

          {message ? <McNotice tone="success">{message}</McNotice> : null}
          {error ? <McNotice>{error}</McNotice> : null}

          <footer className="verify-email-card-footer">
            <p className="verify-email-footer-label">
              {t(props.language, {
                es: "¿No es tu cuenta o querés usar otro correo?",
                en: "Not your account, or need a different email?",
                pt: "Nao e sua conta ou precisa de outro e-mail?"
              })}
            </p>
            <button type="button" className="verify-email-logout-link" onClick={props.onLogout} disabled={busy}>
              {t(props.language, { es: "Cerrar sesión", en: "Log out", pt: "Sair" })}
            </button>
          </footer>
        </div>
      </section>
    </div>
  );
}
