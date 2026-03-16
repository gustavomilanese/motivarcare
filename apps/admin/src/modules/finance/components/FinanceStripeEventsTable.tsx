import type { AppLanguage } from "@therapy/i18n-config";
import type { FinanceStripeEvent } from "../types/finance.types";
import { FinanceStripeStatusPill } from "./FinanceStripeStatusPill";

interface FinanceStripeEventsTableProps {
  language: AppLanguage;
  events: FinanceStripeEvent[];
  retryingEventId: string;
  onRetry: (eventId: string) => void;
  formatDate: (value: string, language: AppLanguage) => string;
}

export function FinanceStripeEventsTable(props: FinanceStripeEventsTableProps) {
  return (
    <div className="finance-table-wrap">
      <table className="finance-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Evento</th>
            <th>Estado</th>
            <th>Intentos</th>
            <th>Disponible</th>
            <th>Error</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {props.events.map((event) => (
            <tr key={event.id}>
              <td>{props.formatDate(event.createdAt, props.language)}</td>
              <td>{event.eventType}</td>
              <td>
                <FinanceStripeStatusPill status={event.status} />
              </td>
              <td>{event.attempts}</td>
              <td>{props.formatDate(event.availableAt, props.language)}</td>
              <td>{event.errorMessage?.slice(0, 120) ?? "-"}</td>
              <td>
                {event.status === "DEAD_LETTER" ? (
                  <button
                    className="primary"
                    type="button"
                    onClick={() => props.onRetry(event.id)}
                    disabled={props.retryingEventId === event.id}
                  >
                    {props.retryingEventId === event.id ? "Reintentando..." : "Reintentar"}
                  </button>
                ) : (
                  <span>-</span>
                )}
              </td>
            </tr>
          ))}
          {props.events.length === 0 ? (
            <tr>
              <td colSpan={7}>No hay eventos Stripe para este filtro.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

