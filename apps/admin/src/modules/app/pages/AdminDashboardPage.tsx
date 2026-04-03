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

function utcMonthKeyFromDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatMoneyCents(cents: number, language: AppLanguage, currency: SupportedCurrency): string {
  return formatCurrencyCents({
    centsInUsd: cents,
    language,
    currency,
    maximumFractionDigits: 0
  });
}

function StatCard(props: {
  label: string;
  value: string;
  hint?: string;
  variant?: "default" | "accent";
}) {
  return (
    <article className={`dashboard-stat-card${props.variant === "accent" ? " dashboard-stat-card--accent" : ""}`}>
      <span className="dashboard-stat-label">{props.label}</span>
      <strong className="dashboard-stat-value">{props.value}</strong>
      {props.hint ? <p className="dashboard-stat-hint">{props.hint}</p> : null}
    </article>
  );
}

function BarCompare(props: {
  title: string;
  subtitle: string;
  rows: Array<{ key: string; label: string; value: number; display: string; color: string }>;
}) {
  const max = Math.max(...props.rows.map((r) => r.value), 1);
  return (
    <article className="card dashboard-compare-card">
      <header className="dashboard-compare-head">
        <h3>{props.title}</h3>
        <small>{props.subtitle}</small>
      </header>
      <div className="dashboard-compare-body">
        {props.rows.map((row) => (
          <div key={row.key} className="dashboard-compare-row">
            <div className="dashboard-compare-row-top">
              <span>{row.label}</span>
              <strong>{row.display}</strong>
            </div>
            <div className="dashboard-bar-track dashboard-compare-track">
              <div
                className="dashboard-bar-fill"
                style={{ width: `${Math.max(6, Math.round((row.value / max) * 100))}%`, background: row.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function OverviewPage(props: { token: string; language: AppLanguage; currency: SupportedCurrency }) {
  const [response, setResponse] = useState<KpisResponse | null>(null);
  const [error, setError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => utcMonthKeyFromDate(new Date()));
  const maxMonth = utcMonthKeyFromDate(new Date());
  const viewingPastMonth = selectedMonth !== maxMonth;

  useEffect(() => {
    let active = true;

    const load = async () => {
      setError("");
      setResponse(null);
      try {
        const query = new URLSearchParams();
        query.set("month", selectedMonth);
        const data = await apiRequest<KpisResponse>(`/api/admin/kpis?${query.toString()}`, {}, props.token);
        if (active) {
          setResponse(data);
        }
      } catch (requestError) {
        if (active) {
          setResponse(null);
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
  }, [props.token, selectedMonth]);

  const k = response?.kpis;
  const loadBars =
    k !== undefined
      ? [
          {
            key: "patients",
            label: t(props.language, { es: "Pacientes activos", en: "Active patients", pt: "Pacientes ativos" }),
            value: k.activePatients,
            tone: "var(--brand)"
          },
          {
            key: "pros",
            label: t(props.language, { es: "Profesionales visibles", en: "Visible pros", pt: "Profissionais" }),
            value: Math.max(1, k.activeProfessionals),
            tone: "var(--brand-2)"
          },
          {
            key: "sessions",
            label: t(props.language, { es: "Sesiones confirmadas", en: "Confirmed sessions", pt: "Sessoes confirmadas" }),
            value: k.scheduledSessions,
            tone: "#9d8cf6"
          },
          {
            key: "purchases",
            label: t(props.language, { es: "Compras del mes (#)", en: "Purchases (mo. #)", pt: "Compras (n)" }),
            value: Math.max(1, k.packagePurchasesMonthCount ?? 0),
            tone: "#c9c0fd"
          }
        ]
      : [];
  const maxLoad = Math.max(...loadBars.map((item) => item.value), 1);

  const pkgFee = k?.packagePlatformFeeFromPurchasesMonthCents ?? 0;
  const pkgProNet = k?.packageProfessionalNetFromPurchasesMonthCents ?? 0;
  const grossPkg = k?.packagePurchasesMonthCents ?? 0;
  const grossSess = k?.grossSessionsMonthCents ?? 0;
  const feeSess = k?.platformFeeMonthCents ?? 0;

  return (
    <div className="dashboard-page">
      <header className="dashboard-page-header">
        <div>
          <p className="dashboard-hero-eyebrow">{t(props.language, { es: "Panel ejecutivo", en: "Executive overview", pt: "Painel executivo" })}</p>
          <h1 className="dashboard-page-title">{t(props.language, { es: "Resumen del mes", en: "Month at a glance", pt: "Resumo do mes" })}</h1>
        </div>
        <div className="dashboard-header-controls">
          <div className="dashboard-month-field">
            <input
              className="dashboard-month-input"
              type="month"
              value={selectedMonth}
              max={maxMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              aria-label={t(props.language, { es: "Mes del resumen", en: "Summary month", pt: "Mes do resumo" })}
            />
          </div>
        </div>
      </header>

      {error ? (
        <section className="card">
          <p className="error-text">{error}</p>
        </section>
      ) : null}

      {!response && !error ? (
        <section className="card">
          <p>{t(props.language, { es: "Cargando overview...", en: "Loading overview...", pt: "Carregando visao geral..." })}</p>
        </section>
      ) : null}

      {k === undefined ? null : (
        <>
      <section
        className="dashboard-section dashboard-section--raised dashboard-section--tone-op"
        aria-labelledby="dash-op"
      >
        <h2 id="dash-op" className="dashboard-section-title">
          {t(props.language, { es: "Operación", en: "Operations", pt: "Operacao" })}
        </h2>
        {viewingPastMonth ? (
          <p className="dashboard-section-asof">
            {t(props.language, {
              es: "Estas tres cifras son la foto actual del sistema (no histórico de ese mes). El resto del panel corresponde al mes elegido.",
              en: "These three figures are the current snapshot (not historical for that month). The rest of the panel matches the selected month.",
              pt: "Esses tres numeros sao o estado atual (nao historico do mes). O restante e do mes escolhido."
            })}
          </p>
        ) : null}
        <div className="dashboard-stat-grid dashboard-stat-grid--3">
          <StatCard label={t(props.language, { es: "Pacientes activos", en: "Active patients", pt: "Pacientes ativos" })} value={String(k.activePatients)} />
          <StatCard
            label={t(props.language, { es: "Profesionales visibles", en: "Visible professionals", pt: "Profissionais visiveis" })}
            value={String(k.activeProfessionals)}
          />
          <StatCard
            label={t(props.language, { es: "Sesiones confirmadas", en: "Confirmed sessions", pt: "Sessoes confirmadas" })}
            value={String(k.scheduledSessions)}
          />
        </div>
      </section>

      <section className="dashboard-section dashboard-section--highlight dashboard-section--tone-pkg" aria-labelledby="dash-pkg">
        <h2 id="dash-pkg" className="dashboard-section-title">
          {t(props.language, { es: "Por compra de paquetes (mes)", en: "From package purchases (month)", pt: "Por compra de pacotes (mes)" })}
        </h2>
        <div className="dashboard-stat-grid dashboard-stat-grid--4">
          <StatCard
            label={t(props.language, { es: "Compras registradas", en: "Purchases recorded", pt: "Compras" })}
            value={String(k.packagePurchasesMonthCount ?? 0)}
            hint={t(props.language, { es: "Cantidad de paquetes en el mes", en: "Package count in month", pt: "Quantidade no mes" })}
          />
          <StatCard
            label={t(props.language, { es: "Bruto pacientes", en: "Patient gross", pt: "Bruto pacientes" })}
            value={formatMoneyCents(grossPkg, props.language, props.currency)}
          />
          <StatCard
            variant="accent"
            label={t(props.language, { es: "Comisión plataforma", en: "Platform commission", pt: "Comissao plataforma" })}
            value={formatMoneyCents(pkgFee, props.language, props.currency)}
            hint={t(props.language, { es: "Sobre el paquete vendido", en: "On package sold", pt: "Sobre o pacote" })}
          />
          <StatCard
            label={t(props.language, { es: "A pagar a profesionales", en: "Owed to professionals", pt: "A pagar pros" })}
            value={formatMoneyCents(pkgProNet, props.language, props.currency)}
            hint={t(props.language, { es: "Según reparto al cobrar el paquete", en: "Per split when the package sold", pt: "Parte do pro na venda" })}
          />
        </div>
      </section>

      <section
        className="dashboard-section dashboard-section--raised dashboard-section--tone-viz"
        aria-labelledby="dash-viz"
      >
        <h2 id="dash-viz" className="dashboard-section-title">
          {t(props.language, { es: "Comparativas del mes", en: "Month comparisons", pt: "Comparativas do mes" })}
        </h2>
        <div className="dashboard-chart-grid">
        <BarCompare
          title={t(props.language, { es: "Bruto: paquetes vs sesiones hechas", en: "Gross: packages vs sessions", pt: "Bruto: pacotes vs sessoes" })}
          subtitle={t(props.language, {
            es: "Misma escala relativa dentro del mes",
            en: "Same relative scale for the month",
            pt: "Escala relativa no mes"
          })}
          rows={[
            {
              key: "pkg",
              label: t(props.language, { es: "Ventas paquetes", en: "Package sales", pt: "Vendas pacotes" }),
              value: grossPkg,
              display: formatMoneyCents(grossPkg, props.language, props.currency),
              color: "var(--brand)"
            },
            {
              key: "sess",
              label: t(props.language, { es: "Sesiones completadas", en: "Completed sessions", pt: "Sessoes concluidas" }),
              value: grossSess,
              display: formatMoneyCents(grossSess, props.language, props.currency),
              color: "#c9c0fd"
            }
          ]}
        />
        <BarCompare
          title={t(props.language, { es: "Comisión: paquete vs sesión", en: "Fee: package vs session", pt: "Comissao: pacote vs sessao" })}
          subtitle={t(props.language, {
            es: "Plataforma: cobro del paquete vs devengado por sesión",
            en: "Platform: package sale vs session accrual",
            pt: "Plataforma: venda vs devengado"
          })}
          rows={[
            {
              key: "pf",
              label: t(props.language, { es: "Por compra de paquete", en: "From package purchase", pt: "Na compra do pacote" }),
              value: pkgFee,
              display: formatMoneyCents(pkgFee, props.language, props.currency),
              color: "var(--brand)"
            },
            {
              key: "sf",
              label: t(props.language, { es: "Por sesión completada", en: "From completed session", pt: "Por sessao feita" }),
              value: feeSess,
              display: formatMoneyCents(feeSess, props.language, props.currency),
              color: "#c9c0fd"
            }
          ]}
        />
        </div>
      </section>

      <section
        className="dashboard-section dashboard-section--raised dashboard-section--tone-load"
        aria-labelledby="dash-load"
      >
        <h2 id="dash-load" className="dashboard-section-title">
          {t(props.language, { es: "Carga relativa", en: "Relative load", pt: "Carga relativa" })}
        </h2>
        <article className="card dashboard-chart-card">
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

      <section
        className="dashboard-section dashboard-section--raised dashboard-section--tone-sess"
        aria-labelledby="dash-sess-mo"
      >
        <h2 id="dash-sess-mo" className="dashboard-section-title">
          {t(props.language, { es: "Por sesiones completadas (mes)", en: "From completed sessions (month)", pt: "Por sessoes concluidas (mes)" })}
        </h2>
        <div className="dashboard-stat-grid dashboard-stat-grid--4">
          <StatCard
            label={t(props.language, { es: "Sesiones contabilizadas", en: "Sessions counted", pt: "Sessoes" })}
            value={String(k.completedSessionsMonthCount ?? 0)}
          />
          <StatCard
            label={t(props.language, { es: "Bruto (sesiones)", en: "Gross (sessions)", pt: "Bruto (sessoes)" })}
            value={formatMoneyCents(grossSess, props.language, props.currency)}
          />
          <StatCard
            label={t(props.language, { es: "Comisión (sesiones)", en: "Fee (sessions)", pt: "Comissao (sessoes)" })}
            value={formatMoneyCents(feeSess, props.language, props.currency)}
          />
          <StatCard
            label={t(props.language, { es: "Neto prof. (sesiones)", en: "Pro net (sessions)", pt: "Liquido pro (sessoes)" })}
            value={formatMoneyCents(k.professionalNetMonthCents ?? 0, props.language, props.currency)}
          />
        </div>
      </section>

      <footer className="dashboard-footnote">
        <span className="role-pill">Live</span>
        <span>
          {t(props.language, {
            es: "Finanzas: devengado ejecutado y cobrado.",
            en: "Finance: accrued vs collected.",
            pt: "Financas: devengado e cobrado."
          })}
        </span>
      </footer>
        </>
      )}
    </div>
  );
}

export function AdminDashboardPage(props: { token: string; language: AppLanguage; currency: SupportedCurrency }) {
  return <OverviewPage token={props.token} language={props.language} currency={props.currency} />;
}
