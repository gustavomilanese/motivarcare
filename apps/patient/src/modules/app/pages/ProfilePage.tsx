import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  type AppLanguage,
  type LocalizedText,
  formatDateWithLocale,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import { apiRequest } from "../services/api";
import type {
  PackageId,
  PatientProfile,
  ProfileTab,
  SessionUser,
  SubscriptionState
} from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function localizedPackageName(planId: PackageId | null, fallback: string, language: AppLanguage): string {
  if (!planId) {
    return t(language, {
      es: "Sin paquete activo",
      en: "No active package",
      pt: "Sem pacote ativo"
    });
  }
  return fallback;
}

function formatDateTime(params: { isoDate: string; timezone: string; language: AppLanguage }): string {
  return formatDateWithLocale({
    value: params.isoDate,
    language: params.language,
    options: {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: params.timezone
    }
  });
}

export function ProfilePage(props: {
  user: SessionUser;
  language: AppLanguage;
  authToken: string | null;
  profile: PatientProfile;
  subscription: SubscriptionState;
  onUpdateProfile: (profile: PatientProfile) => void;
}) {
  const [searchParams] = useSearchParams();
  const [localProfile, setLocalProfile] = useState<PatientProfile>(props.profile);
  const [cardBrand, setCardBrand] = useState("Visa");
  const [cardLast4, setCardLast4] = useState("");
  const [cardExpMonth, setCardExpMonth] = useState("");
  const [cardExpYear, setCardExpYear] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarEmail, setCalendarEmail] = useState("");
  const [calendarLoading, setCalendarLoading] = useState(false);
  const validTabs: ProfileTab[] = ["data", "cards", "subscription", "settings", "support"];
  const tabParam = searchParams.get("tab");
  const tab: ProfileTab = validTabs.includes(tabParam as ProfileTab) ? (tabParam as ProfileTab) : "data";

  useEffect(() => {
    setLocalProfile(props.profile);
  }, [props.profile]);

  useEffect(() => {
    if (!props.authToken) {
      setCalendarConnected(false);
      setCalendarEmail("");
      return;
    }

    setCalendarLoading(true);
    void apiRequest<{
      connected: boolean;
      connection: { providerEmail: string | null } | null;
    }>("/api/auth/google/calendar/status", {}, props.authToken)
      .then((response) => {
        setCalendarConnected(response.connected);
        setCalendarEmail(response.connection?.providerEmail ?? "");
      })
      .catch(() => {
        setCalendarConnected(false);
        setCalendarEmail("");
      })
      .finally(() => setCalendarLoading(false));
  }, [props.authToken]);

  const saveProfile = () => {
    props.onUpdateProfile(localProfile);
  };

  const addCard = () => {
    if (cardLast4.length !== 4 || cardExpMonth.length === 0 || cardExpYear.length === 0) {
      return;
    }

    const nextCards = [
      ...localProfile.cards,
      {
        id: `card-${Date.now()}`,
        brand: cardBrand,
        last4: cardLast4,
        expMonth: cardExpMonth,
        expYear: cardExpYear
      }
    ];

    const updated = { ...localProfile, cards: nextCards };
    setLocalProfile(updated);
    props.onUpdateProfile(updated);

    setCardLast4("");
    setCardExpMonth("");
    setCardExpYear("");
  };

  const connectCalendar = async () => {
    if (!props.authToken) {
      return;
    }
    const response = await apiRequest<{ authUrl: string }>(
      "/api/auth/google/calendar/connect",
      {
        method: "POST",
        body: JSON.stringify({ returnPath: "/profile", clientOrigin: window.location.origin })
      },
      props.authToken
    );
    window.location.href = response.authUrl;
  };

  const disconnectCalendar = async () => {
    if (!props.authToken) {
      return;
    }
    await apiRequest<{ message: string }>(
      "/api/auth/google/calendar/disconnect",
      { method: "POST" },
      props.authToken
    );
    setCalendarConnected(false);
    setCalendarEmail("");
  };

  return (
    <div className="profile-layout">
      <section className="content-card profile-panel hostinger-payment-card">
        {tab === "data" ? (
          <>
            <h2>{t(props.language, { es: "Mis datos", en: "My data", pt: "Meus dados" })}</h2>
            <p className="profile-panel-lead">
              {t(props.language, {
                es: "Actualiza tus datos de contacto y deja listo tu perfil clínico.",
                en: "Update your contact details and keep your clinical profile ready.",
                pt: "Atualize seus dados de contato e mantenha seu perfil clínico pronto."
              })}
            </p>
            <div className="profile-form-grid">
              <label>
                {t(props.language, { es: "Nombre completo", en: "Full name", pt: "Nome completo" })}
                <input value={props.user.fullName} disabled />
              </label>
              <label>
                {t(props.language, { es: "Email", en: "Email", pt: "Email" })}
                <input value={props.user.email} disabled />
              </label>
              <label>
                {t(props.language, { es: "Telefono", en: "Phone", pt: "Telefone" })}
                <input
                  value={localProfile.phone}
                  onChange={(event) => setLocalProfile((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>
              <label>
                {t(props.language, { es: "Contacto de emergencia", en: "Emergency contact", pt: "Contato de emergencia" })}
                <input
                  value={localProfile.emergencyContact}
                  onChange={(event) =>
                    setLocalProfile((current) => ({
                      ...current,
                      emergencyContact: event.target.value
                    }))
                  }
                />
              </label>
              <label>
                {t(props.language, { es: "Zona horaria", en: "Time zone", pt: "Fuso horario" })}
                <input
                  value={localProfile.timezone}
                  onChange={(event) => setLocalProfile((current) => ({ ...current, timezone: event.target.value }))}
                />
              </label>
            </div>
            <button className="primary" type="button" onClick={saveProfile}>
              {t(props.language, { es: "Guardar perfil", en: "Save profile", pt: "Salvar perfil" })}
            </button>
          </>
        ) : null}

        {tab === "cards" ? (
          <>
            <h2>{t(props.language, { es: "Mis tarjetas", en: "My cards", pt: "Meus cartoes" })}</h2>
            <p className="profile-panel-lead">
              {t(props.language, {
                es: "Gestiona tus medios de pago para comprar sesiones cuando lo necesites.",
                en: "Manage your payment methods to buy sessions whenever needed.",
                pt: "Gerencie seus meios de pagamento para comprar sessoes quando precisar."
              })}
            </p>
            {localProfile.cards.length === 0 ? <p className="profile-empty-note">{t(props.language, { es: "Todavia no hay tarjetas guardadas.", en: "There are no saved cards yet.", pt: "Ainda nao ha cartoes salvos." })}</p> : null}
            <ul className="simple-list profile-list">
              {localProfile.cards.map((card) => (
                <li key={card.id}>
                  <div>
                    <strong>{card.brand} **** {card.last4}</strong>
                    <span>
                      {replaceTemplate(t(props.language, { es: "Vence {value}", en: "Expires {value}", pt: "Vence {value}" }), {
                        value: `${card.expMonth}/${card.expYear}`
                      })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="card-grid profile-form-grid">
              <label>
                {t(props.language, { es: "Marca", en: "Brand", pt: "Bandeira" })}
                <select value={cardBrand} onChange={(event) => setCardBrand(event.target.value)}>
                  <option value="Visa">Visa</option>
                  <option value="Mastercard">Mastercard</option>
                  <option value="Amex">Amex</option>
                </select>
              </label>
              <label>
                {t(props.language, { es: "Ultimos 4 digitos", en: "Last 4 digits", pt: "Ultimos 4 digitos" })}
                <input value={cardLast4} onChange={(event) => setCardLast4(event.target.value.replace(/\D/g, "").slice(0, 4))} />
              </label>
              <label>
                {t(props.language, { es: "Mes de vencimiento", en: "Expiration month", pt: "Mes de vencimento" })}
                <input value={cardExpMonth} onChange={(event) => setCardExpMonth(event.target.value.replace(/\D/g, "").slice(0, 2))} />
              </label>
              <label>
                {t(props.language, { es: "Ano de vencimiento", en: "Expiration year", pt: "Ano de vencimento" })}
                <input value={cardExpYear} onChange={(event) => setCardExpYear(event.target.value.replace(/\D/g, "").slice(0, 4))} />
              </label>
            </div>
            <button className="primary" type="button" onClick={addCard}>
              {t(props.language, { es: "Agregar tarjeta", en: "Add card", pt: "Adicionar cartao" })}
            </button>
          </>
        ) : null}

        {tab === "subscription" ? (
          <>
            <h2>{t(props.language, { es: "Mi suscripcion", en: "My subscription", pt: "Minha assinatura" })}</h2>
            <p className="profile-panel-lead">
              {t(props.language, {
                es: "Resumen de tu plan activo y disponibilidad de sesiones.",
                en: "Summary of your active plan and available sessions.",
                pt: "Resumo do seu plano ativo e disponibilidade de sessoes."
              })}
            </p>
            <div className="sessions-summary-grid profile-subscription-grid">
              <article className="session-summary-item">
                <span>{t(props.language, { es: "Paquete actual", en: "Current package", pt: "Pacote atual" })}</span>
                <strong className="session-summary-compact">
                  {localizedPackageName(props.subscription.packageId, props.subscription.packageName, props.language)}
                </strong>
              </article>
              <article className="session-summary-item">
                <span>{t(props.language, { es: "Sesiones disponibles", en: "Available sessions", pt: "Sessoes disponiveis" })}</span>
                <strong>{props.subscription.creditsRemaining} / {props.subscription.creditsTotal}</strong>
              </article>
            </div>
            <p>
              {t(props.language, { es: "Fecha de compra:", en: "Purchase date:", pt: "Data da compra:" })}{" "}
              {props.subscription.purchasedAt
                ? formatDateTime({
                    isoDate: props.subscription.purchasedAt,
                    timezone: localProfile.timezone,
                    language: props.language
                  })
                : "-"}
            </p>
            <p>{t(props.language, { es: "Los paquetes se compran desde la pantalla de sesiones.", en: "Packages are purchased from the sessions screen.", pt: "Os pacotes sao comprados na tela de sessoes." })}</p>
          </>
        ) : null}

        {tab === "settings" ? (
          <>
            <h2>{t(props.language, { es: "Ajustes", en: "Settings", pt: "Configuracoes" })}</h2>
            <p className="profile-panel-lead">
              {t(props.language, {
                es: "Define como quieres recibir avisos de la plataforma.",
                en: "Choose how you want to receive platform notifications.",
                pt: "Defina como deseja receber notificacoes da plataforma."
              })}
            </p>
            <div className="profile-settings-stack">
              <label className="inline-toggle">
                <input
                  checked={localProfile.notificationsEmail}
                  type="checkbox"
                  onChange={(event) =>
                    setLocalProfile((current) => ({
                      ...current,
                      notificationsEmail: event.target.checked
                    }))
                  }
                />
                {t(props.language, { es: "Notificaciones por email", en: "Email notifications", pt: "Notificacoes por email" })}
              </label>
              <label className="inline-toggle">
                <input
                  checked={localProfile.notificationsReminder}
                  type="checkbox"
                  onChange={(event) =>
                    setLocalProfile((current) => ({
                      ...current,
                      notificationsReminder: event.target.checked
                    }))
                  }
                />
                {t(props.language, { es: "Recordatorios de sesion", en: "Session reminders", pt: "Lembretes de sessao" })}
              </label>
            </div>
            <div className="profile-settings-stack">
              <strong>{t(props.language, { es: "Google Calendar", en: "Google Calendar", pt: "Google Calendar" })}</strong>
              <p>
                {calendarLoading
                  ? t(props.language, { es: "Revisando conexión...", en: "Checking connection...", pt: "Verificando conexao..." })
                  : calendarConnected
                    ? replaceTemplate(
                        t(props.language, {
                          es: "Conectado como {email}.",
                          en: "Connected as {email}.",
                          pt: "Conectado como {email}."
                        }),
                        { email: calendarEmail || "-" }
                      )
                    : t(props.language, { es: "No conectado.", en: "Not connected.", pt: "Nao conectado." })}
              </p>
              {!calendarConnected ? (
                <button className="primary" type="button" onClick={() => void connectCalendar()}>
                  {t(props.language, { es: "Conectar Google Calendar", en: "Connect Google Calendar", pt: "Conectar Google Calendar" })}
                </button>
              ) : (
                <button type="button" onClick={() => void disconnectCalendar()}>
                  {t(props.language, { es: "Desconectar Google Calendar", en: "Disconnect Google Calendar", pt: "Desconectar Google Calendar" })}
                </button>
              )}
            </div>
            <button className="primary" type="button" onClick={saveProfile}>
              {t(props.language, { es: "Guardar ajustes", en: "Save settings", pt: "Salvar configuracoes" })}
            </button>
          </>
        ) : null}

        {tab === "support" ? (
          <>
            <h2>{t(props.language, { es: "Soporte", en: "Support", pt: "Suporte" })}</h2>
            <p className="profile-panel-lead">{t(props.language, { es: "Envianos tu consulta y el equipo operativo te responde a la brevedad.", en: "Send us your request and the operations team will reply shortly.", pt: "Envie sua consulta e a equipe operacional respondera em breve." })}</p>
            <textarea
              rows={4}
              value={supportMessage}
              onChange={(event) => setSupportMessage(event.target.value)}
              placeholder={t(props.language, { es: "Describe tu consulta", en: "Describe your request", pt: "Descreva sua solicitacao" })}
            />
            <button
              className="primary"
              type="button"
              onClick={() =>
                setSupportMessage(
                  t(props.language, {
                    es: "Solicitud enviada.",
                    en: "Request sent.",
                    pt: "Solicitacao enviada."
                  })
                )
              }
            >
              {t(props.language, { es: "Enviar solicitud", en: "Send request", pt: "Enviar solicitacao" })}
            </button>
            {supportMessage ? <p className="success-text">{supportMessage}</p> : null}
          </>
        ) : null}
      </section>
    </div>
  );
}
