import type { FinanceFilters, FinanceOverviewResponse } from "../types/finance.types";

interface FinanceOverviewFiltersPanelProps {
  filters: FinanceFilters;
  professionals: FinanceOverviewResponse["byProfessional"];
  patients: FinanceOverviewResponse["byPatient"];
  packages: FinanceOverviewResponse["byPackage"];
  overviewPageSize: number;
  onFilterChange: (next: Partial<FinanceFilters>) => void;
  onPageSizeChange: (nextPageSize: number) => void;
  onApplyQuickRange: (preset: "7d" | "30d" | "month") => void;
  onClearFilters: () => void;
  onApplyFilters: () => void;
}

export function FinanceOverviewFiltersPanel(props: FinanceOverviewFiltersPanelProps) {
  return (
    <section className="card stack ops-panel">
      <header className="toolbar">
        <h3>Filtros de ingresos</h3>
        <div className="toolbar-actions">
          <button className="secondary" type="button" onClick={() => props.onApplyQuickRange("7d")}>Últimos 7 días</button>
          <button className="secondary" type="button" onClick={() => props.onApplyQuickRange("30d")}>Últimos 30 días</button>
          <button className="secondary" type="button" onClick={() => props.onApplyQuickRange("month")}>Mes actual</button>
        </div>
      </header>
      <div className="grid-form">
        <label>Desde<input type="date" value={props.filters.dateFrom} onChange={(event) => props.onFilterChange({ dateFrom: event.target.value })} /></label>
        <label>Hasta<input type="date" value={props.filters.dateTo} onChange={(event) => props.onFilterChange({ dateTo: event.target.value })} /></label>
        <label>
          Profesional
          <select value={props.filters.professionalId} onChange={(event) => props.onFilterChange({ professionalId: event.target.value })}>
            <option value="">Todos</option>
            {props.professionals.map((item) => <option key={item.professionalId} value={item.professionalId}>{item.professionalName}</option>)}
          </select>
        </label>
        <label>
          Paciente
          <select value={props.filters.patientId} onChange={(event) => props.onFilterChange({ patientId: event.target.value })}>
            <option value="">Todos</option>
            {props.patients.map((item) => <option key={item.patientId} value={item.patientId}>{item.patientName}</option>)}
          </select>
        </label>
        <label>
          Paquete
          <select value={props.filters.packageId} onChange={(event) => props.onFilterChange({ packageId: event.target.value })}>
            <option value="">Todos</option>
            {props.packages.map((item) => item.packageId ? <option key={item.packageId} value={item.packageId}>{item.packageName}</option> : null)}
          </select>
        </label>
        <label>
          Trial
          <select value={props.filters.isTrial} onChange={(event) => props.onFilterChange({ isTrial: event.target.value })}>
            <option value="">Todos</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </label>
        <label>
          Estado de sesión
          <select value={props.filters.bookingStatus} onChange={(event) => props.onFilterChange({ bookingStatus: event.target.value })}>
            <option value="">Todos</option>
            <option value="COMPLETED">Completada</option>
            <option value="CONFIRMED">Confirmada</option>
            <option value="CANCELLED">Cancelada</option>
            <option value="REQUESTED">Solicitada</option>
            <option value="NO_SHOW">No show</option>
          </select>
        </label>
        <label>
          Buscar por nombre o email
          <input value={props.filters.search} onChange={(event) => props.onFilterChange({ search: event.target.value })} placeholder="Ej: gustavo@example.com" />
        </label>
        <label>
          Registros por página
          <select value={String(props.overviewPageSize)} onChange={(event) => props.onPageSizeChange(Number(event.target.value))}>
            <option value="20">20</option>
            <option value="30">30</option>
            <option value="50">50</option>
          </select>
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
    </section>
  );
}

