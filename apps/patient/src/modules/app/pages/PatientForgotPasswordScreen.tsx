import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { friendlyAuthSurfaceMessage } from "../lib/friendlyPatientMessages";
import { apiRequest } from "../services/api";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function PatientForgotPasswordScreen(props: { language: AppLanguage }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) {
      setError(
        t(props.language, {
          es: "Ingresá un email válido.",
          en: "Enter a valid email address.",
          pt: "Digite um e-mail valido."
        })
      );
      return;
    }

    setLoading(true);
    try {
      await apiRequest<{ ok: boolean }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: trimmed, role: "PATIENT" })
      });
      setMessage(
        t(props.language, {
          es: "Si existe una cuenta con ese email, te enviamos un enlace para restablecer la contraseña.",
          en: "If an account exists for that email, we sent a link to reset your password.",
          pt: "Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha."
        })
      );
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(raw ? friendlyAuthSurfaceMessage(raw, props.language) : friendlyAuthSurfaceMessage("", props.language));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-card auth-card-verify-email auth-narrow-flow">
        <div className="verify-email-panel">
          <div className="auth-brand-mark auth-brand-mark--center">
            <img
              className="auth-brand-lockup"
              src="/brand/motivarcare-logo-full.png"
              alt="MotivarCare"
              width={708}
              height={148}
            />
          </div>
          <button className="auth-narrow-back" type="button" onClick={() => navigate("/", { replace: true })}>
            {t(props.language, { es: "← Volver al inicio de sesión", en: "← Back to sign in", pt: "← Voltar ao login" })}
          </button>
          <h1>{t(props.language, { es: "Recuperar contraseña", en: "Reset password", pt: "Recuperar senha" })}</h1>
          <p className="verify-email-lead">
            {t(props.language, {
              es: "Te enviaremos un enlace por email para elegir una nueva contraseña (portal paciente).",
              en: "We will email you a link to choose a new password (patient portal).",
              pt: "Enviaremos um link por e-mail para definir uma nova senha (portal do paciente)."
            })}
          </p>

          <form className="stack auth-form auth-narrow-form" onSubmit={handleSubmit}>
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
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>

            {error ? (
              <p className="error-text auth-error" role="alert">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="success-text" role="status">
                {message}
              </p>
            ) : null}

            <button className="primary auth-submit" type="submit" disabled={loading}>
              {loading
                ? t(props.language, { es: "Enviando…", en: "Sending…", pt: "Enviando…" })
                : t(props.language, { es: "Enviar enlace", en: "Send link", pt: "Enviar link" })}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
