import type { AppLanguage, SupportedCurrency } from "@therapy/i18n-config";
import type { FinancePayoutRunDetailResponse } from "../types/finance.types";

interface FinancePayoutRunDetailPanelProps {
  language: AppLanguage;
  currency: SupportedCurrency;
  run: FinancePayoutRunDetailResponse["run"];
  submittingDlocal?: boolean;
  refreshingDlocal?: boolean;
  onCloseDetail: () => void;
  onCloseRun: () => void;
  onMarkLinePaid: (lineId: string) => void;
  onSubmitDlocal: () => void;
  onRefreshDlocal: () => void;
  onRetryLineDlocal: (lineId: string) => void;
  formatMoney: (cents: number, language: AppLanguage, currency: SupportedCurrency) => string;
}

function lineStatusLabel(status: string): string {
  switch (status) {
    case "PAID":
      return "Pagado";
    case "SUBMITTED":
      return "Enviado a dLocal";
    case "FAILED":
      return "Fallido";
    default:
      return "Pendiente";
  }
}

export function FinancePayoutRunDetailPanel(props: FinancePayoutRunDetailPanelProps) {
  const isDraft = props.run.status === "DRAFT";
  const canSubmit = isDraft && props.run.payoutLines.some((line) => line.status === "PENDING" || line.status === "FAILED");

  return (
    <section className="card stack ops-panel">
      <header className="toolbar">
        <h3>Detalle de liquidación {props.run.id}</h3>
        <div className="toolbar-actions">
          <button className="secondary" type="button" onClick={props.onCloseDetail}>
            Cerrar detalle
          </button>
          {isDraft ? (
            <>
              <button
                className="secondary"
                type="button"
                onClick={props.onRefreshDlocal}
                disabled={props.refreshingDlocal}
              >
                {props.refreshingDlocal ? "Actualizando…" : "Refresh dLocal"}
              </button>
              <button
                className="primary"
                type="button"
                onClick={props.onSubmitDlocal}
                disabled={!canSubmit || props.submittingDlocal}
              >
                {props.submittingDlocal ? "Enviando…" : "Enviar a dLocal"}
              </button>
              <button className="secondary" type="button" onClick={props.onCloseRun}>
                Cerrar corrida
              </button>
            </>
          ) : null}
        </div>
      </header>
      <p className="finance-panel-hint">
        dLocal recibe un payout por profesional. El ledger marca Pagado recién cuando el webhook confirma DELIVERED.
      </p>
      <div className="finance-table-wrap">
        <table className="finance-table">
          <thead>
            <tr>
              <th>Profesional</th>
              <th>Sesiones</th>
              <th>Neto (ledger)</th>
              <th>Ready</th>
              <th>Monto local</th>
              <th>Estado</th>
              <th>dLocal</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {props.run.payoutLines.map((line) => (
              <tr key={line.id}>
                <td>
                  <div>{line.professionalName}</div>
                  <small>{line.professionalEmail}</small>
                  {line.submissionError ? (
                    <div>
                      <small style={{ color: "var(--danger, #b00020)" }}>{line.submissionError}</small>
                    </div>
                  ) : null}
                </td>
                <td>{line.sessionsCount}</td>
                <td>{props.formatMoney(line.professionalNetCents, props.language, props.currency)}</td>
                <td>
                  {line.ready ? "Sí" : "No"}
                  {!line.ready && line.readyReason ? (
                    <div>
                      <small>{line.readyReason}</small>
                    </div>
                  ) : null}
                </td>
                <td>
                  {line.estimatedLocal
                    ? `${line.estimatedLocal.amount} ${line.estimatedLocal.currency}`
                    : line.payoutCountry ?? "-"}
                </td>
                <td>{lineStatusLabel(line.status)}</td>
                <td>
                  {line.dlocalPayoutId ? (
                    <div>
                      <code>{line.dlocalPayoutId}</code>
                      <div>
                        <small>{line.dlocalStatus ?? "-"}</small>
                      </div>
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  {isDraft && line.status === "PENDING" ? (
                    <button className="secondary" type="button" onClick={() => props.onMarkLinePaid(line.id)}>
                      Marcar pagado
                    </button>
                  ) : null}
                  {isDraft && line.status === "FAILED" ? (
                    <button className="primary" type="button" onClick={() => props.onRetryLineDlocal(line.id)}>
                      Reintentar dLocal
                    </button>
                  ) : null}
                  {line.status === "SUBMITTED" || line.status === "PAID" ? <span>-</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
