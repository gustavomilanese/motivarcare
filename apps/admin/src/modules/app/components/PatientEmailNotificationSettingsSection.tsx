import { useEffect, useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import {
  fetchPatientEmailPlatformSettings,
  patchPatientEmailPlatformSettings
} from "../services/patientEmailSettingsApi";
import type {
  PatientEmailPlatformSettings,
  PatientEmailPlatformSettingsResponse
} from "../types/patientEmailSettings.types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

type EventKey = keyof PatientEmailPlatformSettings["events"];

const EVENT_LABELS: Record<EventKey, LocalizedText> = {
  booking_confirmed: {
    es: "Sesión confirmada",
    en: "Session confirmed",
    pt: "Sessão confirmada"
  },
  booking_reminder_24h: {
    es: "Recordatorio anticipado",
    en: "Advance reminder",
    pt: "Lembrete antecipado"
  },
  booking_reminder_1h: {
    es: "Recordatorio 1 hora antes",
    en: "One-hour reminder",
    pt: "Lembrete 1 hora antes"
  },
  booking_cancelled: {
    es: "Sesión cancelada",
    en: "Session cancelled",
    pt: "Sessão cancelada"
  },
  booking_rescheduled: {
    es: "Sesión reprogramada",
    en: "Session rescheduled",
    pt: "Sessão reagendada"
  },
  purchase_confirmed: {
    es: "Compra confirmada",
    en: "Purchase confirmed",
    pt: "Compra confirmada"
  },
  payment_failed: {
    es: "Pago fallido",
    en: "Payment failed",
    pt: "Pagamento falhou"
  },
  professional_assigned: {
    es: "Profesional asignado",
    en: "Therapist assigned",
    pt: "Profissional atribuído"
  }
};

const EVENT_HINTS: Record<EventKey, LocalizedText> = {
  booking_confirmed: {
    es: "Se envía al confirmar una reserva en el portal.",
    en: "Sent when a booking is confirmed in the portal.",
    pt: "Enviado ao confirmar uma reserva no portal."
  },
  booking_reminder_24h: {
    es: "Cron revisa sesiones en la ventana configurada antes del turno.",
    en: "Cron checks sessions in the configured window before the appointment.",
    pt: "O cron verifica sessões na janela configurada antes da consulta."
  },
  booking_reminder_1h: {
    es: "Aviso corto antes de la sesión; incluye link a Meet si existe.",
    en: "Short notice before the session; includes Meet link when available.",
    pt: "Aviso curto antes da sessão; inclui link do Meet quando existir."
  },
  booking_cancelled: {
    es: "Cuando el profesional cancela una sesión.",
    en: "When the therapist cancels a session.",
    pt: "Quando o profissional cancela uma sessão."
  },
  booking_rescheduled: {
    es: "Cuando el profesional reprograma una sesión.",
    en: "When the therapist reschedules a session.",
    pt: "Quando o profissional reagenda uma sessão."
  },
  purchase_confirmed: {
    es: "Tras una compra de paquete o sesiones individuales.",
    en: "After a package or individual session purchase.",
    pt: "Após compra de pacote ou sessões individuais."
  },
  payment_failed: {
    es: "Si Stripe no completa el pago.",
    en: "If Stripe does not complete payment.",
    pt: "Se o Stripe não concluir o pagamento."
  },
  professional_assigned: {
    es: "Cuando se asigna o cambia el profesional activo.",
    en: "When the active therapist is assigned or changed.",
    pt: "Quando o profissional ativo é atribuído ou alterado."
  }
};

function settingsEqual(a: PatientEmailPlatformSettings, b: PatientEmailPlatformSettings): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function PatientEmailNotificationSettingsSection(props: { token: string; language: AppLanguage }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [settings, setSettings] = useState<PatientEmailPlatformSettings | null>(null);
  const [savedSettings, setSavedSettings] = useState<PatientEmailPlatformSettings | null>(null);
  const [meta, setMeta] = useState<PatientEmailPlatformSettingsResponse["meta"] | null>(null);

  const hasPendingChanges = useMemo(() => {
    if (!settings || !savedSettings) {
      return false;
    }
    return !settingsEqual(settings, savedSettings);
  }, [settings, savedSettings]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void fetchPatientEmailPlatformSettings(props.token)
      .then((response) => {
        if (!active) {
          return;
        }
        setSettings(response.settings);
        setSavedSettings(response.settings);
        setMeta(response.meta);
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }
        setError(requestError instanceof Error ? requestError.message : "No se pudo cargar la configuración.");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [props.token]);

  const updateSettings = (updater: (current: PatientEmailPlatformSettings) => PatientEmailPlatformSettings) => {
    setSettings((current) => (current ? updater(current) : current));
    setSuccess("");
  };

  const save = async () => {
    if (!settings) {
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await patchPatientEmailPlatformSettings(props.token, settings);
      setSettings(response.settings);
      setSavedSettings(response.settings);
      setMeta(response.meta);
      setSuccess(
        t(props.language, {
          es: "Configuración de emails guardada.",
          en: "Email settings saved.",
          pt: "Configuração de emails salva."
        })
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>{t(props.language, { es: "Cargando emails...", en: "Loading emails...", pt: "Carregando emails..." })}</p>;
  }

  if (!settings) {
    return error ? <p className="error-text">{error}</p> : null;
  }

  return (
    <div className="email-notif-settings stack">
      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="success-text">{success}</p> : null}

      <div className="email-notif-settings-toolbar card stack">
        <div className="email-notif-settings-toolbar-head">
          <div>
            <h3>{t(props.language, { es: "Envío automático", en: "Automatic delivery", pt: "Envio automatico" })}</h3>
            <p className="settings-section-lead">
              {t(props.language, {
                es: "Control global del worker de recordatorios y emails transaccionales al paciente.",
                en: "Global control of the reminder worker and transactional patient emails.",
                pt: "Controle global do worker de lembretes e emails transacionais ao paciente."
              })}
            </p>
          </div>
          <label className="inline-toggle email-notif-master-toggle">
            <input
              type="checkbox"
              checked={settings.masterEnabled}
              onChange={(event) =>
                updateSettings((current) => ({ ...current, masterEnabled: event.target.checked }))
              }
            />
            <span>{t(props.language, { es: "Emails activos", en: "Emails enabled", pt: "Emails ativos" })}</span>
          </label>
        </div>

        <div className="email-notif-toolbar-controls">
          <label className="email-notif-cron-field">
            <span className="email-notif-cron-label">
              {t(props.language, {
                es: "Frecuencia del cron (min)",
                en: "Cron frequency (min)",
                pt: "Frequencia do cron (min)"
              })}
            </span>
            <input
              type="number"
              min={1}
              max={60}
              value={settings.cronPollMinutes}
              onChange={(event) =>
                updateSettings((current) => ({
                  ...current,
                  cronPollMinutes: Math.min(60, Math.max(1, Number(event.target.value) || 1))
                }))
              }
            />
          </label>

          {meta ? (
            <div className="email-notif-meta-row">
              <span className={`email-notif-pill ${meta.resendConfigured ? "ok" : "warn"}`}>
                {meta.resendConfigured
                  ? t(props.language, { es: "Resend conectado", en: "Resend connected", pt: "Resend conectado" })
                  : t(props.language, { es: "Resend sin API key", en: "Resend missing API key", pt: "Resend sem API key" })}
              </span>
              <span className="email-notif-pill muted">{meta.emailFrom}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="email-notif-list card">
        <div className="email-notif-list-head" aria-hidden="true">
          <span>{t(props.language, { es: "Email", en: "Email", pt: "Email" })}</span>
          <span>{t(props.language, { es: "Programación", en: "Timing", pt: "Programacao" })}</span>
          <span>{t(props.language, { es: "Activo", en: "On", pt: "Ativo" })}</span>
        </div>

        {(Object.keys(EVENT_LABELS) as EventKey[]).map((eventKey) => {
          const eventConfig = settings.events[eventKey];
          const isScheduled = eventConfig.trigger === "scheduled";

          return (
            <article
              key={eventKey}
              className={`email-notif-row ${eventConfig.enabled ? "is-on" : "is-off"}`}
            >
              <div className="email-notif-row-main">
                <h4>{t(props.language, EVENT_LABELS[eventKey])}</h4>
                <p>{t(props.language, EVENT_HINTS[eventKey])}</p>
              </div>

              <div className="email-notif-row-timing">
                {isScheduled && eventKey === "booking_reminder_24h" ? (
                  <div className="email-notif-inline-fields">
                    <label>
                      <span>{t(props.language, { es: "Horas antes", en: "Hours before", pt: "Horas antes" })}</span>
                      <input
                        type="number"
                        min={1}
                        max={168}
                        value={settings.events.booking_reminder_24h.leadTimeHours}
                        onChange={(event) =>
                          updateSettings((current) => ({
                            ...current,
                            events: {
                              ...current.events,
                              booking_reminder_24h: {
                                ...current.events.booking_reminder_24h,
                                leadTimeHours: Math.min(168, Math.max(1, Number(event.target.value) || 24))
                              }
                            }
                          }))
                        }
                      />
                    </label>
                    <label>
                      <span>{t(props.language, { es: "Ventana ± min", en: "Window ± min", pt: "Janela ± min" })}</span>
                      <input
                        type="number"
                        min={5}
                        max={360}
                        value={settings.events.booking_reminder_24h.windowMinutes}
                        onChange={(event) =>
                          updateSettings((current) => ({
                            ...current,
                            events: {
                              ...current.events,
                              booking_reminder_24h: {
                                ...current.events.booking_reminder_24h,
                                windowMinutes: Math.min(360, Math.max(5, Number(event.target.value) || 120))
                              }
                            }
                          }))
                        }
                      />
                    </label>
                  </div>
                ) : null}

                {isScheduled && eventKey === "booking_reminder_1h" ? (
                  <div className="email-notif-inline-fields">
                    <label>
                      <span>{t(props.language, { es: "Min antes", en: "Min before", pt: "Min antes" })}</span>
                      <input
                        type="number"
                        min={5}
                        max={1440}
                        value={settings.events.booking_reminder_1h.leadTimeMinutes}
                        onChange={(event) =>
                          updateSettings((current) => ({
                            ...current,
                            events: {
                              ...current.events,
                              booking_reminder_1h: {
                                ...current.events.booking_reminder_1h,
                                leadTimeMinutes: Math.min(1440, Math.max(5, Number(event.target.value) || 60))
                              }
                            }
                          }))
                        }
                      />
                    </label>
                    <label>
                      <span>{t(props.language, { es: "Ventana ± min", en: "Window ± min", pt: "Janela ± min" })}</span>
                      <input
                        type="number"
                        min={5}
                        max={120}
                        value={settings.events.booking_reminder_1h.windowMinutes}
                        onChange={(event) =>
                          updateSettings((current) => ({
                            ...current,
                            events: {
                              ...current.events,
                              booking_reminder_1h: {
                                ...current.events.booking_reminder_1h,
                                windowMinutes: Math.min(120, Math.max(5, Number(event.target.value) || 20))
                              }
                            }
                          }))
                        }
                      />
                    </label>
                  </div>
                ) : null}

                {!isScheduled ? (
                  <span className="email-notif-immediate-tag">
                    {t(props.language, { es: "Inmediato", en: "Immediate", pt: "Imediato" })}
                  </span>
                ) : null}
              </div>

              <label className="inline-toggle email-notif-row-toggle">
                <input
                  type="checkbox"
                  checked={eventConfig.enabled}
                  onChange={(event) =>
                    updateSettings((current) => ({
                      ...current,
                      events: {
                        ...current.events,
                        [eventKey]: { ...current.events[eventKey], enabled: event.target.checked }
                      }
                    }))
                  }
                />
                <span>{t(props.language, { es: "Activo", en: "On", pt: "Ativo" })}</span>
              </label>
            </article>
          );
        })}
      </div>

      <div className="toolbar-actions">
        <button className="primary" type="button" onClick={() => void save()} disabled={saving || !hasPendingChanges}>
          {saving
            ? t(props.language, { es: "Guardando...", en: "Saving...", pt: "Salvando..." })
            : hasPendingChanges
              ? t(props.language, { es: "Guardar notificaciones", en: "Save notifications", pt: "Salvar notificacoes" })
              : t(props.language, { es: "Sin cambios", en: "No changes", pt: "Sem alteracoes" })}
        </button>
      </div>
    </div>
  );
}
