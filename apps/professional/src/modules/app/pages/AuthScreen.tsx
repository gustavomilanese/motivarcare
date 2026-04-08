import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  textByLanguage
} from "@therapy/i18n-config";
import { detectBrowserTimezone } from "@therapy/auth";
import {
  professionalAuthSurfaceMessage,
  professionalAuthValidationMessage
} from "../lib/friendlyProfessionalSurfaceMessages";
import { apiRequest } from "../services/api";
import type { AuthResponse, AuthUser } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function AuthScreen(props: {
  language: AppLanguage;
  currency: SupportedCurrency;
  onLanguageChange: (language: AppLanguage) => void;
  onCurrencyChange: (currency: SupportedCurrency) => void;
  onAuthSuccess: (params: { token: string; user: AuthUser; emailVerificationRequired: boolean }) => void;
  initialMode?: "login" | "register";
  initialEmail?: string;
  initialPassword?: string;
  initialFullName?: string;
  onBack?: () => void;
}) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">(() =>
    props.initialMode === "register" ? "register" : "login"
  );

  useEffect(() => {
    setMode(props.initialMode === "register" ? "register" : "login");
  }, [props.initialMode]);
  const [fullName, setFullName] = useState(() => props.initialFullName?.trim() ?? "");
  const [email, setEmail] = useState(() => props.initialEmail ?? "emma.collins@motivarte.com");
  const [password, setPassword] = useState(() => props.initialPassword ?? "SecurePass123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        email: response.user.email,
        emailVerified: response.user.emailVerified,
        role: "PROFESSIONAL",
        professionalProfileId: response.user.professionalProfileId,
        avatarUrl: response.user.avatarUrl ?? null
      },
      emailVerificationRequired: response.emailVerificationRequired
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
            timezone: detectBrowserTimezone()
          })
        });
        completeAuth(response);
        return;
      }

      const response = await apiRequest<AuthResponse>("/api/auth/login", undefined, {
        method: "POST",
        body: JSON.stringify({
          email: trimmedEmail,
          password
        })
      });
      completeAuth(response);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(professionalAuthSurfaceMessage(raw || " ", props.language));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pro-auth-shell">
      <section className="pro-auth-card">
        <div className="pro-auth-brand">
          <img
            className="pro-auth-wordmark"
            src="/brand/motivarcare-wordmark.png"
            alt="MotivarCare"
            width={200}
            height={40}
          />
        </div>
        <div className="pro-auth-head">
          <span className="pro-chip">{t(props.language, { es: "Acceso profesional", en: "Professional access", pt: "Acesso profissional" })}</span>
          {props.onBack ? (
            <button className="pro-auth-back" type="button" onClick={props.onBack}>
              {t(props.language, { es: "Volver", en: "Back", pt: "Voltar" })}
            </button>
          ) : null}
        </div>
        <h1>
          {mode === "register"
            ? t(props.language, {
                es: "Crea tu cuenta profesional",
                en: "Create your professional account",
                pt: "Crie sua conta profissional"
              })
            : t(props.language, {
                es: "Accede a tu cuenta profesional",
                en: "Access your professional account",
                pt: "Acesse sua conta profissional"
              })}
        </h1>
        <p className="pro-auth-lead">
          {mode === "register"
            ? t(props.language, {
                es: "Confirmá tus datos para registrar la cuenta. Luego seguís con la verificación de email y tu agenda.",
                en: "Confirm your details to register. Then continue with email verification and your schedule.",
                pt: "Confirme seus dados para registrar. Depois siga com a verificacao de e-mail e sua agenda."
              })
            : t(props.language, {
                es: "Pacientes, agenda, disponibilidad e ingresos en un solo lugar.",
                en: "Patients, schedule, availability, and earnings in one place.",
                pt: "Pacientes, agenda, disponibilidade e receitas em um so lugar."
              })}
        </p>

        <div className="pro-auth-divider" aria-hidden="true">
          <span />
          <span>{t(props.language, { es: "Continuar con email", en: "Continue with email", pt: "Continuar com email" })}</span>
          <span />
        </div>

        <form className="pro-stack pro-auth-simple-form" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <label>
              {t(props.language, { es: "Nombre completo", en: "Full name", pt: "Nome completo" })}
              <input
                type="text"
                name="name"
                value={fullName}
                autoComplete="name"
                onChange={(event) => setFullName(event.target.value)}
              />
            </label>
          ) : null}

          <label>
            {t(props.language, { es: "Usuario (email)", en: "User (email)", pt: "Usuario (e-mail)" })}
            <input type="email" name="email" value={email} autoComplete="email" inputMode="email" onChange={(event) => setEmail(event.target.value)} />
          </label>

          <label>
            {t(props.language, { es: "Contraseña", en: "Password", pt: "Senha" })}
            <input
              type="password"
              name="password"
              value={password}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? (
            <p className="pro-error pro-auth-error-banner" role="alert">
              {error}
            </p>
          ) : null}

          <button className="pro-primary" type="submit" disabled={loading}>
            {loading
              ? mode === "register"
                ? t(props.language, { es: "Creando cuenta...", en: "Creating account...", pt: "Criando conta..." })
                : t(props.language, { es: "Accediendo...", en: "Accessing...", pt: "Acessando..." })
              : mode === "register"
                ? t(props.language, { es: "Crear cuenta", en: "Create account", pt: "Criar conta" })
                : t(props.language, { es: "Acceder", en: "Access", pt: "Acessar" })}
          </button>

          {mode === "login" ? (
            <button className="pro-auth-forgot" type="button" onClick={() => navigate("/forgot-password")}>
              {t(props.language, {
                es: "Olvidé mi contraseña",
                en: "Forgot password",
                pt: "Esqueci minha senha"
              })}
            </button>
          ) : null}
        </form>
      </section>
    </div>
  );
}
