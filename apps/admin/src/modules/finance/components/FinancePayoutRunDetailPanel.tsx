import type { AppLanguage, SupportedCurrency } from "@therapy/i18n-config";
import type { FinancePayoutRunDetailResponse } from "../types/finance.types";

interface FinancePayoutRunDetailPanelProps {
  language: AppLanguage;
  currency: SupportedCurrency;
  run: FinancePayoutRunDetailResponse["run"];
  onCloseDetail: () => void;
  onCloseRun: () => void;
  onMarkLinePaid: (lineId: string) => void;
  formatMoney: (cents: number, language: AppLanguage, currency: SupportedCurrency) => string;
}

export function FinancePayoutRunDetailPanel(props: FinancePayoutRunDetailPanelProps) {
  return (
    <section className="card stack ops-panel">
      <header className="toolbar">
        <h3>Detalle de liquidación {props.run.id}</h3>
        <div className="toolbar-actions">
          <button className="secondary" type="button" onClick={props.onCloseDetail}>Cerrar detalle</button>
          {props.run.status === "DRAFT" ? (
            <button className="primary" type="button" onClick={props.onCloseRun}>Cerrar corrida</button>
          ) : null}
        </div>
      </header>
      <div className="finance-table-wrap">
        <table className="finance-table">
          <thead>
            <tr>
              <th>Profesional</th>
              <th>Sesiones</th>
              <th>Neto</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {props.run.payoutLines.map((line) => (
              <tr key={line.id}>
                <td>{line.professionalName}</td>
                <td>{line.sessionsCount}</td>
                <td>{props.formatMoney(line.professionalNetCents, props.language, props.currency)}</td>
                <td>{line.status === "PENDING" ? "Pendiente" : "Pagado"}</td>
                <td>
                  {line.status === "PENDING" && props.run.status === "DRAFT" ? (
                    <button className="primary" type="button" onClick={() => props.onMarkLinePaid(line.id)}>Marcar pagado</button>
                  ) : <span>-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

