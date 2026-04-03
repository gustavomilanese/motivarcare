import { type AppLanguage, type LocalizedText, type SupportedCurrency, textByLanguage } from "@therapy/i18n-config";
import type { FinanceOverviewResponse } from "../types/finance.types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

interface FinancesKpiGridProps {
  totals: FinanceOverviewResponse["totals"] | null;
  planned: FinanceOverviewResponse["plannedInRange"] | null | undefined;
  language: AppLanguage;
  currency: SupportedCurrency;
  formatMoney: (cents: number, language: AppLanguage, currency: SupportedCurrency) => string;
}

export function FinancesKpiGrid(props: FinancesKpiGridProps) {
  return (
    <div className="finance-kpis-stack">
      <p className="finance-kpis-section-label">
        {t(props.language, {
          es: "Ledger según filtros de la lupa en Resumen: filas monetizadas en el rango elegido.",
          en: "Ledger matches the Resumen search filters: monetized rows in the selected range.",
          pt: "Ledger pelos filtros da lupa em Resumo: linhas monetizadas no intervalo."
        })}
      </p>
      <div className="kpi-grid finance-kpis">
        <article className="kpi-card">
          <h3>{t(props.language, { es: "Sesiones (ledger)", en: "Sessions (ledger)", pt: "Sessoes (ledger)" })}</h3>
          <strong>{props.totals?.sessions ?? 0}</strong>
        </article>
        <article className="kpi-card">
          <h3>{t(props.language, { es: "Brutos", en: "Gross", pt: "Brutos" })}</h3>
          <strong>{props.formatMoney(props.totals?.grossCents ?? 0, props.language, props.currency)}</strong>
        </article>
        <article className="kpi-card">
          <h3>{t(props.language, { es: "Comisión plataforma", en: "Platform fee", pt: "Comissao plataforma" })}</h3>
          <strong>{props.formatMoney(props.totals?.platformFeeCents ?? 0, props.language, props.currency)}</strong>
        </article>
        <article className="kpi-card">
          <h3>{t(props.language, { es: "Neto profesionales", en: "Pro net", pt: "Liquido profissionais" })}</h3>
          <strong>{props.formatMoney(props.totals?.professionalNetCents ?? 0, props.language, props.currency)}</strong>
        </article>
      </div>
      {props.planned ? (
        <>
          <p className="finance-kpis-section-label">
            {t(props.language, {
              es: "Planificado (aprox.): sesiones confirmadas o pedidas con inicio entre las fechas del filtro. Precio lista del profesional y % actual; no refleja trial ni crédito de paquete.",
              en: "Planned (approx.): confirmed or requested sessions starting in the filter range. Pro list price and current %; excludes trial and package credit pricing.",
              pt: "Planejado (aprox.): sessoes com inicio no intervalo. Preco lista e % atual."
            })}
          </p>
          <div className="kpi-grid finance-kpis finance-kpis-planned">
            <article className="kpi-card muted">
              <h3>{t(props.language, { es: "Sesiones abiertas", en: "Open sessions", pt: "Sessoes abertas" })}</h3>
              <strong>{props.planned.sessions}</strong>
            </article>
            <article className="kpi-card muted">
              <h3>{t(props.language, { es: "Bruto potencial", en: "Potential gross", pt: "Bruto potencial" })}</h3>
              <strong>{props.formatMoney(props.planned.grossCents, props.language, props.currency)}</strong>
            </article>
            <article className="kpi-card muted">
              <h3>{t(props.language, { es: "Comisión potencial", en: "Potential fee", pt: "Comissao potencial" })}</h3>
              <strong>{props.formatMoney(props.planned.platformFeeCents, props.language, props.currency)}</strong>
            </article>
            <article className="kpi-card muted">
              <h3>{t(props.language, { es: "Neto pro potencial", en: "Potential pro net", pt: "Liquido pro potencial" })}</h3>
              <strong>{props.formatMoney(props.planned.professionalNetCents, props.language, props.currency)}</strong>
            </article>
          </div>
        </>
      ) : (
        <p className="finance-kpis-section-hint">
          {t(props.language, {
            es: "Definí desde y hasta en la lupa (Resumen) para ver montos planificados en ese rango.",
            en: "Set from/to in the Resumen search dialog to see planned amounts for that range.",
            pt: "Defina o intervalo na lupa (Resumo) para ver valores planejados."
          })}
        </p>
      )}
    </div>
  );
}
