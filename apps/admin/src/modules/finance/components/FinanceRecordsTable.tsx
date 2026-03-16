import type { AppLanguage, SupportedCurrency } from "@therapy/i18n-config";
import type { FinanceOverviewResponse } from "../types/finance.types";

interface FinanceRecordsTableProps {
  records: FinanceOverviewResponse["records"];
  language: AppLanguage;
  currency: SupportedCurrency;
  formatDate: (value: string, language: AppLanguage) => string;
  formatMoney: (cents: number, language: AppLanguage, currency: SupportedCurrency) => string;
}

export function FinanceRecordsTable(props: FinanceRecordsTableProps) {
  return (
    <div className="finance-table-wrap">
      <table className="finance-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Paciente</th>
            <th>Profesional</th>
            <th>Paquete</th>
            <th>Trial</th>
            <th>Bruto</th>
            <th>Plataforma</th>
            <th>Neto profesional</th>
          </tr>
        </thead>
        <tbody>
          {props.records.map((item) => (
            <tr key={item.id}>
              <td>{props.formatDate(item.bookingStartsAt, props.language)}</td>
              <td>{item.patient.fullName}</td>
              <td>{item.professional.fullName}</td>
              <td>{item.package?.name ?? "Sin paquete"}</td>
              <td>{item.isTrial ? "Sí" : "No"}</td>
              <td>{props.formatMoney(item.sessionPriceCents, props.language, props.currency)}</td>
              <td>{props.formatMoney(item.platformFeeCents, props.language, props.currency)}</td>
              <td>{props.formatMoney(item.professionalNetCents, props.language, props.currency)}</td>
            </tr>
          ))}
          {props.records.length === 0 ? (
            <tr>
              <td colSpan={8}>No hay datos para los filtros seleccionados.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
