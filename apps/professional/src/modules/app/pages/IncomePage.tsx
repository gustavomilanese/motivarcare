import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  formatCurrencyCents,
  formatDateWithLocale,
  textByLanguage
} from "@therapy/i18n-config";
import { formatRecordedFinanceMinor } from "../lib/formatRecordedFinanceMinor";
import {
  buildProfessionalStatsQuery,
  type RevenuePreset,
  ymLocal,
  ymdLocal
} from "../lib/professionalStatsRangeQuery";
import { professionalSurfaceMessage } from "../lib/friendlyProfessionalSurfaceMessages";
import { apiRequest } from "../services/api";
import type { EarningsResponse } from "../types";

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

function formatMoneyCents(cents: number, language: AppLanguage, currency: SupportedCurrency): string {
  return formatCurrencyCents({
    centsInUsd: cents,
    language,
    currency,
    maximumFractionDigits: 0
  });
}

export function IncomePage(props: { token: string; language: AppLanguage; currency: SupportedCurrency }) {
  const [searchParams] = useSearchParams();
  const filterPatientId = searchParams.get("patientId")?.trim() || "";
  const [data, setData] = useState<EarningsResponse | null>(null);
  const [error, setError] = useState("");
  const [revenuePreset, setRevenuePreset] = useState<RevenuePreset>("month");
  const [revenueDay, setRevenueDay] = useState(() => ymdLocal(new Date()));
  const [revenueMonth, setRevenueMonth] = useState(() => ymLocal(new Date()));
  const [revenueYear, setRevenueYear] = useState(() => String(new Date().getFullYear()));

  const statsQuery = useMemo(() => {
    const base = buildProfessionalStatsQuery(revenuePreset, revenueDay, revenueMonth, revenueYear);
    if (!filterPatientId) {
      return base;
    }
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}patientId=${encodeURIComponent(filterPatientId)}`;
  }, [revenuePreset, revenueDay, revenueMonth, revenueYear, filterPatientId]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await apiRequest<EarningsResponse>(`/api/professional/earnings${statsQuery}`, props.token);
        if (active) {
          setData(response);
          setError("");
        }
      } catch (requestError) {
        if (active) {
          const raw = requestError instanceof Error ? requestError.message : "";
          setError(professionalSurfaceMessage("income-load", props.language, raw));
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [props.token, statsQuery, props.language]);

  const earningsSummaryBlocks = data?.summaryByCurrency ?? [];

  return (
    <div className="pro-grid-stack">
      {filterPatientId ? (
        <div className="pro-income-patient-filter-banner" role="status">
          <p>
            {t(props.language, {
              es: "Mostrando solo movimientos de un paciente.",
              en: "Showing movements for one patient only.",
              pt: "Mostrando apenas movimentos de um paciente."
            })}{" "}
            <Link to="/ingresos">{t(props.language, { es: "Ver todos", en: "View all", pt: "Ver todos" })}</Link>
          </p>
        </div>
      ) : null}
      <section className="pro-card pro-dashboard-revenue" aria-labelledby="pro-income-heading">
        <div className="pro-dashboard-revenue-top-row pro-dashboard-revenue-top-row--with-lead">
          <div className="pro-dashboard-revenue-head">
            <h2 id="pro-income-heading" className="pro-dashboard-revenue-title">
              {t(props.language, { es: "Ingresos", en: "Earnings", pt: "Receitas" })}
            </h2>
            <p className="pro-dashboard-revenue-lead">
              {t(props.language, {
                es: "Mismos criterios que el dashboard: sesiones completadas y precio efectivo por paquete o lista.",
                en: "Same rules as the dashboard: completed sessions and effective price per package or list rate.",
                pt: "Mesmos criterios do dashboard: sessoes concluidas e preco efetivo por pacote ou tabela."
              })}
            </p>
          </div>
          <div className="pro-dashboard-revenue-toolbar" role="group" aria-label={t(props.language, { es: "Periodo", en: "Period", pt: "Periodo" })}>
          <label className="pro-dashboard-revenue-field">
            <span>{t(props.language, { es: "Vista", en: "View", pt: "Vista" })}</span>
            <select value={revenuePreset} onChange={(event) => setRevenuePreset(event.target.value as RevenuePreset)}>
              <option value="day">{t(props.language, { es: "Día", en: "Day", pt: "Dia" })}</option>
              <option value="week">{t(props.language, { es: "Semana", en: "Week", pt: "Semana" })}</option>
              <option value="month">{t(props.language, { es: "Mes", en: "Month", pt: "Mes" })}</option>
              <option value="year">{t(props.language, { es: "Año", en: "Year", pt: "Ano" })}</option>
              <option value="all">{t(props.language, { es: "Todo el historial", en: "All time", pt: "Todo o historico" })}</option>
            </select>
          </label>
          {revenuePreset === "day" || revenuePreset === "week" ? (
            <label className="pro-dashboard-revenue-field">
              <span>
                {revenuePreset === "week"
                  ? t(props.language, { es: "Semana que incluye", en: "Week including", pt: "Semana que inclui" })
                  : t(props.language, { es: "Fecha", en: "Date", pt: "Data" })}
              </span>
              <input type="date" value={revenueDay} onChange={(event) => setRevenueDay(event.target.value)} />
            </label>
          ) : null}
          {revenuePreset === "month" ? (
            <label className="pro-dashboard-revenue-field">
              <span>{t(props.language, { es: "Mes", en: "Month", pt: "Mes" })}</span>
              <input type="month" value={revenueMonth} onChange={(event) => setRevenueMonth(event.target.value)} />
            </label>
          ) : null}
          {revenuePreset === "year" ? (
            <label className="pro-dashboard-revenue-field">
              <span>{t(props.language, { es: "Año", en: "Year", pt: "Ano" })}</span>
              <input
                type="number"
                min={2020}
                max={2035}
                value={revenueYear}
                onChange={(event) => setRevenueYear(event.target.value)}
              />
            </label>
          ) : null}
          </div>
        </div>

        {error ? <p className="pro-error">{error}</p> : null}

        {!data ? (
          <p>{t(props.language, { es: "Cargando...", en: "Loading...", pt: "Carregando..." })}</p>
        ) : (
          <>
            {earningsSummaryBlocks.length > 0 ? (
              earningsSummaryBlocks.map((block) => (
                <div key={block.currency}>
                  {earningsSummaryBlocks.length > 1 ? (
                    <p className="pro-muted" style={{ marginBottom: "0.5rem" }}>
                      {block.currency.toUpperCase()}
                    </p>
                  ) : null}
                  <div className="pro-kpi-grid pro-kpi-grid--revenue">
                    <article className="pro-kpi-card">
                      <span>{t(props.language, { es: "Ingresos brutos", en: "Gross revenue", pt: "Receita bruta" })}</span>
                      <strong>{formatRecordedFinanceMinor(block.grossCents, block.currency, props.language)}</strong>
                      <small className="pro-kpi-card-hint">
                        {t(props.language, { es: "En el período seleccionado.", en: "In the selected period.", pt: "No periodo selecionado." })}
                      </small>
                    </article>
                    <article className="pro-kpi-card">
                      <span>{t(props.language, { es: "Comisión plataforma", en: "Platform commission", pt: "Comissao da plataforma" })}</span>
                      <strong>{formatRecordedFinanceMinor(block.platformFeeCents, block.currency, props.language)}</strong>
                      <small className="pro-kpi-card-hint">
                        {t(props.language, { es: "Retenida por MotivarCare.", en: "Retained by MotivarCare.", pt: "Retida pelo MotivarCare." })}
                      </small>
                    </article>
                    <article className="pro-kpi-card">
                      <span>{t(props.language, { es: "Tu parte (período)", en: "Your share (period)", pt: "Sua parte (periodo)" })}</span>
                      <strong>{formatRecordedFinanceMinor(block.professionalNetCents, block.currency, props.language)}</strong>
                      <small className="pro-kpi-card-hint">
                        {t(props.language, {
                          es: `${block.sessions} sesiones · promedio ${formatRecordedFinanceMinor(block.averageNetPerSessionCents, block.currency, props.language)}`,
                          en: `${block.sessions} sessions · avg ${formatRecordedFinanceMinor(block.averageNetPerSessionCents, block.currency, props.language)}`,
                          pt: `${block.sessions} sessoes · media ${formatRecordedFinanceMinor(block.averageNetPerSessionCents, block.currency, props.language)}`
                        })}
                      </small>
                    </article>
                  </div>
                </div>
              ))
            ) : (
              <div className="pro-kpi-grid pro-kpi-grid--revenue">
                <article className="pro-kpi-card">
                  <span>{t(props.language, { es: "Ingresos brutos", en: "Gross revenue", pt: "Receita bruta" })}</span>
                  <strong>{formatMoneyCents(data.summary.grossCents, props.language, props.currency)}</strong>
                  <small className="pro-kpi-card-hint">
                    {t(props.language, { es: "En el período seleccionado.", en: "In the selected period.", pt: "No periodo selecionado." })}
                  </small>
                </article>
                <article className="pro-kpi-card">
                  <span>{t(props.language, { es: "Comisión plataforma", en: "Platform commission", pt: "Comissao da plataforma" })}</span>
                  <strong>{formatMoneyCents(data.summary.platformFeeCents, props.language, props.currency)}</strong>
                  <small className="pro-kpi-card-hint">
                    {t(props.language, { es: "Retenida por MotivarCare.", en: "Retained by MotivarCare.", pt: "Retida pelo MotivarCare." })}
                  </small>
                </article>
                <article className="pro-kpi-card">
                  <span>{t(props.language, { es: "Tu parte (período)", en: "Your share (period)", pt: "Sua parte (periodo)" })}</span>
                  <strong>{formatMoneyCents(data.summary.professionalNetCents, props.language, props.currency)}</strong>
                  <small className="pro-kpi-card-hint">
                    {t(props.language, {
                      es: `${data.summary.completedSessions} sesiones · promedio ${formatMoneyCents(data.summary.averageNetPerSessionCents, props.language, props.currency)}`,
                      en: `${data.summary.completedSessions} sessions · avg ${formatMoneyCents(data.summary.averageNetPerSessionCents, props.language, props.currency)}`,
                      pt: `${data.summary.completedSessions} sessoes · media ${formatMoneyCents(data.summary.averageNetPerSessionCents, props.language, props.currency)}`
                    })}
                  </small>
                </article>
              </div>
            )}
            <p className="pro-income-lifetime-hint">
              {data.lifetimeByCurrency && data.lifetimeByCurrency.length > 0
                ? t(props.language, {
                    es: `Historial completo (neto): ${data.lifetimeByCurrency
                      .map(
                        (row) =>
                          `${row.currency.toUpperCase()}: ${formatRecordedFinanceMinor(row.professionalNetCents, row.currency, props.language)} · ${row.sessions} ses.`
                      )
                      .join(" · ")}`,
                    en: `All-time net: ${data.lifetimeByCurrency
                      .map(
                        (row) =>
                          `${row.currency.toUpperCase()}: ${formatRecordedFinanceMinor(row.professionalNetCents, row.currency, props.language)} · ${row.sessions} sess.`
                      )
                      .join(" · ")}`,
                    pt: `Historico liquido: ${data.lifetimeByCurrency
                      .map(
                        (row) =>
                          `${row.currency.toUpperCase()}: ${formatRecordedFinanceMinor(row.professionalNetCents, row.currency, props.language)} · ${row.sessions} sess.`
                      )
                      .join(" · ")}`
                  })
                : t(props.language, {
                    es: `Historial completo (neto acumulado): ${formatMoneyCents(data.summary.lifetimeProfessionalNetCents, props.language, props.currency)} · ${data.summary.lifetimeCompletedSessions} sesiones.`,
                    en: `All-time net total: ${formatMoneyCents(data.summary.lifetimeProfessionalNetCents, props.language, props.currency)} · ${data.summary.lifetimeCompletedSessions} sessions.`,
                    pt: `Historico liquido total: ${formatMoneyCents(data.summary.lifetimeProfessionalNetCents, props.language, props.currency)} · ${data.summary.lifetimeCompletedSessions} sessoes.`
                  })}
            </p>
          </>
        )}
      </section>

      <section className="pro-card income-details-card">
        <h2>{t(props.language, { es: "Movimientos en el período", en: "Movements in period", pt: "Movimentos no periodo" })}</h2>
        {!data ? null : data.movements.length === 0 ? (
          <p>{t(props.language, { es: "Sin sesiones completadas en este período.", en: "No completed sessions in this period.", pt: "Sem sessoes concluidas neste periodo." })}</p>
        ) : (
          <ul className="pro-list pro-list--income">
            {data.movements.map((movement) => (
              <li key={movement.bookingId}>
                <div>
                  <strong>{movement.patientName}</strong>
                  <span>{formatDateTime(movement.startsAt, props.language)}</span>
                </div>
                <div className="pro-income-movement-amounts">
                  <span>
                    {t(props.language, { es: "Bruto", en: "Gross", pt: "Bruto" })}{" "}
                    {formatRecordedFinanceMinor(movement.grossCents, movement.currency, props.language)}
                  </span>
                  <span>
                    {t(props.language, { es: "Comisión", en: "Fee", pt: "Comissao" })}{" "}
                    {formatRecordedFinanceMinor(movement.platformFeeCents, movement.currency, props.language)}
                  </span>
                  <span className="pro-income-movement-net">
                    {t(props.language, { es: "Neto", en: "Net", pt: "Liquido" })}{" "}
                    <strong>{formatRecordedFinanceMinor(movement.amountCents, movement.currency, props.language)}</strong>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
