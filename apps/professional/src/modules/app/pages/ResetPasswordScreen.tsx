import { FormEvent, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { professionalSurfaceMessage } from "../lib/friendlyProfessionalSurfaceMessages";
import { apiRequest } from "../services/api";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ResetPasswordScreen(props: { language: AppLanguage }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError(
        t(props.language, {
          es: "La nueva contraseña necesita al menos 8 caracteres. Sumá letras o números y reintentá.",
          en: "Your new password needs at least 8 characters. Add a few more and try again.",
          pt: "A nova senha precisa de pelo menos 8 caracteres. Acrescente e tente de novo."
        })
      );
      return;
    }
    if (password !== confirm) {
      setError(professionalSurfaceMessage("reset-password-validation", props.language));
      return;
    }
    if (token.length < 32) {
      setError(professionalSurfaceMessage("verify-token-missing", props.language));
      return;
    }

    setLoading(true);
    try {
      await apiRequest<{ ok: boolean }>("/api/auth/reset-password", undefined, {
        method: "POST",
        body: JSON.stringify({ token, password })
      });
      setDone(true);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(professionalSurfaceMessage("reset-password-save", props.language, raw));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pro-auth-shell">
      <section className="pro-auth-card">
        <div className="pro-auth-brand">
          <img
            className="pro-auth-lockup"
            src="/brand/motivarcare-logo-full.png"
            alt="MotivarCare"
            width={708}
            height={148}
          />
        </div>
        <div className="pro-auth-head">
          <button className="pro-auth-back" type="button" onClick={() => navigate("/", { replace: true })}>
            {t(props.language, { es: "Ir al login", en: "Go to login", pt: "Ir ao login" })}
          </button>
        </div>
        <h1>{t(props.language, { es: "Nueva contraseña", en: "New password", pt: "Nova senha" })}</h1>
        <p className="pro-auth-lead">
          {t(props.language, {
            es: "Elegí una contraseña segura para tu cuenta profesional.",
            en: "Choose a strong password for your professional account.",
            pt: "Escolha uma senha segura para sua conta profissional."
          })}
        </p>

        {done ? (
          <div className="pro-stack">
            <p className="pro-success" role="status">
              {t(props.language, {
                es: "Tu contraseña fue actualizada. Ya podés iniciar sesión.",
                en: "Your password was updated. You can sign in now.",
                pt: "Sua senha foi atualizada. Voce ja pode entrar."
              })}
            </p>
            <button className="pro-primary" type="button" onClick={() => navigate("/", { replace: true })}>
              {t(props.language, { es: "Acceder", en: "Sign in", pt: "Entrar" })}
            </button>
          </div>
        ) : (
          <form className="pro-stack pro-auth-simple-form" onSubmit={handleSubmit}>
            <label>
              {t(props.language, { es: "Nueva contraseña", en: "New password", pt: "Nova senha" })}
              <input
                type="password"
                name="password"
                value={password}
                autoComplete="new-password"
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label>
              {t(props.language, { es: "Confirmar contraseña", en: "Confirm password", pt: "Confirmar senha" })}
              <input
                type="password"
                name="confirm"
                value={confirm}
                autoComplete="new-password"
                onChange={(event) => setConfirm(event.target.value)}
              />
            </label>

            {error ? (
              <p className="pro-error pro-auth-error-banner" role="alert">
                {error}
              </p>
            ) : null}

            <button className="pro-primary" type="submit" disabled={loading}>
              {loading
                ? t(props.language, { es: "Guardando…", en: "Saving…", pt: "Salvando…" })
                : t(props.language, { es: "Guardar contraseña", en: "Save password", pt: "Salvar senha" })}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
