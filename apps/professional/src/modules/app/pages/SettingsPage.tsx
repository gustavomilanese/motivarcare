import { useEffect, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { professionalSurfaceMessage } from "../lib/friendlyProfessionalSurfaceMessages";
import {
  PROFESSIONAL_CALENDAR_OAUTH_RETURN_PATH_KEY,
  apiRequest,
  backupProfessionalLocalStorageForCalendarOAuth
} from "../services/api";
import { PROFESSIONAL_GOOGLE_CALENDAR_SCOPE_POINTS } from "../../onboarding/constants/professionalProfileGuidanceCopy";
import { ProfessionalGuidanceList } from "../../onboarding/components/ProfessionalGuidanceBanner";
import { useProPortalChrome } from "../components/ProPortalChromeContext";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function replaceCalendarConnectedLabel(language: AppLanguage, email: string): string {
  const label = t(language, {
    es: "Conectado como {email}",
    en: "Connected as {email}",
    pt: "Conectado como {email}"
  });
  return label.replace("{email}", email || "—");
}

function SettingsBlockHead(props: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <header className="pro-settings-block__head">
      <span className="pro-settings-block__step" aria-hidden="true">
        {props.step}
      </span>
      <div>
        <h2>{props.title}</h2>
        <p>{props.description}</p>
      </div>
    </header>
  );
}

