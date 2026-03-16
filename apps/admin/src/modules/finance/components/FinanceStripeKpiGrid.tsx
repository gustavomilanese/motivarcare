import type { FinanceStripeOpsSummary } from "../types/finance.types";

interface FinanceStripeKpiGridProps {
  summary: FinanceStripeOpsSummary | null;
}

export function FinanceStripeKpiGrid(props: FinanceStripeKpiGridProps) {
  return (
    <div className="finance-stripe-kpis">
      <article className="finance-stripe-kpi">
        <small>Pendientes</small>
        <strong>{props.summary?.pending ?? 0}</strong>
      </article>
      <article className="finance-stripe-kpi">
        <small>Procesando</small>
        <strong>{props.summary?.processing ?? 0}</strong>
      </article>
      <article className="finance-stripe-kpi">
        <small>Procesados</small>
        <strong>{props.summary?.processed ?? 0}</strong>
      </article>
      <article className="finance-stripe-kpi">
        <small>Con error</small>
        <strong>{props.summary?.deadLetter ?? 0}</strong>
      </article>
    </div>
  );
}

