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

function IconCalendar() {
  return (
    <svg className="finance-filters-legend-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3 10h18M8 3v4M16 3v4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconPeople() {
  return (
    <svg className="finance-filters-legend-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4 20v-1a4 4 0 014-4h2a4 4 0 014 4v1" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M21 20v-0.5a3.5 3.5 0 00-3.5-3.5h-.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconSession() {
  return (
    <svg className="finance-filters-legend-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path d="M4 6h16M4 12h10M4 18h7" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="18" cy="15" r="3" fill="none" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg className="finance-filters-search-glyph" width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-4.2-4.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function FinanceOverviewFiltersPanel(props: FinanceOverviewFiltersPanelProps) {
  return (
    <div className="finance-filters-compact" role="search">
      <div className="finance-filters-search-wrap">
        <IconSearch />
        <input
          className="finance-filters-search-input"
          type="search"
          value={props.filters.search}
          onChange={(event) => props.onFilterChange({ search: event.target.value })}
          placeholder="Buscar por nombre o email…"
          aria-label="Buscar por nombre o email"
          autoComplete="off"
        />
      </div>

      <fieldset className="finance-filters-group">
        <legend className="finance-filters-legend">
          <IconCalendar />
          <span>Período</span>
        </legend>
        <div className="finance-filters-period-row" role="group" aria-label="Período e intervalo">
          <div className="finance-filters-period-chips">
            <button className="finance-filters-chip" type="button" onClick={() => props.onApplyQuickRange("7d")}>
              7 días
            </button>
            <button className="finance-filters-chip" type="button" onClick={() => props.onApplyQuickRange("30d")}>
              30 días
            </button>
            <button className="finance-filters-chip" type="button" onClick={() => props.onApplyQuickRange("month")}>
              Este mes
            </button>
          </div>
          <div className="finance-filters-period-dates">
            <label className="finance-filters-field">
              <span className="finance-filters-field-label">Desde</span>
              <input type="date" value={props.filters.dateFrom} onChange={(event) => props.onFilterChange({ dateFrom: event.target.value })} />
            </label>
            <label className="finance-filters-field">
              <span className="finance-filters-field-label">Hasta</span>
              <input type="date" value={props.filters.dateTo} onChange={(event) => props.onFilterChange({ dateTo: event.target.value })} />
            </label>
          </div>
        </div>
      </fieldset>

      <fieldset className="finance-filters-group">
        <legend className="finance-filters-legend">
          <IconPeople />
          <span>Ámbito</span>
        </legend>
        <div className="finance-filters-entity-grid">
          <label className="finance-filters-field">
            <span className="finance-filters-field-label">Profesional</span>
            <select value={props.filters.professionalId} onChange={(event) => props.onFilterChange({ professionalId: event.target.value })}>
              <option value="">Todos</option>
              {props.professionals.map((item) => (
                <option key={item.professionalId} value={item.professionalId}>
                  {item.professionalName}
                </option>
              ))}
            </select>
          </label>
          <label className="finance-filters-field">
            <span className="finance-filters-field-label">Paciente</span>
            <select value={props.filters.patientId} onChange={(event) => props.onFilterChange({ patientId: event.target.value })}>
              <option value="">Todos</option>
              {props.patients.map((item) => (
                <option key={item.patientId} value={item.patientId}>
                  {item.patientName}
                </option>
              ))}
            </select>
          </label>
          <label className="finance-filters-field">
            <span className="finance-filters-field-label">Paquete</span>
            <select value={props.filters.packageId} onChange={(event) => props.onFilterChange({ packageId: event.target.value })}>
              <option value="">Todos</option>
              {props.packages.map((item) => (item.packageId ? <option key={item.packageId} value={item.packageId}>{item.packageName}</option> : null))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="finance-filters-group">
        <legend className="finance-filters-legend">
          <IconSession />
          <span>Sesión</span>
        </legend>
        <div className="finance-filters-session-row">
          <label className="finance-filters-field">
            <span className="finance-filters-field-label">Trial</span>
            <select value={props.filters.isTrial} onChange={(event) => props.onFilterChange({ isTrial: event.target.value })}>
              <option value="">Cualquiera</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="finance-filters-field">
            <span className="finance-filters-field-label">Estado</span>
            <select value={props.filters.bookingStatus} onChange={(event) => props.onFilterChange({ bookingStatus: event.target.value })}>
              <option value="">Cualquiera</option>
              <option value="COMPLETED">Completada</option>
              <option value="CONFIRMED">Confirmada</option>
              <option value="CANCELLED">Cancelada</option>
              <option value="REQUESTED">Solicitada</option>
              <option value="NO_SHOW">No show</option>
            </select>
          </label>
        </div>
      </fieldset>

      <div className="finance-filters-footer">
        <div className="finance-filters-footer-meta">
          <span className="finance-filters-footer-meta-label">Por página</span>
          <div className="finance-filters-segmented" role="group" aria-label="Registros por página">
            {([20, 30, 50] as const).map((n) => (
              <button
                key={n}
                type="button"
                className={props.overviewPageSize === n ? "is-selected" : ""}
                onClick={() => props.onPageSizeChange(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="finance-filters-footer-actions">
          <button className="secondary" type="button" onClick={props.onClearFilters}>
            Limpiar
          </button>
          <button className="primary" type="button" onClick={props.onApplyFilters}>
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
