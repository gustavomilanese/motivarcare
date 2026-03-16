import type { AppLanguage, SupportedCurrency } from "@therapy/i18n-config";
import type { FinanceOverviewResponse } from "../types/finance.types";
import { FinanceRecordsTable } from "./FinanceRecordsTable";

interface FinanceMonetizedSessionsPanelProps {
  language: AppLanguage;
  currency: SupportedCurrency;
  records: FinanceOverviewResponse["records"];
  total: number;
  page: number;
  totalPages: number;
  error: string;
  success: string;
  onPreviousPage: () => void;
  onNextPage: () => void;
  formatDate: (value: string, language: AppLanguage) => string;
  formatMoney: (cents: number, language: AppLanguage, currency: SupportedCurrency) => string;
}

export function FinanceMonetizedSessionsPanel(props: FinanceMonetizedSessionsPanelProps) {
  return (
    <section className="card stack ops-panel">
      <h3>Sesiones monetizadas</h3>
      {props.error ? <p className="error-text">{props.error}</p> : null}
      {props.success ? <p className="success-text">{props.success}</p> : null}
      <FinanceRecordsTable
        records={props.records}
        language={props.language}
        currency={props.currency}
        formatDate={props.formatDate}
        formatMoney={props.formatMoney}
      />
      <div className="toolbar-actions">
        <button className="secondary" type="button" disabled={props.page <= 1} onClick={props.onPreviousPage}>
          Anterior
        </button>
        <span className="finance-pagination-caption">Página {props.page} de {props.totalPages} · {props.total} registros</span>
        <button className="secondary" type="button" disabled={props.page >= props.totalPages} onClick={props.onNextPage}>
          Siguiente
        </button>
      </div>
    </section>
  );
}

