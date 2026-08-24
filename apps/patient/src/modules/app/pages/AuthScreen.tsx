import { FormEvent, SyntheticEvent, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const PATIENT_AUTH_REMEMBER_KEY = "motivarcare_patient_auth_remember";
const PATIENT_AUTH_EMAIL_KEY = "motivarcare_patient_auth_email";

function readRememberedPatientEmail(): string {
  try {
    if (typeof window === "undefined" || window.localStorage.getItem(PATIENT_AUTH_REMEMBER_KEY) !== "1") {
      return "";
    }
    return window.localStorage.getItem(PATIENT_AUTH_EMAIL_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

function readPatientRememberFlag(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(PATIENT_AUTH_REMEMBER_KEY) === "1";
  } catch {
    return false;
  }
}

function persistPatientRemember(remember: boolean, emailLower: string): void {
  try {
    if (remember && emailLower) {
      window.localStorage.setItem(PATIENT_AUTH_REMEMBER_KEY, "1");
      window.localStorage.setItem(PATIENT_AUTH_EMAIL_KEY, emailLower);
    } else {
      window.localStorage.removeItem(PATIENT_AUTH_REMEMBER_KEY);
      window.localStorage.removeItem(PATIENT_AUTH_EMAIL_KEY);
    }
  } catch {
    // ignore
  }
}
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import {
  type AppLanguage,
  type LocalizedText,
  textByLanguage
} from "@therapy/i18n-config";
import { detectBrowserTimezone } from "@therapy/auth";
import {
  McButton,
  McCheckbox,
  McInput,
  McNotice,
  McPasswordInput,
  McTextButton
} from "@therapy/ui";
import { inferPatientPortalResidencyIso2 } from "@therapy/types";
import { friendlyAuthSurfaceMessage } from "../lib/friendlyPatientMessages";
import { apiRequest } from "../services/api";
import type { AuthApiResponse, SessionUser } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function AuthScreen(props: {
  language: AppLanguage;
  heroImage: string;
  onHeroFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onLogin: (params: {
    user: SessionUser;
    token: string | null;
    emailVerificationRequired: boolean;
    authEntryMode: "login" | "register";
  }) => void;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailVerifiedFromEmailLink = searchParams.get("email_verified") === "1";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(readRememberedPatientEmail);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [rememberMe, setRememberMe] = useState(readPatientRememberFlag);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const turnstileSiteKey =
    typeof import.meta.env.VITE_TURNSTILE_SITE_KEY === "string" ? import.meta.env.VITE_TURNSTILE_SITE_KEY.trim() : "";
  const requiresTurnstileWidget = turnstileSiteKey.length > 0;
  const [turnstileToken, setTurnstileToken] = useState("");

  const onTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const onTurnstileExpire = useCallback(() => {
    setTurnstileToken("");
  }, []);

  useEffect(() => {
    if (mode === "login") {
      setTurnstileToken("");
    }
  }, [mode]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.includes("@") || password.length < 8) {
      setError(
        t(props.language, {
          es: "Necesitamos un email válido y una contraseña de al menos 8 caracteres. Revisá el campo y volvé a intentar.",
          en: "We need a valid email and a password with at least 8 characters. Double-check the fields and try again.",
          pt: "Precisamos de um email valido e senha com pelo menos 8 caracteres. Confira os campos e tente de novo."
        })
      );
      return;
    }

    /** País en registro: zona horaria primero (Chrome en-US en AR no debe mandar US). */
    const sessionTimezone = detectBrowserTimezone();
    const residencyIso = inferPatientPortalResidencyIso2({
      locales: [navigator.language, ...(navigator.languages ?? [])],
      timezone: sessionTimezone
    });

    if (mode === "register") {
      const given = firstName.trim();
      const family = lastName.trim();
      if (given.length < 1 || family.length < 1) {
        setError(
          t(props.language, {
            es: "Completá tu nombre y tu apellido para crear la cuenta.",
            en: "Please enter your first and last name to create your account.",
            pt: "Preencha seu nome e sobrenome para criar a conta."
          })
        );
        return;
      }
      if (password !== passwordConfirm) {
        setError(
          t(props.language, {
            es: "Las contraseñas no coinciden. Volvé a escribirlas igual en ambos campos.",
            en: "Passwords do not match. Enter the same password in both fields.",
            pt: "As senhas nao coincidem. Digite a mesma senha nos dois campos."
          })
        );
        return;
      }
    }

    let resolvedTurnstileForRegister: string | undefined;
    if (mode === "register" && requiresTurnstileWidget) {
      let resolved = turnstileRef.current?.getResponse()?.trim() ?? turnstileToken.trim();
      if (!resolved && turnstileRef.current) {
        try {
          resolved = (await turnstileRef.current.getResponsePromise(8000)).trim();
        } catch {
          resolved = "";
        }
      }
      if (!resolved) {
        setError(
          t(props.language, {
            es: "Completá la verificación de seguridad e intentá de nuevo.",
            en: "Complete the security verification and try again.",
            pt: "Complete a verificacao de seguranca e tente de novo."
          })
        );
        return;
      }
      resolvedTurnstileForRegister = resolved;
    }

    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const registerFullName = `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, " ").trim();
      const payload =
        mode === "register"
          ? {
              fullName: registerFullName,
              email: email.trim().toLowerCase(),
              password,
              role: "PATIENT",
              timezone: sessionTimezone,
              residencyCountry: residencyIso,
              ...(resolvedTurnstileForRegister ? { turnstileToken: resolvedTurnstileForRegister } : {})
            }
          : {
              email: email.trim().toLowerCase(),
              password,
              timezone: sessionTimezone
            };

      const response = await apiRequest<AuthApiResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (response.user.role !== "PATIENT") {
        throw new Error(
          t(props.language, {
            es: "La cuenta no corresponde al portal paciente.",
            en: "This account does not belong to the patient portal.",
            pt: "Esta conta nao pertence ao portal do paciente."
          })
        );
      }

      if (mode === "login") {
        persistPatientRemember(rememberMe, email.trim().toLowerCase());
      }

      props.onLogin({
        user: {
          id: response.user.id,
          fullName: response.user.fullName,
          firstName: response.user.firstName,
          lastName: response.user.lastName,
          email: response.user.email,
          emailVerified: response.user.emailVerified,
          avatarUrl: response.user.avatarUrl ?? null
        },
        token: response.token,
        emailVerificationRequired: response.emailVerificationRequired,
        authEntryMode: mode
      });
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(
        raw
          ? friendlyAuthSurfaceMessage(raw, props.language)
          : friendlyAuthSurfaceMessage("", props.language)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="auth-hero-stack">
          <div className="auth-brand-mark auth-brand-mark--above-hero">
            <img
              className="auth-brand-lockup"
              src="/brand/motivarcare-logo-full.png"
              alt="MotivarCare"
              width={708}
              height={148}
            />
          </div>
          <div className="auth-media">
            <div className="visual-hero">
              <img
                src={props.heroImage}
                alt={t(props.language, {
                  es: "Paciente en una sesión online",
                  en: "Patient in an online session",
                  pt: "Paciente em uma sessao online"
                })}
                onError={props.onHeroFallback}
              />
            </div>
          </div>
        </div>
        <div className="auth-form-panel">
          <div className="auth-header-copy">
            <div className="auth-brand-mark auth-brand-mark--in-form">
              <img
                className="auth-brand-lockup"
                src="/brand/motivarcare-logo-full.png"
                alt="MotivarCare"
                width={708}
                height={148}
              />
            </div>
            <h1>{t(props.language, { es: "Tu sesión online empieza acá", en: "Your online session starts here", pt: "Sua sessao online comeca aqui" })}</h1>
          </div>

          {emailVerifiedFromEmailLink ? (
            <div className="auth-email-verified-banner" role="status">
              <strong>
                {t(props.language, {
                  es: "Tu correo ya está verificado.",
                  en: "Your email is verified.",
                  pt: "Seu e-mail foi verificado."
                })}
              </strong>
              {" "}
              {t(props.language, {
                es: "Iniciá sesión con la misma cuenta para entrar al portal.",
                en: "Sign in with the same account to enter the portal.",
                pt: "Entre com a mesma conta para acessar o portal."
              })}
            </div>
          ) : null}

          <div className="auth-divider" aria-hidden="true">
            <span />
            <span className="auth-divider-label">
              {t(props.language, { es: "Continuar con email", en: "Continue with email", pt: "Continuar com email" })}
            </span>
            <span />
          </div>

          <form className="stack auth-form" onSubmit={handleSubmit}>
            {mode === "register" ? (
              <div className="auth-field-row-2">
                <McInput
                  label={t(props.language, { es: "Nombre", en: "First name", pt: "Nome" })}
                  name="given-name"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                />
                <McInput
                  label={t(props.language, { es: "Apellido", en: "Last name", pt: "Sobrenome" })}
                  name="family-name"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                />
              </div>
            ) : null}

            <McInput
              label={t(props.language, { es: "Correo electrónico", en: "Email", pt: "E-mail" })}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <McPasswordInput
              label={t(props.language, { es: "Contraseña", en: "Password", pt: "Senha" })}
              name="password"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              showLabel={t(props.language, { es: "Mostrar", en: "Show", pt: "Mostrar" })}
              hideLabel={t(props.language, { es: "Ocultar", en: "Hide", pt: "Ocultar" })}
              headerExtra={
                mode === "login" ? (
                  <McTextButton onClick={() => navigate("/forgot-password")}>
                    {t(props.language, {
                      es: "¿Olvidaste tu contraseña?",
                      en: "Forgot your password?",
                      pt: "Esqueceu sua senha?"
                    })}
                  </McTextButton>
                ) : null
              }
            />

            {mode === "register" ? (
              <McPasswordInput
                label={t(props.language, {
                  es: "Repetir contraseña",
                  en: "Confirm password",
                  pt: "Confirmar senha"
                })}
                name="password-confirm"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                aria-invalid={passwordConfirm.length > 0 && password !== passwordConfirm}
                showLabel={t(props.language, { es: "Mostrar", en: "Show", pt: "Mostrar" })}
                hideLabel={t(props.language, { es: "Ocultar", en: "Hide", pt: "Ocultar" })}
              />
            ) : null}

            {mode === "register" && requiresTurnstileWidget ? (
              <div className="auth-turnstile-wrap">
                <span className="auth-field-label">
                  {t(props.language, {
                    es: "Verificación de seguridad",
                    en: "Security verification",
                    pt: "Verificacao de seguranca"
                  })}
                </span>
                <Turnstile
                  ref={turnstileRef}
                  siteKey={turnstileSiteKey}
                  onSuccess={onTurnstileSuccess}
                  onExpire={onTurnstileExpire}
                  options={{
                    appearance: "always",
                    theme: "light",
                    language:
                      props.language === "es" ? "es" : props.language === "pt" ? "pt-BR" : "en",
                    size: "flexible",
                    retry: "auto",
                    refreshExpired: "auto"
                  }}
                />
              </div>
            ) : null}

            {mode === "login" ? (
              <McCheckbox checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)}>
                {t(props.language, {
                  es: "Recordarme en este dispositivo",
                  en: "Remember me on this device",
                  pt: "Lembrar neste dispositivo"
                })}
              </McCheckbox>
            ) : null}

            {error ? <McNotice>{error}</McNotice> : null}
            <McButton type="submit" disabled={loading}>
              {loading
                ? t(props.language, { es: "Validando...", en: "Validating...", pt: "Validando..." })
                : mode === "register"
                  ? t(props.language, { es: "Crear cuenta", en: "Create account", pt: "Criar conta" })
                  : t(props.language, { es: "Entrar", en: "Sign in", pt: "Entrar" })}
            </McButton>
          </form>

          <footer className="auth-card-footer">
            {mode === "login" ? (
              <p className="auth-card-footer-copy">
                {t(props.language, {
                  es: "¿Es tu primera vez en MotivarCare?",
                  en: "Is this your first time on MotivarCare?",
                  pt: "E sua primeira vez no MotivarCare?"
                })}{" "}
                <button
                  type="button"
                  className="auth-footer-cta"
                  onClick={() => {
                    setError("");
                    setPasswordConfirm("");
                    setMode("register");
                  }}
                >
                  {t(props.language, { es: "Crear una cuenta", en: "Create an account", pt: "Criar uma conta" })}
                </button>
              </p>
            ) : (
              <p className="auth-card-footer-copy auth-card-footer-copy--muted">
                {t(props.language, {
                  es: "¿Ya tenés cuenta?",
                  en: "Already have an account?",
                  pt: "Ja tem conta?"
                })}{" "}
                <button
                  type="button"
                  className="auth-footer-cta"
                  onClick={() => {
                    setError("");
                    setPasswordConfirm("");
                    setMode("login");
                  }}
                >
                  {t(props.language, { es: "Iniciar sesión", en: "Sign in", pt: "Entrar" })}
                </button>
              </p>
            )}
          </footer>
        </div>
      </section>
    </div>
  );
}
