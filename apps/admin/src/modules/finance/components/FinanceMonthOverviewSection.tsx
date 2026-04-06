import {
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  formatCurrencyCents,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import type { KpisResponse } from "../../app/types";

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

export function FinanceMonthOverviewSection(props: {
  language: AppLanguage;
  currency: SupportedCurrency;
  viewingPastMonth: boolean;
  /** KPIs mensuales acotados por profesional/paciente (filtros de la lupa). */
  scopedToEntity?: boolean;
  kpis: KpisResponse["kpis"] | null;
  loading: boolean;
  error: string | null;
}) {
  const k = props.kpis;

  const grossPkg = k?.packagePurchasesMonthCents ?? 0;
  const trialCount = k?.trialSessionsMonthCount ?? 0;
  const trialGross = k?.trialGrossMonthCents ?? 0;
  const trialFee = k?.trialPlatformFeeMonthCents ?? 0;
  const trialNet = k?.trialProfessionalNetMonthCents ?? 0;
  const grossPkgAndTrial = grossPkg + trialGross;
  const feePkgAndTrial = (k?.packagePlatformFeeFromPurchasesMonthCents ?? 0) + trialFee;
  const proNetPkgAndTrial = (k?.packageProfessionalNetFromPurchasesMonthCents ?? 0) + trialNet;
  const grossSess = k?.grossSessionsMonthCents ?? 0;
  const pkgFee = k?.packagePlatformFeeFromPurchasesMonthCents ?? 0;
  const pkgProNet = k?.packageProfessionalNetFromPurchasesMonthCents ?? 0;
  const feeSess = k?.platformFeeMonthCents ?? 0;

  const loadBars = k
    ? [
        {
          key: "patients",
          label: t(props.language, { es: "Pacientes activos", en: "Active patients", pt: "Pacientes ativos" }),
          value: k.activePatients,
          tone: "var(--brand)" as const
        },
        {
          key: "pros",
          label: t(props.language, { es: "Profesionales visibles", en: "Visible pros", pt: "Profissionais" }),
          value: Math.max(1, k.activeProfessionals),
          tone: "var(--brand-2)" as const
        },
        {
          key: "sessions",
          label: t(props.language, { es: "Sesiones confirmadas (mes)", en: "Confirmed sessions (month)", pt: "Sessoes confirmadas (mes)" }),
          value: k.scheduledSessions,
          tone: "#9d8cf6" as const
        },
        {
          key: "purchases",
          label: t(props.language, { es: "Compras del mes (#)", en: "Purchases (mo. #)", pt: "Compras (n)" }),
          value: Math.max(1, k.packagePurchasesMonthCount ?? 0),
          tone: "#c9c0fd" as const
        }
      ]
    : [];
  const maxLoad = Math.max(...loadBars.map((item) => item.value), 1);

  return (
    <div className="finance-month-overview">
      {props.error ? <p className="error-text finance-month-overview-error">{props.error}</p> : null}
      {props.loading && !k ? (
        <p className="finance-month-overview-loading">
          {t(props.language, { es: "Cargando resumen…", en: "Loading summary…", pt: "Carregando resumo…" })}
        </p>
      ) : null}

      {!k && !props.loading ? null : k ? (
        <>
          {props.viewingPastMonth ? (
            <p className="dashboard-section-asof finance-month-asof">
              {t(props.language, {
                es: "Pacientes y profesionales: estado actual. Sesiones confirmadas, pruebas y paquetes: mes elegido (UTC).",
                en: "Patients and pros: current state. Confirmed sessions, trials and packages: selected month (UTC).",
                pt: "Pacientes e pros: estado atual. Sessoes, provas e pacotes: mes UTC escolhido."
              })}
            </p>
          ) : null}

          {props.scopedToEntity ? (
            <p className="dashboard-section-asof finance-month-asof finance-month-scope-hint">
              {t(props.language, {
                es: "Resumen del mes acotado al profesional o paciente elegido en la lupa (confirmadas del mes; resto de métricas alineadas a esa selección).",
                en: "Month summary is narrowed to the professional or patient from the search filter (confirmed sessions this month; other metrics match that scope).",
                pt: "Resumo do mes limitado ao profissional ou paciente da busca (confirmadas no mes)."
              })}
            </p>
          ) : null}

          <section
            className="dashboard-section dashboard-section--raised dashboard-section--tone-op finance-dash-section"
            aria-labelledby="fin-dash-op"
          >
            <h2 id="fin-dash-op" className="dashboard-section-title">
              {t(props.language, { es: "Operación", en: "Operations", pt: "Operacao" })}
            </h2>
            <div className="dashboard-stat-grid dashboard-stat-grid--3">
              <StatCard label={t(props.language, { es: "Pacientes activos", en: "Active patients", pt: "Pacientes ativos" })} value={String(k.activePatients)} />
              <StatCard
                label={t(props.language, { es: "Profesionales visibles", en: "Visible professionals", pt: "Profissionais visiveis" })}
                value={String(k.activeProfessionals)}
              />
              <StatCard
                label={t(props.language, {
                  es: "Sesiones confirmadas (mes)",
                  en: "Confirmed sessions (month)",
                  pt: "Sessoes confirmadas (mes)"
                })}
                value={String(k.scheduledSessions)}
                hint={t(props.language, {
                  es: "Inicio de la reserva en el mes UTC elegido",
                  en: "Booking start in the selected UTC month",
                  pt: "Inicio no mes UTC escolhido"
                })}
              />
            </div>
          </section>

          <section className="dashboard-section dashboard-section--highlight dashboard-section--tone-pkg finance-dash-section" aria-labelledby="fin-dash-pkg">
            <h2 id="fin-dash-pkg" className="dashboard-section-title">
              {t(props.language, {
                es: "Ingresos del mes: paquetes + sesiones de prueba",
                en: "Month revenue: packages + trial sessions",
                pt: "Receita do mes: pacotes + sessoes de teste"
              })}
            </h2>
            <p className="dashboard-section-asof finance-month-asof" style={{ marginTop: 0 }}>
              {t(props.language, {
                es: "Pruebas: precio de sesión del profesional y % trial de reglas (Finanzas).",
                en: "Trials: pro session price and trial % from finance rules.",
                pt: "Testes: preco do profissional e % trial nas regras."
              })}
            </p>
            <div className="dashboard-stat-grid dashboard-stat-grid--4">
              <StatCard
                label={t(props.language, { es: "Movimientos (#)", en: "Line items (#)", pt: "Linhas (#)" })}
                value={String((k.packagePurchasesMonthCount ?? 0) + trialCount)}
                hint={replaceTemplate(
                  t(props.language, {
                    es: "{pkg} paquetes · {pr} pruebas",
                    en: "{pkg} packages · {pr} trials",
                    pt: "{pkg} pacotes · {pr} provas"
                  }),
                  { pkg: String(k.packagePurchasesMonthCount ?? 0), pr: String(trialCount) }
                )}
              />
              <StatCard
                label={t(props.language, { es: "Bruto pacientes", en: "Patient gross", pt: "Bruto pacientes" })}
                value={formatMoneyCents(grossPkgAndTrial, props.language, props.currency)}
                hint={replaceTemplate(
                  t(props.language, {
                    es: "Paquetes {p} + pruebas {t}",
                    en: "Packages {p} + trials {t}",
                    pt: "Pacotes {p} + provas {t}"
                  }),
                  {
                    p: formatMoneyCents(grossPkg, props.language, props.currency),
                    t: formatMoneyCents(trialGross, props.language, props.currency)
                  }
                )}
              />
              <StatCard
                variant="accent"
                label={t(props.language, { es: "Comisión plataforma", en: "Platform commission", pt: "Comissao plataforma" })}
                value={formatMoneyCents(feePkgAndTrial, props.language, props.currency)}
                hint={t(props.language, {
                  es: "Paquetes + pruebas del mes",
                  en: "Packages + trials in month",
                  pt: "Pacotes + provas"
                })}
              />
              <StatCard
                label={t(props.language, { es: "A pagar a profesionales", en: "Owed to professionals", pt: "A pagar pros" })}
                value={formatMoneyCents(proNetPkgAndTrial, props.language, props.currency)}
                hint={t(props.language, {
                  es: "Reparto paquetes + neto pruebas",
                  en: "Package split + trial net",
                  pt: "Pacotes + liquido provas"
                })}
              />
            </div>
          </section>

          <section className="dashboard-section dashboard-section--raised dashboard-section--tone-viz finance-dash-section" aria-labelledby="fin-dash-viz">
            <h2 id="fin-dash-viz" className="dashboard-section-title">
              {t(props.language, { es: "Comparativas del mes", en: "Month comparisons", pt: "Comparativas do mes" })}
            </h2>
            <div className="dashboard-chart-grid">
              <BarCompare
                title={t(props.language, {
                  es: "Bruto: paquetes, pruebas y sesiones hechas",
                  en: "Gross: packages, trials, completed sessions",
                  pt: "Bruto: pacotes, provas e sessoes"
                })}
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
                    key: "trial",
                    label: t(props.language, { es: "Sesiones de prueba", en: "Trial sessions", pt: "Sessoes de teste" }),
                    value: trialGross,
                    display: formatMoneyCents(trialGross, props.language, props.currency),
                    color: "#7c6ae8"
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
                title={t(props.language, {
                  es: "Comisión: paquete, prueba y sesión",
                  en: "Fee: package, trial, session",
                  pt: "Comissao: pacote, prova e sessao"
                })}
                subtitle={t(props.language, {
                  es: "Plataforma: paquetes, % trial y sesiones contabilizadas",
                  en: "Platform: packages, trial % and counted sessions",
                  pt: "Plataforma: pacotes, trial e sessoes"
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
                    key: "tf",
                    label: t(props.language, { es: "Por sesión de prueba", en: "From trial session", pt: "Por sessao de teste" }),
                    value: trialFee,
                    display: formatMoneyCents(trialFee, props.language, props.currency),
                    color: "#7c6ae8"
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

          <section className="dashboard-section dashboard-section--raised dashboard-section--tone-load finance-dash-section" aria-labelledby="fin-dash-load">
            <h2 id="fin-dash-load" className="dashboard-section-title">
              {t(props.language, { es: "Carga relativa", en: "Relative load", pt: "Carga relativa" })}
            </h2>
            <article className="card dashboard-chart-card">
              <div className="dashboard-bar-chart">
                {loadBars.map((item) => (
                  <div key={item.key} className="dashboard-bar-row">
                    <span>{item.label}</span>
                    <div className="dashboard-bar-track">
                      <div
                        className="dashboard-bar-fill"
                        style={{ width: `${Math.max(10, Math.round((item.value / maxLoad) * 100))}%`, background: item.tone }}
                      />
                    </div>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <details className="dashboard-section dashboard-section--raised dashboard-section--tone-sess dashboard-details finance-dash-section">
            <summary className="dashboard-details-summary">
              <span className="dashboard-collapsible-heading">
                <h2 className="dashboard-section-title">
                  {t(props.language, { es: "Por sesiones completadas (mes)", en: "From completed sessions (month)", pt: "Por sessoes concluidas (mes)" })}
                </h2>
              </span>
              <span className="dashboard-details-chevron" aria-hidden />
            </summary>
            <div className="dashboard-details-body">
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
            </div>
          </details>
        </>
      ) : null}
    </div>
  );
}
