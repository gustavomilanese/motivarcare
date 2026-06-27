import { useCallback, useEffect, useState } from "react";
import type { AppLanguage } from "@therapy/i18n-config";
import { apiRequest } from "../../services/api";

type PaymentCheckoutEvent = {
  id: string;
  eventType: string;
  message: string | null;
  createdAt: string;
};

type PaymentCheckoutRow = {
  id: string;
  kind: string;
  status: string;
  provider: string;
  providerPaymentId: string | null;
  providerOrderId: string | null;
  displayName: string | null;
  sessionCount: number | null;
  chargeAmountMajor: number | null;
  chargeCurrency: string | null;
  fulfillmentPurchaseId: string | null;
  lastProviderStatus: string | null;
  lastError: string | null;
  createdAt: string;
  events: PaymentCheckoutEvent[];
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function PatientPaymentCheckoutsPanel(props: {
  token: string;
  patientId: string;
  language: AppLanguage;
}) {
  const [rows, setRows] = useState<PaymentCheckoutRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await apiRequest<{ checkouts: PaymentCheckoutRow[] }>(
        `/api/admin/patients/${props.patientId}/payment-checkouts`,
        {},
        props.token
      );
      setRows(response.checkouts ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar transacciones");
    } finally {
      setLoading(false);
    }
  }, [props.patientId, props.token]);

  useEffect(() => {
    void load();
  }, [load]);

  const retrySync = async (checkoutId: string) => {
    setRetryingId(checkoutId);
    setMessage("");
    try {
      const result = await apiRequest<{
        ok: boolean;
        fulfilled: boolean;
        paymentStatus: string;
        error?: string;
      }>(
        `/api/admin/payment-checkouts/${checkoutId}/retry-sync`,
        { method: "POST" },
        props.token
      );
      setMessage(
        result.fulfilled
          ? `Sincronización OK (${result.paymentStatus}). Créditos acreditados si correspondía.`
          : `Sync ejecutado — estado proveedor: ${result.paymentStatus}`
      );
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo reintentar sync");
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <section className="patient-payment-checkouts card stack">
      <div className="patient-inline-head">
        <h4>Transacciones de pago</h4>
        <button type="button" className="ghost" onClick={() => void load()} disabled={loading}>
          Actualizar
        </button>
      </div>
      {message ? <p className="admin-surface-message">{message}</p> : null}
      {loading && rows.length === 0 ? <p>Cargando transacciones…</p> : null}
      {!loading && rows.length === 0 ? <p className="muted">Sin checkouts registrados para este paciente.</p> : null}
      {rows.length > 0 ? (
        <div className="patient-payment-checkouts-table-wrap">
          <table className="patient-payment-checkouts-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Monto</th>
                <th>Referencia</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{formatWhen(row.createdAt)}</td>
                  <td>{row.displayName ?? row.kind}</td>
                  <td>
                    <span className={`payment-checkout-status status-${row.status.toLowerCase()}`}>
                      {row.status}
                      {row.lastProviderStatus ? ` (${row.lastProviderStatus})` : ""}
                    </span>
                  </td>
                  <td>
                    {row.chargeAmountMajor != null && row.chargeCurrency
                      ? `${row.chargeCurrency} ${row.chargeAmountMajor}`
                      : "—"}
                  </td>
                  <td className="payment-checkout-refs">
                    {row.providerPaymentId ? <code title="dLocal payment">{row.providerPaymentId}</code> : null}
                    {row.providerOrderId ? <code title="order">{row.providerOrderId}</code> : null}
                    {row.fulfillmentPurchaseId ? (
                      <span className="muted">purchase: {row.fulfillmentPurchaseId.slice(0, 8)}…</span>
                    ) : null}
                    {row.lastError ? <span className="danger">{row.lastError}</span> : null}
                  </td>
                  <td>
                    {row.provider === "DLOCAL" && row.status !== "FULFILLED" ? (
                      <button
                        type="button"
                        className="secondary"
                        disabled={retryingId === row.id}
                        onClick={() => void retrySync(row.id)}
                      >
                        {retryingId === row.id ? "Sync…" : "Reintentar sync"}
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {rows.some((row) => row.events.length > 0) ? (
        <details className="patient-inline-details">
          <summary>Ver eventos de auditoría</summary>
          <div className="payment-checkout-events-log">
            {rows.map((row) =>
              row.events.length > 0 ? (
                <div key={`events-${row.id}`} className="payment-checkout-event-group">
                  <strong>{row.displayName ?? row.kind}</strong>
                  <ol>
                    {row.events.map((event) => (
                      <li key={event.id}>
                        <span>{formatWhen(event.createdAt)}</span> — {event.message ?? event.eventType}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null
            )}
          </div>
        </details>
      ) : null}
    </section>
  );
}
