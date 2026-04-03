import { FormEvent, SyntheticEvent, useState } from "react";
import {
  type AppLanguage,
  type LocalizedText,
  textByLanguage
} from "@therapy/i18n-config";
import { detectBrowserTimezone } from "@therapy/auth";
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
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isTestUser, setIsTestUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.includes("@") || password.length < 8) {
      setError(
        t(props.language, {
          es: "Usa un email valido y una contrasena de al menos 8 caracteres.",
          en: "Use a valid email and a password with at least 8 characters.",
          pt: "Use um email valido e uma senha com pelo menos 8 caracteres."
        })
      );
      return;
    }

    if (mode === "register" && fullName.trim().length < 2) {
      setError(
        t(props.language, {
          es: "Completa tu nombre y apellido.",
          en: "Please complete your full name.",
          pt: "Preencha seu nome completo."
        })
      );
      return;
    }

    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload =
        mode === "register"
          ? {
              fullName: fullName.trim(),
              email: email.trim().toLowerCase(),
              password,
              role: "PATIENT",
              timezone: detectBrowserTimezone(),
              isTestUser
            }
          : {
              email: email.trim().toLowerCase(),
              password
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

      props.onLogin({
        user: {
          id: response.user.id,
          fullName: response.user.fullName,
          email: response.user.email,
          emailVerified: response.user.emailVerified
        },
        token: response.token,
        emailVerificationRequired: response.emailVerificationRequired,
        authEntryMode: mode
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo autenticar contra la API. Revisa que el backend este encendido.",
              en: "Could not authenticate against the API. Check that the backend is running.",
              pt: "Nao foi possivel autenticar na API. Verifique se o backend esta ativo."
            })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="auth-media">
          <div className="visual-hero">
            <img
              src={props.heroImage}
              alt={t(props.language, {
                es: "Paciente en una sesion online",
                en: "Patient in an online session",
                pt: "Paciente em uma sessao online"
              })}
              onError={props.onHeroFallback}
            />
          </div>
        </div>
        <div className="auth-form-panel">
          <div className="auth-header-copy">
            <p className="auth-eyebrow">MotivarCare</p>
            <h1>{t(props.language, { es: "Tu sesion online empieza aca", en: "Your online session starts here", pt: "Sua sessao online comeca aqui" })}</h1>
            <p className="auth-lead">
              {t(props.language, {
                es: "Accede con tu cuenta. Luego podras completar tu perfil, y si queres, conectar Google Calendar para recordatorios.",
                en: "Sign in to your account. Then you can complete your profile and optionally connect Google Calendar for reminders.",
                pt: "Acesse sua conta. Depois voce completa seu perfil e, se quiser, conecta o Google Calendar para lembretes."
              })}
            </p>
          </div>

          <div className="auth-divider" aria-hidden="true">
            <span />
            <span className="auth-divider-label">
              {t(props.language, { es: "Continuar con email", en: "Continue with email", pt: "Continuar com email" })}
            </span>
            <span />
          </div>

          <form className="stack auth-form" onSubmit={handleSubmit}>
            {mode === "register" ? (
              <label>
                {t(props.language, { es: "Nombre completo", en: "Full name", pt: "Nome completo" })}
                <input
                  name="name"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </label>
            ) : null}

            <label>
              Email
              <input
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label>
              {t(props.language, { es: "Contrasena", en: "Password", pt: "Senha" })}
              <input
                type="password"
                name="password"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {mode === "register" ? (
              <label className="inline-toggle">
                <input
                  type="checkbox"
                  checked={isTestUser}
                  onChange={(event) => setIsTestUser(event.target.checked)}
                />
                {t(props.language, {
                  es: "Usuario de prueba (solo testing local)",
                  en: "Test user (local testing only)",
                  pt: "Usuario de teste (somente teste local)"
                })}
              </label>
            ) : null}

            {error ? <p className="error-text auth-error" role="alert">{error}</p> : null}
            <button className="primary auth-submit" type="submit" disabled={loading}>
              {loading
                ? t(props.language, { es: "Validando...", en: "Validating...", pt: "Validando..." })
                : mode === "register"
                  ? t(props.language, { es: "Crear cuenta", en: "Create account", pt: "Criar conta" })
                  : t(props.language, { es: "Entrar", en: "Sign in", pt: "Entrar" })}
            </button>
          </form>

          <div className="auth-switch-inline">
            {mode === "login" ? (
              <>
                <span>{t(props.language, { es: "No tienes cuenta?", en: "No account yet?", pt: "Ainda nao tem conta?" })}</span>
                <button type="button" className="auth-link-button" onClick={() => setMode("register")}>
                  {t(props.language, { es: "Registrarme", en: "Sign up", pt: "Cadastrar" })}
                </button>
              </>
            ) : (
              <>
                <span>{t(props.language, { es: "Ya tienes cuenta?", en: "Already have an account?", pt: "Ja tem conta?" })}</span>
                <button type="button" className="auth-link-button" onClick={() => setMode("login")}>
                  {t(props.language, { es: "Ingresar", en: "Sign in", pt: "Entrar" })}
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
