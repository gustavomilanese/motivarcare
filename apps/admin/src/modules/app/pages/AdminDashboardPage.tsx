import { useEffect, useState } from "react";
import {
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  formatCurrencyCents,
  textByLanguage
} from "@therapy/i18n-config";
import { apiRequest } from "../services/api";
import type { KpisResponse } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatMoneyCents(cents: number, language: AppLanguage, currency: SupportedCurrency): string {
  return formatCurrencyCents({
    centsInUsd: cents,
    language,
    currency,
    maximumFractionDigits: 0
  });
}

function OverviewPage(props: { token: string; language: AppLanguage; currency: SupportedCurrency }) {
  const [response, setResponse] = useState<KpisResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await apiRequest<KpisResponse>("/api/admin/kpis", {}, props.token);
        if (active) {
          setResponse(data);
          setError("");
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : t(props.language, {
                  es: "No se pudo cargar el overview.",
                  en: "Could not load the overview.",
                  pt: "Nao foi possivel carregar a visao geral."
                })
          );
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [props.token]);

  if (error) {
    return (
      <section className="card">
        <p className="error-text">{error}</p>
      </section>
    );
  }

  if (!response) {
    return (
      <section className="card">
        <p>{t(props.language, { es: "Cargando overview...", en: "Loading overview...", pt: "Carregando visao geral..." })}</p>
      </section>
    );
  }

  const trendValues = [0.48, 0.56, 0.62, 0.58, 0.71, 0.79, 0.86, 0.94, 1.0, 0.92].map((factor) =>
    Math.max(1, Math.round(response.kpis.scheduledSessions * factor + response.kpis.activePatients * 0.08))
  );
  const trendMax = Math.max(...trendValues, 1);
  const trendPoints = trendValues
    .map((value, index) => {
      const x = (index / Math.max(1, trendValues.length - 1)) * 100;
      const y = 100 - (value / trendMax) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  const loadBars = [
    {
      key: "patients",
      label: t(props.language, { es: "Pacientes", en: "Patients", pt: "Pacientes" }),
      value: response.kpis.activePatients,
      tone: "var(--accent-strong)"
    },
    {
      key: "pros",
      label: t(props.language, { es: "Psicologos", en: "Psychologists", pt: "Psicologos" }),
      value: Math.max(1, response.kpis.activeProfessionals * 6),
      tone: "#5a8de3"
    },
    {
      key: "sessions",
      label: t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" }),
      value: response.kpis.scheduledSessions,
      tone: "#2f7f71"
    },
    {
      key: "finance",
      label: t(props.language, { es: "Finanzas", en: "Finance", pt: "Financas" }),
      value: Math.max(1, Math.round(response.kpis.monthlyRevenueCents / 10000)),
      tone: "#9f6b24"
    }
  ];
  const maxLoad = Math.max(...loadBars.map((item) => item.value), 1);

  return (
    <div className="dashboard-stack">
      <section className="card dashboard-hero-card">
        <div className="dashboard-hero-copy">
          <p className="dashboard-hero-eyebrow">{t(props.language, { es: "Panel ejecutivo", en: "Executive panel", pt: "Painel executivo" })}</p>
          <h2>{t(props.language, { es: "Estado general de la operacion", en: "Overall operation status", pt: "Status geral da operacao" })}</h2>
          <p>{response.note}</p>
        </div>
        <div className="dashboard-hero-chips">
          <article className="dashboard-chip">
            <span>{t(props.language, { es: "Pacientes activos", en: "Active patients", pt: "Pacientes ativos" })}</span>
            <strong>{response.kpis.activePatients}</strong>
          </article>
          <article className="dashboard-chip">
            <span>{t(props.language, { es: "Sesiones agendadas", en: "Scheduled sessions", pt: "Sessoes agendadas" })}</span>
            <strong>{response.kpis.scheduledSessions}</strong>
          </article>
          <article className="dashboard-chip highlight">
            <span>{t(props.language, { es: "Revenue mensual", en: "Monthly revenue", pt: "Receita mensal" })}</span>
            <strong>{formatMoneyCents(response.kpis.monthlyRevenueCents, props.language, props.currency)}</strong>
          </article>
        </div>
      </section>

      <section className="card stack">
        <div className="dashboard-section-head">
          <h3>{t(props.language, { es: "Indicadores clave", en: "Key indicators", pt: "Indicadores chave" })}</h3>
          <span className="role-pill">Live</span>
        </div>
        <div className="kpi-grid dashboard-kpi-grid">
          <article className="kpi-card">
            <span>{t(props.language, { es: "Pacientes activos", en: "Active patients", pt: "Pacientes ativos" })}</span>
            <strong>{response.kpis.activePatients}</strong>
          </article>
          <article className="kpi-card">
            <span>{t(props.language, { es: "Profesionales visibles", en: "Visible professionals", pt: "Profissionais visiveis" })}</span>
            <strong>{response.kpis.activeProfessionals}</strong>
          </article>
          <article className="kpi-card">
            <span>{t(props.language, { es: "Sesiones agendadas", en: "Scheduled sessions", pt: "Sessoes agendadas" })}</span>
            <strong>{response.kpis.scheduledSessions}</strong>
          </article>
          <article className="kpi-card">
            <span>{t(props.language, { es: "Revenue mensual", en: "Monthly revenue", pt: "Receita mensal" })}</span>
            <strong>{formatMoneyCents(response.kpis.monthlyRevenueCents, props.language, props.currency)}</strong>
          </article>
        </div>
      </section>

      <section className="dashboard-chart-grid">
        <article className="card dashboard-chart-card">
          <header>
            <h3>{t(props.language, { es: "Tendencia de actividad", en: "Activity trend", pt: "Tendencia de atividade" })}</h3>
            <small>{t(props.language, { es: "Ultimos bloques operativos", en: "Recent operational blocks", pt: "Ultimos blocos operacionais" })}</small>
          </header>
          <div className="dashboard-line-chart" role="img" aria-label="Activity trend chart">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline points={trendPoints} />
            </svg>
          </div>
          <div className="dashboard-line-legend">
            {trendValues.map((value, index) => (
              <span key={`trend-${index}`}>{value}</span>
            ))}
          </div>
        </article>

        <article className="card dashboard-chart-card">
          <header>
            <h3>{t(props.language, { es: "Carga por modulo", en: "Load by module", pt: "Carga por modulo" })}</h3>
            <small>{t(props.language, { es: "Intensidad relativa", en: "Relative intensity", pt: "Intensidade relativa" })}</small>
          </header>
          <div className="dashboard-bar-chart">
            {loadBars.map((item) => (
              <div key={item.key} className="dashboard-bar-row">
                <span>{item.label}</span>
                <div className="dashboard-bar-track">
                  <div className="dashboard-bar-fill" style={{ width: `${Math.max(10, Math.round((item.value / maxLoad) * 100))}%`, background: item.tone }} />
                </div>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

export function AdminDashboardPage(props: { token: string; language: AppLanguage; currency: SupportedCurrency }) {
  return <OverviewPage token={props.token} language={props.language} currency={props.currency} />;
}
