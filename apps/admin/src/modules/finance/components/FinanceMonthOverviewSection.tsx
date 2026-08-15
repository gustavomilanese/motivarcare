import { type AppLanguage, type LocalizedText, replaceTemplate, textByLanguage } from "@therapy/i18n-config";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { formatAdminFinanceUsd } from "../lib/formatAdminFinanceUsd";
import type { KpisResponse } from "../../app/types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatMoneyCents(cents: number, language: AppLanguage): string {
  return formatAdminFinanceUsd(cents, language);
}

function StatCard(props: {
  label: string;
  value: string;
  detail?: string;
  variant?: "default" | "accent";
  to?: string;
}) {
  const className = `dashboard-stat-card${props.variant === "accent" ? " dashboard-stat-card--accent" : ""}${
    props.to ? " dashboard-stat-card--link" : ""
  }`;
  const title = props.detail || undefined;
  const body = (
    <>
      <span className="dashboard-stat-label">{props.label}</span>
      <strong className="dashboard-stat-value">{props.value}</strong>
    </>
  );
  if (props.to) {
    return (
      <Link className={className} to={props.to} title={title}>
        {body}
      </Link>
    );
  }
  return (
    <article className={className} title={title}>
      {body}
    </article>
  );
}

export function FinanceMonthOverviewSection(props: {
  language: AppLanguage;
  viewingPastMonth: boolean;
  /** KPIs mensuales acotados por profesional/paciente (filtros de la lupa). */
  scopedToEntity?: boolean;
  /** Mes UTC `YYYY-MM` del resumen (para deep-links a Finanzas). */
  monthKey?: string;
  kpis: KpisResponse["kpis"] | null;
  loading: boolean;
  error: string | null;
  /** Insertado debajo de «Ingresos del mes» (p. ej. pendientes a pagar). */
  afterRevenue?: ReactNode;
}) {
  const k = props.kpis;
  const monthKey = props.monthKey ?? "";
  const purchasesHref = monthKey
    ? `/finances?platformTab=purchases&month=${encodeURIComponent(monthKey)}`
    : "/finances?platformTab=purchases";

  const grossPkg = k?.packagePurchasesMonthCents ?? 0;
  const trialGross = k?.trialGrossMonthCents ?? 0;
  const trialFee = k?.trialPlatformFeeMonthCents ?? 0;
  const trialNet = k?.trialProfessionalNetMonthCents ?? 0;
  const grossPkgAndTrial = grossPkg + trialGross;
  const feePkgAndTrial = (k?.packagePlatformFeeFromPurchasesMonthCents ?? 0) + trialFee;
  const proNetPkgAndTrial = (k?.packageProfessionalNetFromPurchasesMonthCents ?? 0) + trialNet;

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
                es: "Pacientes y profesionales: estado actual. Ingresos: mes elegido (UTC).",
                en: "Patients and pros: current state. Revenue: selected month (UTC).",
                pt: "Pacientes e pros: estado atual. Receita: mes escolhido (UTC)."
              })}
            </p>
          ) : null}

          {props.scopedToEntity ? (
            <p className="dashboard-section-asof finance-month-asof finance-month-scope-hint">
              {t(props.language, {
                es: "Resumen acotado al profesional o paciente elegido en la lupa.",
                en: "Summary narrowed to the professional or patient from the search filter.",
                pt: "Resumo limitado ao profissional ou paciente da busca."
              })}
            </p>
          ) : null}

          <section className="dashboard-section dashboard-section--highlight dashboard-section--tone-pkg finance-dash-section" aria-labelledby="fin-dash-pkg">
            <h2
              id="fin-dash-pkg"
              className="dashboard-section-title"
              title={t(props.language, {
                es: "Cobros del mes en USD: paquetes comprados + sesiones de prueba.",
                en: "Month collections in USD: package purchases + trial sessions.",
                pt: "Cobranças do mês em USD: pacotes + sessões de teste."
              })}
            >
              {t(props.language, {
                es: "Ingresos del mes",
                en: "Month revenue",
                pt: "Receita do mes"
              })}
            </h2>
            <div className="dashboard-stat-grid dashboard-stat-grid--3">
              <StatCard
                label={t(props.language, { es: "Bruto cobrado", en: "Gross collected", pt: "Bruto cobrado" })}
                value={formatMoneyCents(grossPkgAndTrial, props.language)}
                to={purchasesHref}
                detail={replaceTemplate(
                  t(props.language, {
                    es: "Paquetes {p} · pruebas {t}",
                    en: "Packages {p} · trials {t}",
                    pt: "Pacotes {p} · testes {t}"
                  }),
                  {
                    p: formatMoneyCents(grossPkg, props.language),
                    t: formatMoneyCents(trialGross, props.language)
                  }
                )}
              />
              <StatCard
                variant="accent"
                label={t(props.language, { es: "Comisión MotivarCare", en: "MotivarCare fee", pt: "Comissão MotivarCare" })}
                value={formatMoneyCents(feePkgAndTrial, props.language)}
                to={purchasesHref}
                detail={t(props.language, {
                  es: "Tu parte sobre paquetes y pruebas cobrados este mes",
                  en: "Your cut of packages and trials collected this month",
                  pt: "Sua parte sobre pacotes e testes cobrados neste mês"
                })}
              />
              <StatCard
                label={t(props.language, { es: "Neto profesionales", en: "Pro net", pt: "Líquido profissionais" })}
                value={formatMoneyCents(proNetPkgAndTrial, props.language)}
                to={purchasesHref}
                detail={t(props.language, {
                  es: "Parte de profesionales sobre esos cobros (no es el pendiente a liquidar)",
                  en: "Professionals’ share of those collections (not the unpaid queue)",
                  pt: "Parte dos profissionais dessas cobranças (não é o pendente)"
                })}
              />
            </div>
          </section>

          <section
            className="dashboard-section dashboard-section--raised dashboard-section--tone-op finance-dash-section"
            aria-labelledby="fin-dash-op"
          >
            <h2 id="fin-dash-op" className="dashboard-section-title">
              {t(props.language, { es: "Pacientes y profesionales", en: "Patients and professionals", pt: "Pacientes e profissionais" })}
            </h2>
            <div className="dashboard-stat-grid dashboard-stat-grid--2">
              <StatCard
                label={t(props.language, { es: "Pacientes activos", en: "Active patients", pt: "Pacientes ativos" })}
                value={String(k.activePatients)}
                to="/patients?status=active"
                detail={t(props.language, {
                  es: "Ver pacientes activos",
                  en: "View active patients",
                  pt: "Ver pacientes ativos"
                })}
              />
              <StatCard
                label={t(props.language, { es: "Profesionales", en: "Professionals", pt: "Profissionais" })}
                value={String(k.activeProfessionals)}
                to="/professionals?visible=true"
                detail={t(props.language, {
                  es: "Ver listado de profesionales",
                  en: "View professionals list",
                  pt: "Ver lista de profissionais"
                })}
              />
            </div>
          </section>

          {props.afterRevenue ? (
            <section
              className="dashboard-section finance-dash-section"
              aria-label={t(props.language, {
                es: "Pendiente de pagar a profesionales",
                en: "Pending professional payouts",
                pt: "Pendente de pagar a profissionais"
              })}
            >
              {props.afterRevenue}
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
