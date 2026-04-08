import { FormEvent, useState } from "react";
import {
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  currencyOptionLabel,
  textByLanguage
} from "@therapy/i18n-config";
import { adminAuthSurfaceMessage } from "../lib/friendlyAdminSurfaceMessages";
import { apiRequest } from "../services/api";
import type { AuthApiResponse, AuthUser } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function AuthScreen(props: {
  language: AppLanguage;
  currency: SupportedCurrency;
  onLanguageChange: (language: AppLanguage) => void;
  onCurrencyChange: (currency: SupportedCurrency) => void;
  onAuthSuccess: (token: string, user: AuthUser) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("MotivarCare Admin");
  const [email, setEmail] = useState("admin@motivarte.com");
  const [password, setPassword] = useState("SecurePass123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const path = mode === "register" ? "/api/auth/register" : "/api/auth/login";

      const payload =
        mode === "register"
          ? {
              email: email.trim().toLowerCase(),
              password,
              fullName: fullName.trim(),
              role: "ADMIN" as const
            }
          : {
              email: email.trim().toLowerCase(),
              password
            };

      const response = await apiRequest<AuthApiResponse>(path, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (response.user.role !== "ADMIN") {
        throw new Error(
          t(props.language, {
            es: "El usuario no pertenece al portal admin.",
            en: "This user does not belong to the admin portal.",
            pt: "Este usuario nao pertence ao portal admin."
          })
        );
      }

      props.onAuthSuccess(response.token, {
        id: response.user.id,
        email: response.user.email,
        fullName: response.user.fullName,
        role: "ADMIN"
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? adminAuthSurfaceMessage(requestError.message, props.language)
          : t(props.language, {
              es: "No pudimos autenticar. Reintentá o verificá que el servidor esté disponible.",
              en: "We couldn’t sign you in. Retry or check that the server is reachable.",
              pt: "Nao foi possivel autenticar. Tente de novo ou verifique o servidor."
            })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <p className="admin-auth-eyebrow">MotivarCare</p>
        <span className="chip">{t(props.language, { es: "Consola admin", en: "Admin console", pt: "Console admin" })}</span>
        <h1>{t(props.language, { es: "Gestion centralizada", en: "Centralized management", pt: "Gestao centralizada" })}</h1>
        <p className="admin-auth-lead">
          {t(props.language, {
            es: "Pacientes, profesionales, finanzas y contenido en una sola experiencia operativa.",
            en: "Patients, professionals, finances, and content in one operational experience.",
            pt: "Pacientes, profissionais, financas e conteudo em uma unica experiencia operacional."
          })}
        </p>

        <div className="admin-locale-panel">
          <label>
            {t(props.language, { es: "Idioma", en: "Language", pt: "Idioma" })}
            <select value={props.language} onChange={(event) => props.onLanguageChange(event.target.value as AppLanguage)}>
              {SUPPORTED_LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {language === "es" ? "Espanol" : language === "en" ? "English" : "Portugues"}
                </option>
              ))}
            </select>
          </label>

          <label>
            {t(props.language, { es: "Moneda", en: "Currency", pt: "Moeda" })}
            <select value={props.currency} onChange={(event) => props.onCurrencyChange(event.target.value as SupportedCurrency)}>
              {SUPPORTED_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currencyOptionLabel(currency, props.language)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="auth-mode-switch">
          <button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>
            {t(props.language, { es: "Ingresar", en: "Sign in", pt: "Entrar" })}
          </button>
          <button className={mode === "register" ? "active" : ""} type="button" onClick={() => setMode("register")}>
            {t(props.language, { es: "Crear admin", en: "Create admin", pt: "Criar admin" })}
          </button>
        </div>

        <div className="admin-auth-divider" aria-hidden="true">
          <span />
          <span>{t(props.language, { es: "Credenciales", en: "Credentials", pt: "Credenciais" })}</span>
          <span />
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <label>
              {t(props.language, { es: "Nombre completo", en: "Full name", pt: "Nome completo" })}
              <input name="name" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </label>
          ) : null}

          <label>
            Email
            <input type="email" name="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>

          <label>
            {t(props.language, { es: "Contraseña", en: "Password", pt: "Senha" })}
            <input
              type="password"
              name="password"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? (
            <p className="error-text admin-auth-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="primary admin-auth-submit" type="submit" disabled={loading}>
            {loading
              ? t(props.language, { es: "Validando...", en: "Validating...", pt: "Validando..." })
              : mode === "login"
                ? t(props.language, { es: "Ingresar", en: "Sign in", pt: "Entrar" })
                : t(props.language, { es: "Crear admin", en: "Create admin", pt: "Criar admin" })}
          </button>
        </form>
      </section>
    </div>
  );
}
