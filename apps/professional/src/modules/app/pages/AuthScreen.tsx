import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { FormEvent, SyntheticEvent, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { detectBrowserTimezone } from "@therapy/auth";
import {
  professionalAuthSurfaceMessage,
  professionalAuthValidationMessage
} from "../lib/friendlyProfessionalSurfaceMessages";
import { resendVerificationEmail } from "../lib/ensureVerificationEmailSent";
import { apiRequest } from "../services/api";
import type { AuthResponse, AuthUser } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const PRO_AUTH_REMEMBER_KEY = "motivarcare_pro_auth_remember";
const PRO_AUTH_EMAIL_KEY = "motivarcare_pro_auth_email";

function readRememberedProEmail(): string {
  try {
    if (typeof window === "undefined" || window.localStorage.getItem(PRO_AUTH_REMEMBER_KEY) !== "1") {
      return "";
    }
    return window.localStorage.getItem(PRO_AUTH_EMAIL_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

function readProRememberFlag(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(PRO_AUTH_REMEMBER_KEY) === "1";
  } catch {
    return false;
  }
}

function useProAuthMobileCompact(): boolean {
  const [compact, setCompact] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 900px)").matches : false
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const onChange = () => setCompact(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return compact;
}

function persistProRemember(remember: boolean, emailLower: string): void {
  try {
    if (remember && emailLower) {
      window.localStorage.setItem(PRO_AUTH_REMEMBER_KEY, "1");
      window.localStorage.setItem(PRO_AUTH_EMAIL_KEY, emailLower);
    } else {
      window.localStorage.removeItem(PRO_AUTH_REMEMBER_KEY);
      window.localStorage.removeItem(PRO_AUTH_EMAIL_KEY);
    }
  } catch {
    // ignore
  }
}

export function AuthScreen(props: {
  language: AppLanguage;
  onAuthSuccess: (params: {
    token: string;
    user: AuthUser;
    emailVerificationRequired: boolean;
    emailDeliveryConfigured?: boolean;
    googleCalendarConnected?: boolean;
  }) => void;
  initialMode?: "login" | "register";
  initialEmail?: string;
  initialPassword?: string;
  initialFullName?: string;
  onBack?: () => void;
  heroImage: string;
  onHeroFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  /** Desde login: flujo de alta (intro móvil / web). */
  onCreateAccount?: () => void;
}) {
  const navigate = useNavigate();
  const isMobileCompact = useProAuthMobileCompact();
  const [mode, setMode] = useState<"login" | "register">(() =>
    props.initialMode === "register" ? "register" : "login"
  );

  useEffect(() => {
    setMode(props.initialMode === "register" ? "register" : "login");
  }, [props.initialMode]);
  const [fullName, setFullName] = useState(() => props.initialFullName?.trim() ?? "");
  const [email, setEmail] = useState(() => (props.initialEmail?.trim() ? props.initialEmail : readRememberedProEmail()));
  const [password, setPassword] = useState(() => props.initialPassword ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(readProRememberFlag);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const turnstileSiteKey =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_TURNSTILE_SITE_KEY
      ? String(import.meta.env.VITE_TURNSTILE_SITE_KEY).trim()
      : "";
  const requiresTurnstileWidget = turnstileSiteKey.length > 0;
  const [turnstileToken, setTurnstileToken] = useState("");

  const onTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const onTurnstileExpire = useCallback(() => {
    setTurnstileToken("");
  }, []);

  useEffect(() => {
    setTurnstileToken("");
  }, [mode, email]);

  useEffect(() => {
    if (props.initialEmail) {
      setEmail(props.initialEmail);
    }
  }, [props.initialEmail]);

  useEffect(() => {
    if (props.initialPassword) {
      setPassword(props.initialPassword);
    }
  }, [props.initialPassword]);

  useEffect(() => {
    if (props.initialFullName?.trim()) {
      setFullName(props.initialFullName.trim());
    }
  }, [props.initialFullName]);

  const completeAuth = (response: AuthResponse) => {
    if (response.user.role !== "PROFESSIONAL" || !response.user.professionalProfileId) {
      throw new Error(professionalAuthValidationMessage("portal-mismatch", props.language));
    }

    props.onAuthSuccess({
      token: response.token,
      user: {
        id: response.user.id,
        fullName: response.user.fullName,
        firstName: response.user.firstName,
        lastName: response.user.lastName,
        email: response.user.email,
        emailVerified: response.user.emailVerified,
        role: "PROFESSIONAL",
        professionalProfileId: response.user.professionalProfileId,
        avatarUrl: response.user.avatarUrl ?? null
      },
      emailVerificationRequired: response.emailVerificationRequired,
      emailDeliveryConfigured: response.emailDeliveryConfigured,
      googleCalendarConnected:
        typeof response.googleCalendarConnected === "boolean" ? response.googleCalendarConnected : undefined
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.includes("@") || password.length < 8) {
      setError(professionalAuthValidationMessage("email", props.language));
      return;
    }

    if (mode === "register" && fullName.trim().length < 2) {
      setError(professionalAuthValidationMessage("name", props.language));
      return;
    }

    let resolvedTurnstileToken: string | undefined;
    if (requiresTurnstileWidget) {
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
      resolvedTurnstileToken = resolved;
    }

    setLoading(true);

    try {
      if (mode === "register") {
        const response = await apiRequest<AuthResponse>("/api/auth/register", undefined, {
          method: "POST",
          body: JSON.stringify({
            email: trimmedEmail,
            password,
            fullName: fullName.trim(),
            role: "PROFESSIONAL",
            timezone: detectBrowserTimezone(),
            ...(resolvedTurnstileToken ? { turnstileToken: resolvedTurnstileToken } : {})
          })
        });
        if (
          response.emailVerificationRequired
          && !response.user.emailVerified
          && !response.verificationEmailSent
        ) {
          await resendVerificationEmail(response.token);
        }
        completeAuth(response);
        return;
      }

      const response = await apiRequest<AuthResponse>("/api/auth/login", undefined, {
        method: "POST",
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          ...(resolvedTurnstileToken ? { turnstileToken: resolvedTurnstileToken } : {})
        })
      });
      persistProRemember(rememberMe, trimmedEmail);
      completeAuth(response);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(professionalAuthSurfaceMessage(raw || " ", props.language));
    } finally {
      setLoading(false);
    }
  };

  const loginTitle = isMobileCompact
    ? t(props.language, { es: "Accede a tu cuenta", en: "Sign in to your account", pt: "Acesse sua conta" })
    : t(props.language, {
        es: "Accede a tu cuenta profesional",
        en: "Access your professional account",
        pt: "Acesse sua conta profissional"
      });

  const loginLead = isMobileCompact
    ? t(props.language, {
        es: "Pacientes, agenda, disponibilidad.",
        en: "Patients, schedule, availability.",
        pt: "Pacientes, agenda, disponibilidade."
      })
    : t(props.language, {
        es: "Pacientes, agenda, disponibilidad e ingresos en un solo lugar.",
        en: "Patients, schedule, availability, and earnings in one place.",
        pt: "Pacientes, agenda, disponibilidade e receitas em um so lugar."
      });

  return (
    <div className={`pro-auth-shell${isMobileCompact ? " pro-auth-shell--compact" : ""}`}>
      <section className="auth-card pro-auth-split-card">
        {!isMobileCompact ? (
          <div className="auth-media">
            <div className="visual-hero">
              <img
                src={props.heroImage}
                alt={t(props.language, {
                  es: "Laptop frente al mar, trabajo remoto desde la costa",
                  en: "Laptop by the sea, remote work from the coast",
                  pt: "Notebook de frente para o mar, trabalho remoto na costa"
                })}
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={props.onHeroFallback}
              />
            </div>
          </div>
        ) : null}
        <div className="auth-form-panel">
          <div className="auth-header-copy">
            <div className="auth-brand-mark">
              <img
                className="auth-brand-lockup"
                src="/brand/motivarcare-logo-full.png"
                alt="MotivarCare"
                width={708}
                height={148}
              />
            </div>
            {!isMobileCompact ? (
              <div className="pro-auth-head pro-auth-head--in-panel">
                <span className="pro-chip">{t(props.language, { es: "Acceso profesional", en: "Professional access", pt: "Acesso profissional" })}</span>
                {props.onBack ? (
                  <button className="pro-auth-back" type="button" onClick={props.onBack}>
                    {t(props.language, { es: "Volver", en: "Back", pt: "Voltar" })}
                  </button>
                ) : null}
              </div>
            ) : null}
            <h1>
              {mode === "register"
                ? t(props.language, {
                    es: "Crea tu cuenta profesional",
                    en: "Create your professional account",
                    pt: "Crie sua conta profissional"
                  })
                : loginTitle}
            </h1>
            <p className="auth-lead">
              {mode === "register"
                ? t(props.language, {
                    es: "Confirmá tus datos para registrar la cuenta. Luego seguís con la verificación de email y tu agenda.",
                    en: "Confirm your details to register. Then continue with email verification and your schedule.",
                    pt: "Confirme seus dados para registrar. Depois siga com a verificacao de e-mail e sua agenda."
                  })
                : loginLead}
            </p>
          </div>

          {!isMobileCompact ? (
            <div className="auth-divider" aria-hidden="true">
              <span />
              <span className="auth-divider-label">
                {t(props.language, { es: "Continuar con email", en: "Continue with email", pt: "Continuar com email" })}
              </span>
              <span />
            </div>
          ) : null}

          <form className="auth-form pro-auth-simple-form" onSubmit={handleSubmit}>
            {mode === "register" ? (
              <div className="auth-field-stack">
                <span className="auth-field-label">{t(props.language, { es: "Nombre completo", en: "Full name", pt: "Nome completo" })}</span>
                <div className="auth-input-shell">
                  <input
                    className="auth-input-inset"
                    type="text"
                    name="name"
                    value={fullName}
                    autoComplete="name"
                    onChange={(event) => setFullName(event.target.value)}
                  />
                </div>
              </div>
            ) : null}

            <div className="auth-field-stack">
              <span className="auth-field-label">{t(props.language, { es: "Correo electrónico", en: "Email", pt: "E-mail" })}</span>
              <div className="auth-input-shell">
                <input
                  className="auth-input-inset"
                  type="email"
                  name="email"
                  value={email}
                  autoComplete="email"
                  inputMode="email"
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setTurnstileToken("");
                  }}
                />
              </div>
            </div>

            <div className="auth-field-stack">
              <div className="auth-field-label-row">
                <span className="auth-field-label">{t(props.language, { es: "Contraseña", en: "Password", pt: "Senha" })}</span>
                {mode === "login" ? (
                  <button type="button" className="auth-link-inline" onClick={() => navigate("/forgot-password")}>
                    {t(props.language, {
                      es: "¿Olvidaste tu contraseña?",
                      en: "Forgot your password?",
                      pt: "Esqueceu sua senha?"
                    })}
                  </button>
                ) : null}
              </div>
              <div className="auth-input-shell auth-input-shell--with-suffix">
                <input
                  className="auth-input-inset"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={password}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button type="button" className="auth-input-suffix" onClick={() => setShowPassword((v) => !v)}>
                  {showPassword
                    ? t(props.language, { es: "Ocultar", en: "Hide", pt: "Ocultar" })
                    : t(props.language, { es: "Mostrar", en: "Show", pt: "Mostrar" })}
                </button>
              </div>
            </div>

            {mode === "login" ? (
              <label className="auth-remember">
                <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                <span>
                  {t(props.language, {
                    es: "Recordarme en este dispositivo",
                    en: "Remember me on this device",
                    pt: "Lembrar neste dispositivo"
                  })}
                </span>
              </label>
            ) : null}

            {requiresTurnstileWidget ? (
              <div className="auth-turnstile-wrap">
                <span className="auth-field-label">
                  {t(props.language, {
                    es: "Verificación de seguridad",
                    en: "Security check",
                    pt: "Verificacao de seguranca"
                  })}
                </span>
                <Turnstile
                  ref={turnstileRef}
                  siteKey={turnstileSiteKey}
                  rerenderOnCallbackChange
                  onSuccess={onTurnstileSuccess}
                  onExpire={onTurnstileExpire}
                  options={{
                    appearance: "always",
                    theme: "light",
                    language: props.language === "es" ? "es" : props.language === "pt" ? "pt-BR" : "en",
                    size: "flexible",
                    retry: "auto",
                    refreshExpired: "auto"
                  }}
                />
              </div>
            ) : null}

            {error ? (
              <p className="pro-error pro-auth-error-banner" role="alert">
                {error}
              </p>
            ) : null}

            <button className="pro-primary auth-submit" type="submit" disabled={loading}>
              {loading
                ? mode === "register"
                  ? t(props.language, { es: "Creando cuenta...", en: "Creating account...", pt: "Criando conta..." })
                  : t(props.language, { es: "Accediendo...", en: "Accessing...", pt: "Acessando..." })
                : mode === "register"
                  ? t(props.language, { es: "Crear cuenta", en: "Create account", pt: "Criar conta" })
                  : t(props.language, { es: "Iniciar sesión", en: "Sign in", pt: "Entrar" })}
            </button>
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
                  onClick={() => (props.onCreateAccount ? props.onCreateAccount() : setMode("register"))}
                >
                  {t(props.language, {
                    es: "Crear una cuenta profesional",
                    en: "Create a professional account",
                    pt: "Criar conta profissional"
                  })}
                </button>
              </p>
            ) : (
              <p className="auth-card-footer-copy auth-card-footer-copy--muted">
                {t(props.language, {
                  es: "¿Ya tenés cuenta?",
                  en: "Already have an account?",
                  pt: "Ja tem conta?"
                })}{" "}
                <button type="button" className="auth-footer-cta" onClick={() => setMode("login")}>
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
