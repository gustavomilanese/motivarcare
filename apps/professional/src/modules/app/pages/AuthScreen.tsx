import { FormEvent, useEffect, useState } from "react";
import {
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  textByLanguage
} from "@therapy/i18n-config";
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
  const [email, setEmail] = useState(props.initialEmail ?? "emma.collins@motivarte.com");
  const [password, setPassword] = useState(props.initialPassword ?? "SecurePass123");
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiRequest<AuthResponse>("/api/auth/login", undefined, {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password
        })
      });

      if (response.user.role !== "PROFESSIONAL" || !response.user.professionalProfileId) {
        throw new Error(
          t(props.language, {
            es: "El usuario no pertenece al portal profesional.",
            en: "This user does not belong to the professional portal.",
            pt: "Este usuario nao pertence ao portal profissional."
          })
        );
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
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo autenticar.",
              en: "Could not authenticate.",
              pt: "Nao foi possivel autenticar."
            })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pro-auth-shell">
      <section className="pro-auth-card">
        <p className="pro-auth-eyebrow">MotivarCare</p>
        <div className="pro-auth-head">
          <span className="pro-chip">{t(props.language, { es: "Acceso profesional", en: "Professional access", pt: "Acesso profissional" })}</span>
          {props.onBack ? (
            <button className="pro-auth-back" type="button" onClick={props.onBack}>
              {t(props.language, { es: "Volver", en: "Back", pt: "Voltar" })}
            </button>
          ) : null}
        </div>
        <h1>{t(props.language, { es: "Accede a tu cuenta profesional", en: "Access your professional account", pt: "Acesse sua conta profissional" })}</h1>
        <p className="pro-auth-lead">
          {t(props.language, {
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
          <label>
            {t(props.language, { es: "Usuario (email)", en: "User (email)", pt: "Usuario (e-mail)" })}
            <input type="email" name="email" value={email} autoComplete="email" inputMode="email" onChange={(event) => setEmail(event.target.value)} />
          </label>

          <label>
            {t(props.language, { es: "Contrasena", en: "Password", pt: "Senha" })}
            <input type="password" name="password" value={password} autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} />
          </label>

          {error ? (
            <p className="pro-error pro-auth-error-banner" role="alert">
              {error}
            </p>
          ) : null}

          <button className="pro-primary" type="submit" disabled={loading}>
            {loading
              ? t(props.language, { es: "Accediendo...", en: "Accessing...", pt: "Acessando..." })
              : t(props.language, { es: "Acceder", en: "Access", pt: "Acessar" })}
          </button>
        </form>
      </section>
    </div>
  );
}
