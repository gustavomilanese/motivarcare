import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  formatCurrencyCents,
  formatDateWithLocale,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import { apiRequest } from "../services/api";
import type { AuthUser, DashboardResponse } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatDateTime(value: string, language: AppLanguage): string {
  return formatDateWithLocale({
    value,
    language,
    options: {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  });
}

function formatDateCompact(value: string, language: AppLanguage): string {
  return formatDateWithLocale({
    value,
    language,
    options: {
      weekday: "short",
      day: "numeric",
      month: "short"
    }
  });
}

function formatTime(value: string, language: AppLanguage): string {
  return formatDateWithLocale({
    value,
    language,
    options: {
      hour: "numeric",
      minute: "2-digit"
    }
  });
}

function formatMoneyCents(cents: number, language: AppLanguage, currency: SupportedCurrency): string {
  return formatCurrencyCents({
    centsInUsd: cents,
    language,
    currency,
    maximumFractionDigits: 0
  });
}

export function DashboardPage(props: { token: string; language: AppLanguage; currency: SupportedCurrency; user: AuthUser }) {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState("");
  const location = useLocation();
  const upcomingSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await apiRequest<DashboardResponse>("/api/professional/dashboard", props.token);
        if (active) {
          setData(response);
          setError("");
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : t(props.language, {
                  es: "No se pudo cargar el dashboard.",
                  en: "Could not load the dashboard.",
                  pt: "Nao foi possivel carregar o dashboard."
                })
          );
        }
      }
    };

    load();
    const timer = window.setInterval(load, 15000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [props.token]);

  useEffect(() => {
    if (location.hash !== "#sesiones-agendadas") {
      return;
    }

    const section = upcomingSectionRef.current;
    if (!section) {
      return;
    }

    section.scrollIntoView({ behavior: "smooth", block: "start" });
    section.focus({ preventScroll: true });
  }, [location.hash, data]);

  if (error) {
    return <section className="pro-card"><p className="pro-error">{error}</p></section>;
  }

  if (!data) {
    return (
      <section className="pro-card">
        <p>{t(props.language, { es: "Cargando dashboard...", en: "Loading dashboard...", pt: "Carregando dashboard..." })}</p>
      </section>
    );
  }

  const nextSessions = data.upcomingSessions.slice(0, 8);

  return (
    <div className="pro-grid-stack">
      <section className="pro-dashboard-hero">
        <div className="pro-dashboard-hero-copy">
          <h2>
            {t(props.language, { es: "Dashboard", en: "Dashboard", pt: "Dashboard" })}
          </h2>
        </div>
      </section>

      {data.trialSession ? (
        <section className="pro-card pro-trial-banner">
          <h2>
            <span className="pro-trial-icon" aria-hidden="true" />
            {t(props.language, {
              es: "Sesion de prueba confirmada",
              en: "Confirmed trial session",
              pt: "Sessao de teste confirmada"
            })}
          </h2>
          <p>
            {replaceTemplate(
              t(props.language, {
                es: "{patient} · {date}",
                en: "{patient} · {date}",
                pt: "{patient} · {date}"
              }),
              {
                patient: data.trialSession.patientName,
                date: formatDateTime(data.trialSession.startsAt, props.language)
              }
            )}
          </p>
          <NavLink className="pro-trial-action" to="/agenda">
            {t(props.language, { es: "Ver agenda", en: "View agenda", pt: "Ver agenda" })}
          </NavLink>
        </section>
      ) : null}

      <section className="pro-kpi-grid">
        <NavLink className="pro-kpi-card pro-kpi-card-link" to="/pacientes">
          <span>{t(props.language, { es: "Pacientes activos", en: "Active patients", pt: "Pacientes ativos" })}</span>
          <strong>{data.kpis.activePatients}</strong>
          <em>{t(props.language, { es: "Ver pacientes", en: "View patients", pt: "Ver pacientes" })}</em>
        </NavLink>
        <NavLink className="pro-kpi-card pro-kpi-card-link" to="/ingresos">
          <span>{t(props.language, { es: "Sesiones completadas", en: "Completed sessions", pt: "Sessoes concluidas" })}</span>
          <strong>{data.kpis.sessionsCompleted}</strong>
          <em>{t(props.language, { es: "Ver ingresos", en: "View earnings", pt: "Ver receitas" })}</em>
        </NavLink>
        <NavLink className="pro-kpi-card pro-kpi-card-link" to="/agenda">
          <span>{t(props.language, { es: "Sesiones agendadas", en: "Scheduled sessions", pt: "Sessoes agendadas" })}</span>
          <strong>{data.kpis.sessionsScheduled}</strong>
          <em>{t(props.language, { es: "Ver sesiones agendadas", en: "View scheduled sessions", pt: "Ver sessoes agendadas" })}</em>
        </NavLink>
        <NavLink className="pro-kpi-card pro-kpi-card-link" to="/disponibilidad">
          <span>{t(props.language, { es: "Horas disponibles", en: "Available hours", pt: "Horas disponiveis" })}</span>
          <strong>{data.kpis.hoursAvailable}</strong>
          <em>{t(props.language, { es: "Ver disponibilidad", en: "View availability", pt: "Ver disponibilidade" })}</em>
        </NavLink>
        <NavLink className="pro-kpi-card pro-kpi-card-link" to="/horarios">
          <span>{t(props.language, { es: "Conversion", en: "Conversion", pt: "Conversao" })}</span>
          <strong>{data.kpis.conversionRate}%</strong>
          <em>{t(props.language, { es: "Configurar horarios", en: "Set schedule", pt: "Configurar horarios" })}</em>
        </NavLink>
        <NavLink className="pro-kpi-card pro-kpi-card-link" to="/ingresos">
          <span>{t(props.language, { es: "A cobrar", en: "To collect", pt: "A receber" })}</span>
          <strong>{formatMoneyCents(data.kpis.pendingPayoutCents, props.language, props.currency)}</strong>
          <em>{t(props.language, { es: "Revisar cobros", en: "Review payouts", pt: "Revisar recebimentos" })}</em>
        </NavLink>
      </section>

      <section className="pro-card" id="sesiones-agendadas" ref={upcomingSectionRef} tabIndex={-1}>
        <div className="dashboard-upcoming-head">
          <h2>{t(props.language, { es: "Proximas sesiones", en: "Upcoming sessions", pt: "Proximas sessoes" })}</h2>
        </div>
        {nextSessions.length === 0 ? (
          <p>{t(props.language, { es: "Todavia no hay sesiones proximas.", en: "There are no upcoming sessions yet.", pt: "Ainda nao ha sessoes futuras." })}</p>
        ) : (
          <ul className="dashboard-upcoming-list-compact">
            {nextSessions.map((session) => (
              <li key={session.id}>
                <strong>{formatTime(session.startsAt, props.language)}</strong>
                <div>
                  <span>{formatDateCompact(session.startsAt, props.language)}</span>
                  <p>{session.patientName}</p>
                </div>
                {session.joinUrl ? (
                  <a href={session.joinUrl} target="_blank" rel="noreferrer">
                    {t(props.language, { es: "Entrar", en: "Join", pt: "Entrar" })}
                  </a>
                ) : (
                  <span className="pro-muted">{t(props.language, { es: "Sin link", en: "No link", pt: "Sem link" })}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
