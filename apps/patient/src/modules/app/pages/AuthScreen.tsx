import { FormEvent, SyntheticEvent, useState } from "react";
import {
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  currencyOptionLabel,
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
  currency: SupportedCurrency;
  heroImage: string;
  onHeroFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onLanguageChange: (language: AppLanguage) => void;
  onCurrencyChange: (currency: SupportedCurrency) => void;
  onLogin: (params: {
    user: SessionUser;
    token: string | null;
    emailVerificationRequired: boolean;
  }) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("Alex Morgan");
  const [email, setEmail] = useState("alex@example.com");
  const [password, setPassword] = useState("SecurePass123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
              timezone: detectBrowserTimezone()
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
        emailVerificationRequired: response.emailVerificationRequired
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
        <div className="visual-hero">
          <img
            src={props.heroImage}
            alt={t(props.language, {
              es: "Plataforma de terapia online",
              en: "Online therapy platform",
              pt: "Plataforma de terapia online"
            })}
            onError={props.onHeroFallback}
          />
        </div>
        <span className="chip">
          {t(props.language, { es: "Plataforma de terapia online", en: "Online therapy platform", pt: "Plataforma de terapia online" })}
        </span>
        <h1>{t(props.language, { es: "Terapia online, simple y profesional", en: "Online therapy, simple and professional", pt: "Terapia online, simples e profissional" })}</h1>
        <p>
          {t(props.language, {
            es: "Regístrate o ingresa para completar tu perfil clínico, ver el matching recomendado y reservar sesiones.",
            en: "Sign up or log in to complete your clinical profile, view recommended matching, and book sessions.",
            pt: "Cadastre-se ou entre para completar seu perfil clínico, ver o matching recomendado e reservar sessoes."
          })}
        </p>

        <div className="locale-controls auth">
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
          <button
            className={mode === "register" ? "active" : ""}
            type="button"
            onClick={() => setMode("register")}
          >
            {t(props.language, { es: "Registrarme", en: "Sign up", pt: "Cadastrar" })}
          </button>
          <button
            className={mode === "login" ? "active" : ""}
            type="button"
            onClick={() => setMode("login")}
          >
            {t(props.language, { es: "Ingresar", en: "Sign in", pt: "Entrar" })}
          </button>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <label>
              {t(props.language, { es: "Nombre completo", en: "Full name", pt: "Nome completo" })}
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </label>
          ) : null}

          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>

          <label>
            {t(props.language, { es: "Contrasena", en: "Password", pt: "Senha" })}
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>

          {error ? <p className="error-text">{error}</p> : null}
          <button className="primary" type="submit" disabled={loading || submitting}>
            {loading
              ? t(props.language, { es: "Validando...", en: "Validating...", pt: "Validando..." })
              : mode === "register"
                ? t(props.language, { es: "Crear cuenta", en: "Create account", pt: "Criar conta" })
                : t(props.language, { es: "Entrar", en: "Sign in", pt: "Entrar" })}
          </button>
        </form>
      </section>
    </div>
  );
}
