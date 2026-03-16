import type { FinanceStripeEvent, StripeEventStatus } from "../types/finance.types";

function stripeStatusLabel(status: StripeEventStatus): string {
  if (status === "PENDING") return "Pendiente";
  if (status === "PROCESSING") return "Procesando";
  if (status === "PROCESSED") return "Procesado";
  if (status === "DEAD_LETTER") return "Error";
  return "Desconocido";
}

function stripeStatusClass(status: StripeEventStatus): string {
  if (status === "PENDING") return "finance-status-pill pending";
  if (status === "PROCESSING") return "finance-status-pill processing";
  if (status === "PROCESSED") return "finance-status-pill processed";
  if (status === "DEAD_LETTER") return "finance-status-pill dead";
  return "finance-status-pill";
}

interface FinanceStripeStatusPillProps {
  status: FinanceStripeEvent["status"];
}

export function FinanceStripeStatusPill(props: FinanceStripeStatusPillProps) {
  return <span className={stripeStatusClass(props.status)}>{stripeStatusLabel(props.status)}</span>;
}

