import { useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { apiRequest } from "../services/api";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function SettingsPage(props: { token: string; onLogout: () => void; language: AppLanguage }) {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleChangePassword = async () => {
    setError("");
    setMessage("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(
        t(props.language, {
          es: "Completa los tres campos de contraseña.",
          en: "Complete the three password fields.",
          pt: "Preencha os tres campos de senha."
        })
      );
      return;
    }

    try {
      const response = await apiRequest<{ message: string }>("/api/auth/change-password", props.token, {
        method: "POST",
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage(
        response.message ||
          t(props.language, {
            es: "Contrasena actualizada.",
            en: "Password updated.",
            pt: "Senha atualizada."
          })
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo actualizar la contrasena.",
              en: "Could not update password.",
              pt: "Nao foi possivel atualizar a senha."
            })
      );
    }
  };

  return (
    <section className="pro-card">
      <h2>{t(props.language, { es: "Ajustes generales", en: "General settings", pt: "Configuracoes gerais" })}</h2>
      <label className="pro-inline">
        <input type="checkbox" checked={emailNotifications} onChange={(event) => setEmailNotifications(event.target.checked)} />
        {t(props.language, { es: "Notificaciones por email", en: "Email notifications", pt: "Notificacoes por email" })}
      </label>
      <label className="pro-inline">
        <input type="checkbox" checked={securityAlerts} onChange={(event) => setSecurityAlerts(event.target.checked)} />
        {t(props.language, { es: "Alertas de seguridad", en: "Security alerts", pt: "Alertas de seguranca" })}
      </label>

      <div className="pro-settings-password">
        <h3>{t(props.language, { es: "Contrasena", en: "Password", pt: "Senha" })}</h3>
        <label>
          {t(props.language, { es: "Contrasena actual", en: "Current password", pt: "Senha atual" })}
          <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
        </label>
        <label>
          {t(props.language, { es: "Nueva contrasena", en: "New password", pt: "Nova senha" })}
          <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
        </label>
        <label>
          {t(props.language, { es: "Repite la nueva contrasena", en: "Repeat new password", pt: "Repita a nova senha" })}
          <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        </label>
        <button type="button" onClick={handleChangePassword}>
          {t(props.language, { es: "Actualizar contrasena", en: "Update password", pt: "Atualizar senha" })}
        </button>
        {error ? <p className="pro-error">{error}</p> : null}
        {message ? <p className="pro-success">{message}</p> : null}
      </div>

      <button className="pro-danger" type="button" onClick={props.onLogout}>
        {t(props.language, { es: "Cerrar sesion", en: "Sign out", pt: "Sair" })}
      </button>
    </section>
  );
}
