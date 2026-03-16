import type { AppLanguage, SupportedCurrency } from "@therapy/i18n-config";
import type { FinanceOverviewResponse } from "../types/finance.types";

interface FinancesKpiGridProps {
  totals: FinanceOverviewResponse["totals"] | null;
  language: AppLanguage;
  currency: SupportedCurrency;
  formatMoney: (cents: number, language: AppLanguage, currency: SupportedCurrency) => string;
}

export function FinancesKpiGrid(props: FinancesKpiGridProps) {
  return (
    <div className="kpi-grid finance-kpis">
      <article className="kpi-card"><h3>Sesiones</h3><strong>{props.totals?.sessions ?? 0}</strong></article>
      <article className="kpi-card"><h3>Ingresos brutos</h3><strong>{props.formatMoney(props.totals?.grossCents ?? 0, props.language, props.currency)}</strong></article>
      <article className="kpi-card"><h3>Ingreso plataforma</h3><strong>{props.formatMoney(props.totals?.platformFeeCents ?? 0, props.language, props.currency)}</strong></article>
      <article className="kpi-card"><h3>Neto profesionales</h3><strong>{props.formatMoney(props.totals?.professionalNetCents ?? 0, props.language, props.currency)}</strong></article>
    </div>
  );
}
