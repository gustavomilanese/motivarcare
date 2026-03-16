import type { AppLanguage, SupportedCurrency } from "@therapy/i18n-config";
import type { CreatePayoutDraft, FinancePayoutRunSummary } from "../types/finance.types";

interface FinancePayoutRunsPanelProps {
  language: AppLanguage;
  currency: SupportedCurrency;
  payoutStatusFilter: string;
  payoutPageSize: number;
  payoutPage: number;
  payoutTotalPages: number;
  createPayoutDraft: CreatePayoutDraft;
  creatingRun: boolean;
  payoutRuns: FinancePayoutRunSummary[];
  onPayoutStatusFilterChange: (value: string) => void;
  onPayoutPageSizeChange: (nextPageSize: number) => void;
  onRefreshRuns: () => void;
  onDraftChange: (next: Partial<CreatePayoutDraft>) => void;
  onCreateRun: () => void;
  onViewRunDetail: (runId: string) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  formatDate: (value: string, language: AppLanguage) => string;
  formatMoney: (cents: number, language: AppLanguage, currency: SupportedCurrency) => string;
}

export function FinancePayoutRunsPanel(props: FinancePayoutRunsPanelProps) {
  return (
    <section className="card stack ops-panel">
      <header className="toolbar">
        <h3>Liquidaciones a profesionales</h3>
        <div className="toolbar-actions">
          <label className="finance-inline-field">
            Estado
            <select value={props.payoutStatusFilter} onChange={(event) => props.onPayoutStatusFilterChange(event.target.value)}>
              <option value="">Todos</option>
              <option value="DRAFT">Borrador</option>
              <option value="CLOSED">Cerrada</option>
            </select>
          </label>
          <label className="finance-inline-field">
            Por página
            <select value={String(props.payoutPageSize)} onChange={(event) => props.onPayoutPageSizeChange(Number(event.target.value))}>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="40">40</option>
            </select>
          </label>
          <button className="secondary" type="button" onClick={props.onRefreshRuns}>
            Aplicar
          </button>
        </div>
      </header>
      <div className="grid-form">
        <label>
          Desde
          <input type="date" value={props.createPayoutDraft.periodStart} onChange={(event) => props.onDraftChange({ periodStart: event.target.value })} />
        </label>
        <label>
          Hasta
          <input type="date" value={props.createPayoutDraft.periodEnd} onChange={(event) => props.onDraftChange({ periodEnd: event.target.value })} />
        </label>
        <label>
          Notas internas
          <input value={props.createPayoutDraft.notes} onChange={(event) => props.onDraftChange({ notes: event.target.value })} placeholder="Ej: liquidación quincena 1" />
        </label>
      </div>
      <div className="toolbar-actions">
        <button className="primary" type="button" onClick={props.onCreateRun} disabled={props.creatingRun}>
          {props.creatingRun ? "Creando..." : "Crear corrida de liquidación"}
        </button>
      </div>
      <div className="finance-table-wrap">
        <table className="finance-table">
          <thead>
            <tr>
              <th>Periodo</th>
              <th>Estado</th>
              <th>Neto total</th>
              <th>Líneas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {props.payoutRuns.map((run) => (
              <tr key={run.id}>
                <td>{props.formatDate(run.periodStart, props.language)} - {props.formatDate(run.periodEnd, props.language)}</td>
                <td>{run.status === "DRAFT" ? "Borrador" : "Cerrada"}</td>
                <td>{props.formatMoney(run.totalNetCents, props.language, props.currency)}</td>
                <td>{run.payoutLinesCount}</td>
                <td>
                  <button className="secondary" type="button" onClick={() => props.onViewRunDetail(run.id)}>Ver detalle</button>
                </td>
              </tr>
            ))}
            {props.payoutRuns.length === 0 ? (
              <tr><td colSpan={5}>Todavía no hay corridas de liquidación.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="toolbar-actions">
        <button className="secondary" type="button" disabled={props.payoutPage <= 1} onClick={props.onPreviousPage}>
          Anterior
        </button>
        <span className="finance-pagination-caption">Página {props.payoutPage} de {props.payoutTotalPages}</span>
        <button className="secondary" type="button" disabled={props.payoutPage >= props.payoutTotalPages} onClick={props.onNextPage}>
          Siguiente
        </button>
      </div>
    </section>
  );
}

