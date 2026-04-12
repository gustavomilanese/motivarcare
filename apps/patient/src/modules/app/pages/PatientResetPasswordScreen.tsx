import { FormEvent, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { friendlyAuthSurfaceMessage } from "../lib/friendlyPatientMessages";
import { apiRequest } from "../services/api";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function PatientResetPasswordScreen(props: { language: AppLanguage }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError(
        t(props.language, {
          es: "La nueva contraseña necesita al menos 8 caracteres.",
          en: "Your new password needs at least 8 characters.",
          pt: "A nova senha precisa de pelo menos 8 caracteres."
        })
      );
      return;
    }
    if (password !== confirm) {
      setError(
        t(props.language, {
          es: "Las contraseñas no coinciden.",
          en: "Passwords do not match.",
          pt: "As senhas nao coincidem."
        })
      );
      return;
    }
    if (token.length < 32) {
      setError(
        t(props.language, {
          es: "Falta el token del enlace. Abrí el link del correo o pedí uno nuevo.",
          en: "The link token is missing. Open the email link or request a new one.",
          pt: "Falta o token do link. Abra o e-mail ou solicite um novo."
        })
      );
      return;
    }

    setLoading(true);
    try {
      await apiRequest<{ ok: boolean }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password })
      });
      setDone(true);
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
            {t(props.language, { es: "← Ir al inicio de sesión", en: "← Go to sign in", pt: "← Ir ao login" })}
          </button>
          <h1>{t(props.language, { es: "Nueva contraseña", en: "New password", pt: "Nova senha" })}</h1>
          <p className="verify-email-lead">
            {t(props.language, {
              es: "Elegí una contraseña segura para tu cuenta de paciente.",
              en: "Choose a strong password for your patient account.",
              pt: "Escolha uma senha segura para sua conta de paciente."
            })}
          </p>

          {done ? (
            <div className="stack">
              <p className="success-text" role="status">
                {t(props.language, {
                  es: "Tu contraseña fue actualizada. Ya podés iniciar sesión.",
                  en: "Your password was updated. You can sign in now.",
                  pt: "Sua senha foi atualizada. Voce ja pode entrar."
                })}
              </p>
              <button className="primary auth-submit" type="button" onClick={() => navigate("/", { replace: true })}>
                {t(props.language, { es: "Iniciar sesión", en: "Sign in", pt: "Entrar" })}
              </button>
            </div>
          ) : (
            <form className="stack auth-form auth-narrow-form" onSubmit={handleSubmit}>
              <div className="auth-field-stack">
                <span className="auth-field-label">{t(props.language, { es: "Nueva contraseña", en: "New password", pt: "Nova senha" })}</span>
                <div className="auth-input-shell auth-input-shell--with-suffix">
                  <input
                    className="auth-input-inset"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={password}
                    autoComplete="new-password"
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button type="button" className="auth-input-suffix" onClick={() => setShowPassword((v) => !v)}>
                    {showPassword
                      ? t(props.language, { es: "Ocultar", en: "Hide", pt: "Ocultar" })
                      : t(props.language, { es: "Mostrar", en: "Show", pt: "Mostrar" })}
                  </button>
                </div>
              </div>
              <div className="auth-field-stack">
                <span className="auth-field-label">{t(props.language, { es: "Confirmar", en: "Confirm", pt: "Confirmar" })}</span>
                <div className="auth-input-shell">
                  <input
                    className="auth-input-inset"
                    type={showPassword ? "text" : "password"}
                    name="confirm"
                    value={confirm}
                    autoComplete="new-password"
                    onChange={(event) => setConfirm(event.target.value)}
                  />
                </div>
              </div>

              {error ? (
                <p className="error-text auth-error" role="alert">
                  {error}
                </p>
              ) : null}

              <button className="primary auth-submit" type="submit" disabled={loading}>
                {loading
                  ? t(props.language, { es: "Guardando…", en: "Saving…", pt: "Salvando…" })
                  : t(props.language, { es: "Guardar contraseña", en: "Save password", pt: "Salvar senha" })}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
