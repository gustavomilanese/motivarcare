import type { AppLanguage } from "@therapy/i18n-config";
import type { FinanceStripeEvent, FinanceStripeFilters, FinanceStripeOpsSummary } from "../types/finance.types";
import { FinanceStripeEventsTable } from "./FinanceStripeEventsTable";
import { FinanceStripeKpiGrid } from "./FinanceStripeKpiGrid";

interface FinanceStripeOperationsPanelProps {
  language: AppLanguage;
  filters: FinanceStripeFilters;
  summary: FinanceStripeOpsSummary | null;
  events: FinanceStripeEvent[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalEvents: number;
  retryingEventId: string;
  onFilterChange: (next: Partial<FinanceStripeFilters>) => void;
  onPageSizeChange: (nextPageSize: number) => void;
  onRefresh: () => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  onRetry: (eventId: string) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  formatDate: (value: string, language: AppLanguage) => string;
}

export function FinanceStripeOperationsPanel(props: FinanceStripeOperationsPanelProps) {
  return (
    <section className="card stack ops-panel">
      <header className="toolbar">
        <h3>Operación Stripe (webhooks)</h3>
        <div className="toolbar-actions">
          <label className="finance-inline-field">
            Estado
            <select value={props.filters.status} onChange={(event) => props.onFilterChange({ status: event.target.value })}>
              <option value="">Todos</option>
              <option value="PENDING">Pendiente</option>
              <option value="PROCESSING">Procesando</option>
              <option value="PROCESSED">Procesado</option>
              <option value="DEAD_LETTER">Error (dead letter)</option>
            </select>
          </label>
          <label className="finance-inline-field">
            Por página
            <select value={String(props.pageSize)} onChange={(event) => props.onPageSizeChange(Number(event.target.value))}>
              <option value="8">8</option>
              <option value="12">12</option>
              <option value="20">20</option>
            </select>
          </label>
          <button className="secondary" type="button" onClick={props.onRefresh}>
            Actualizar
          </button>
        </div>
      </header>

      <FinanceStripeKpiGrid summary={props.summary} />

      <div className="grid-form">
        <label>
          Desde
          <input type="date" value={props.filters.dateFrom} onChange={(event) => props.onFilterChange({ dateFrom: event.target.value })} />
        </label>
        <label>
          Hasta
          <input type="date" value={props.filters.dateTo} onChange={(event) => props.onFilterChange({ dateTo: event.target.value })} />
        </label>
        <label>
          Buscar por evento / id / error
          <input
            value={props.filters.search}
            onChange={(event) => props.onFilterChange({ search: event.target.value })}
            placeholder="Ej: stripe.checkout.session.completed"
          />
        </label>
      </div>

      <div className="toolbar-actions">
        <button className="secondary" type="button" onClick={props.onClearFilters}>
          Limpiar filtros
        </button>
        <button className="primary" type="button" onClick={props.onApplyFilters}>
          Aplicar filtros
        </button>
      </div>

      <div className="finance-subcaption">
        {props.summary?.oldestPendingCreatedAt
          ? `Pendiente más antiguo: ${props.formatDate(props.summary.oldestPendingCreatedAt, props.language)}`
          : "No hay webhooks pendientes en este momento."}
      </div>

      <FinanceStripeEventsTable
        language={props.language}
        events={props.events}
        retryingEventId={props.retryingEventId}
        onRetry={props.onRetry}
        formatDate={props.formatDate}
      />

      <div className="toolbar-actions">
        <button className="secondary" type="button" disabled={props.page <= 1} onClick={props.onPreviousPage}>
          Anterior
        </button>
        <span className="finance-pagination-caption">
          Página {props.page} de {props.totalPages} · {props.totalEvents} eventos
        </span>
        <button className="secondary" type="button" disabled={props.page >= props.totalPages} onClick={props.onNextPage}>
          Siguiente
        </button>
      </div>
    </section>
  );
}

