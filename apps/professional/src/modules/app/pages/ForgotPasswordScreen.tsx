import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { apiRequest } from "../services/api";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ForgotPasswordScreen(props: { language: AppLanguage }) {
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
          en: "Enter a valid email.",
          pt: "Insira um email valido."
        })
      );
      return;
    }

    setLoading(true);
    try {
      await apiRequest<{ ok: boolean }>("/api/auth/forgot-password", undefined, {
        method: "POST",
        body: JSON.stringify({ email: trimmed, role: "PROFESSIONAL" })
      });
      setMessage(
        t(props.language, {
          es: "Si existe una cuenta profesional con ese email, te enviamos un enlace para restablecer la contraseña.",
          en: "If a professional account exists for that email, we sent a link to reset your password.",
          pt: "Se existir uma conta profissional com esse email, enviamos um link para redefinir a senha."
        })
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo enviar la solicitud. Probá de nuevo más tarde.",
              en: "Could not send the request. Please try again later.",
              pt: "Nao foi possivel enviar o pedido. Tente novamente mais tarde."
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
          <button className="pro-auth-back" type="button" onClick={() => navigate("/", { replace: true })}>
            {t(props.language, { es: "Volver", en: "Back", pt: "Voltar" })}
          </button>
        </div>
        <h1>{t(props.language, { es: "Recuperar contraseña", en: "Reset password", pt: "Recuperar senha" })}</h1>
        <p className="pro-auth-lead">
          {t(props.language, {
            es: "Te enviaremos un enlace por email para elegir una nueva contraseña (portal profesional).",
            en: "We will email you a link to choose a new password (professional portal).",
            pt: "Enviaremos por email um link para definir uma nova senha (portal profissional)."
          })}
        </p>

        <form className="pro-stack pro-auth-simple-form" onSubmit={handleSubmit}>
          <label>
            {t(props.language, { es: "Email", en: "Email", pt: "E-mail" })}
            <input
              type="email"
              name="email"
              value={email}
              autoComplete="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          {error ? (
            <p className="pro-error pro-auth-error-banner" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="pro-success" role="status">
              {message}
            </p>
          ) : null}

          <button className="pro-primary" type="submit" disabled={loading}>
            {loading
              ? t(props.language, { es: "Enviando…", en: "Sending…", pt: "Enviando…" })
              : t(props.language, { es: "Enviar enlace", en: "Send link", pt: "Enviar link" })}
          </button>
        </form>
      </section>
    </div>
  );
}