export function SettingsPage(props: { token: string; onLogout: () => void; language: AppLanguage }) {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarEmail, setCalendarEmail] = useState("");
  const [calendarLoading, setCalendarLoading] = useState(true);

  useProPortalChrome({
    title: t(props.language, { es: "Ajustes", en: "Settings", pt: "Ajustes" })
  });

  const loadCalendarStatus = async () => {
    setCalendarLoading(true);
    try {
      const response = await apiRequest<{
        connected: boolean;
        connection: { providerEmail: string | null } | null;
      }>("/api/auth/google/calendar/status", props.token);
      setCalendarConnected(response.connected);
      setCalendarEmail(response.connection?.providerEmail ?? "");
    } catch {
      setCalendarConnected(false);
      setCalendarEmail("");
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    void loadCalendarStatus();
  }, [props.token]);

  const handleChangePassword = async () => {
    setError("");
    setMessage("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(
        t(props.language, {
          es: "Completá contraseña actual, nueva y repetida para cambiarla.",
          en: "Fill in current password, new password, and confirmation.",
          pt: "Preencha senha atual, nova e confirmacao."
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
            es: "Contraseña actualizada.",
            en: "Password updated.",
            pt: "Senha atualizada."
          })
      );
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(professionalSurfaceMessage("settings-password", props.language, raw));
    }
  };

  const handleConnectCalendar = async () => {
    setError("");
    setMessage("");
    try {
      const response = await apiRequest<{ authUrl: string }>("/api/auth/google/calendar/connect", props.token, {
        method: "POST",
        body: JSON.stringify({
          clientOrigin: window.location.origin,
          returnPath: "/ajustes",
          language: props.language
        })
      });
      try {
        window.sessionStorage.setItem(PROFESSIONAL_CALENDAR_OAUTH_RETURN_PATH_KEY, "/ajustes");
      } catch {
        // ignore
      }
      backupProfessionalLocalStorageForCalendarOAuth();
      window.location.href = response.authUrl;
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(professionalSurfaceMessage("settings-calendar-connect", props.language, raw));
    }
  };

  const handleDisconnectCalendar = async () => {
    setError("");
    setMessage("");
    try {
      await apiRequest<{ message: string }>("/api/auth/google/calendar/disconnect", props.token, {
        method: "POST"
      });
      setCalendarConnected(false);
      setCalendarEmail("");
      setMessage(
        t(props.language, {
          es: "Google Calendar desconectado.",
          en: "Google Calendar disconnected.",
          pt: "Google Calendar desconectado."
        })
      );
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(professionalSurfaceMessage("settings-calendar-disconnect", props.language, raw));
    }
  };

  return (
    <div className="pro-settings-studio">
      <p className="pro-settings-studio__lead">
        {t(props.language, {
          es: "Preferencias de cuenta, sincronización y seguridad de tu portal profesional.",
          en: "Account preferences, sync, and security for your professional portal.",
          pt: "Preferencias de conta, sincronizacao e seguranca do seu portal profissional."
        })}
      </p>

      {error ? (
        <p className="pro-settings-studio__alert pro-settings-studio__alert--error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="pro-settings-studio__alert pro-settings-studio__alert--success" role="status">
          {message}
        </p>
      ) : null}

      <div className="pro-settings-studio__grid">
        <section className="pro-settings-block">
          <SettingsBlockHead
            step="01"
            title={t(props.language, { es: "Notificaciones", en: "Notifications", pt: "Notificacoes" })}
            description={t(props.language, {
              es: "Elegí qué alertas querés recibir por email.",
              en: "Choose which email alerts you want to receive.",
              pt: "Escolha quais alertas por email deseja receber."
            })}
          />
          <div className="pro-settings-toggle-list">
            <label className="pro-settings-toggle-row">
              <span className="pro-settings-toggle-row__copy">
                <strong>
                  {t(props.language, { es: "Notificaciones por email", en: "Email notifications", pt: "Notificacoes por email" })}
                </strong>
                <small>
                  {t(props.language, {
                    es: "Reservas, mensajes y novedades de tu agenda.",
                    en: "Bookings, messages, and schedule updates.",
                    pt: "Reservas, mensagens e novidades da agenda."
                  })}
                </small>
              </span>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(event) => setEmailNotifications(event.target.checked)}
              />
            </label>
            <label className="pro-settings-toggle-row">
              <span className="pro-settings-toggle-row__copy">
                <strong>
                  {t(props.language, { es: "Alertas de seguridad", en: "Security alerts", pt: "Alertas de seguranca" })}
                </strong>
                <small>
                  {t(props.language, {
                    es: "Inicios de sesión y cambios sensibles en tu cuenta.",
                    en: "Sign-ins and sensitive account changes.",
                    pt: "Acessos e alteracoes sensiveis na conta."
                  })}
                </small>
              </span>
              <input
                type="checkbox"
                checked={securityAlerts}
                onChange={(event) => setSecurityAlerts(event.target.checked)}
              />
            </label>
          </div>
        </section>

        <section className="pro-settings-block">
          <SettingsBlockHead
            step="02"
            title={t(props.language, { es: "Google Calendar", en: "Google Calendar", pt: "Google Calendar" })}
            description={t(props.language, {
              es: "Sincronizá tus reservas con tu calendario personal.",
              en: "Sync your bookings with your personal calendar.",
              pt: "Sincronize suas reservas com seu calendario pessoal."
            })}
          />

          <div className="pro-settings-calendar-status">
            <span
              className={`pro-settings-status-pill${calendarConnected ? " pro-settings-status-pill--ok" : ""}`}
              aria-live="polite"
            >
              {calendarLoading
                ? t(props.language, { es: "Revisando…", en: "Checking…", pt: "Verificando…" })
                : calendarConnected
                  ? t(props.language, { es: "Conectado", en: "Connected", pt: "Conectado" })
                  : t(props.language, { es: "Sin conectar", en: "Not connected", pt: "Nao conectado" })}
            </span>
            {!calendarLoading && calendarConnected ? (
              <p className="pro-settings-calendar-email">{replaceCalendarConnectedLabel(props.language, calendarEmail)}</p>
            ) : null}
          </div>

          <ProfessionalGuidanceList language={props.language} items={PROFESSIONAL_GOOGLE_CALENDAR_SCOPE_POINTS} />

          <div className="pro-settings-block__actions">
            {!calendarConnected ? (
              <button type="button" className="pro-primary pro-settings-block__btn" onClick={() => void handleConnectCalendar()}>
                {t(props.language, { es: "Conectar Google Calendar", en: "Connect Google Calendar", pt: "Conectar Google Calendar" })}
              </button>
            ) : (
              <button type="button" className="pro-danger pro-settings-block__btn" onClick={() => void handleDisconnectCalendar()}>
                {t(props.language, {
                  es: "Desconectar Google Calendar",
                  en: "Disconnect Google Calendar",
                  pt: "Desconectar Google Calendar"
                })}
              </button>
            )}
          </div>
        </section>

        <section className="pro-settings-block">
          <SettingsBlockHead
            step="03"
            title={t(props.language, { es: "Contraseña", en: "Password", pt: "Senha" })}
            description={t(props.language, {
              es: "Actualizá tu clave de acceso al portal.",
              en: "Update your portal sign-in password.",
              pt: "Atualize sua senha de acesso ao portal."
            })}
          />

          <div className="pro-profile-fields pro-profile-fields--stack pro-settings-password-fields">
            <label className="pro-profile-field">
              <span>{t(props.language, { es: "Contraseña actual", en: "Current password", pt: "Senha atual" })}</span>
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </label>
            <label className="pro-profile-field">
              <span>{t(props.language, { es: "Nueva contraseña", en: "New password", pt: "Nova senha" })}</span>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </label>
            <label className="pro-profile-field">
              <span>
                {t(props.language, { es: "Repetir nueva contraseña", en: "Repeat new password", pt: "Repetir nova senha" })}
              </span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
          </div>

          <div className="pro-settings-block__actions">
            <button type="button" className="pro-primary pro-settings-block__btn" onClick={() => void handleChangePassword()}>
              {t(props.language, { es: "Actualizar contraseña", en: "Update password", pt: "Atualizar senha" })}
            </button>
          </div>
        </section>

        <section className="pro-settings-block pro-settings-block--session">
          <SettingsBlockHead
            step="04"
            title={t(props.language, { es: "Sesión", en: "Session", pt: "Sessao" })}
            description={t(props.language, {
              es: "Cerrá tu sesión en este dispositivo.",
              en: "Sign out on this device.",
              pt: "Encerre sua sessao neste dispositivo."
            })}
          />
          <div className="pro-settings-block__actions">
            <button className="pro-danger pro-settings-block__btn pro-settings-block__btn--full" type="button" onClick={props.onLogout}>
              {t(props.language, { es: "Cerrar sesión", en: "Sign out", pt: "Sair" })}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
