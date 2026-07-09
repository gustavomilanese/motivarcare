import {
  DLOCAL_PAYOUT_PURPOSE,
  type DlocalPayoutAccountType,
  type DlocalPayoutFlowType,
  type DlocalPayoutPurpose
} from "@therapy/types";
import { dlocalGoRequest, isDlocalGoConfigured, verifyDlocalGoNotificationSignature } from "./dlocalGoClient.js";

/**
 * Cliente de **payouts** de dLocal Go (`POST /v1/payouts`, `GET /v1/payouts/{id}`).
 *
 * Un payout es una transferencia desde el balance de MotivarCare en dLocal hacia la cuenta
 * bancaria del profesional (flujo B2C). El detalle de campos por país vive en el paquete
 * compartido `@therapy/types` (`dlocalPayouts.ts`), que también valida el perfil.
 *
 * Logging: prefijo `[dlocal-payouts]`. Nunca logueamos el número de cuenta ni el documento
 * completos (datos sensibles); sí el país, banco, monto, moneda y estado.
 */

const LOG_PREFIX = "[dlocal-payouts]";

export type DlocalGoPayoutStatus =
  | "PENDING"
  | "PROCESSING"
  | "ON_HOLD"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED"
  | "FAILED"
  | string;

/** Campos que enviamos a `POST /v1/payouts` (snake_case como exige dLocal). */
export type DlocalGoPayoutRequest = {
  transferAmount: number;
  transferCountry: string;
  currencyToPay: string;
  flowType?: DlocalPayoutFlowType;
  purpose?: DlocalPayoutPurpose;
  beneficiaryFirstName: string;
  beneficiaryLastName: string;
  beneficiaryEmail?: string | null;
  beneficiaryDocument: string;
  beneficiaryDocumentType: string;
  bankCode: string;
  bankAccount: string;
  bankBranch?: string | null;
  bankAccountType?: DlocalPayoutAccountType | null;
  description?: string | null;
  notificationUrl?: string | null;
  /** Identificador interno para correlacionar logs (no se envía a dLocal). */
  externalReference?: string | null;
};

export type DlocalGoPayout = {
  payout_id: string;
  flow_type?: DlocalPayoutFlowType | string;
  country?: string | null;
  currency_to_pay?: string | null;
  amount?: number | null;
  purpose?: string | null;
  description?: string | null;
  bank_name?: string | null;
  status: DlocalGoPayoutStatus;
  created_at?: string | null;
};

export { isDlocalGoConfigured };

/** Enmascara datos sensibles para logs (deja los últimos 4 caracteres). */
function maskTail(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (raw.length <= 4) {
    return raw.length > 0 ? `***${raw.slice(-1)}` : "";
  }
  return `***${raw.slice(-4)}`;
}

function buildPayoutBody(request: DlocalGoPayoutRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    transfer_amount: Number(request.transferAmount.toFixed(2)),
    transfer_country: request.transferCountry.trim().toUpperCase(),
    currency_to_pay: request.currencyToPay.trim().toUpperCase(),
    flow_type: request.flowType ?? "B2C",
    purpose: request.purpose ?? DLOCAL_PAYOUT_PURPOSE,
    beneficiary_first_name: request.beneficiaryFirstName.trim(),
    beneficiary_last_name: request.beneficiaryLastName.trim(),
    beneficiary_document: request.beneficiaryDocument.replace(/\s+/g, ""),
    beneficiary_document_type: request.beneficiaryDocumentType.trim().toUpperCase(),
    bank_code: request.bankCode.trim(),
    bank_account: request.bankAccount.replace(/\s+/g, "")
  };

  if (request.beneficiaryEmail && request.beneficiaryEmail.trim()) {
    body.beneficiary_email = request.beneficiaryEmail.trim();
  }
  if (request.bankBranch && request.bankBranch.trim()) {
    body.bank_branch = request.bankBranch.trim();
  }
  if (request.bankAccountType) {
    body.bank_account_type = request.bankAccountType;
  }
  if (request.description && request.description.trim()) {
    body.description = request.description.trim().slice(0, 200);
  }
  if (request.notificationUrl && request.notificationUrl.trim()) {
    body.notification_url = request.notificationUrl.trim();
  }

  return body;
}

/**
 * Crea un payout en dLocal. Loguea el intento (con datos enmascarados), el resultado y
 * cualquier error. `externalReference` sirve para correlacionar con la liquidación interna.
 */
export async function createDlocalGoPayout(request: DlocalGoPayoutRequest): Promise<DlocalGoPayout> {
  const body = buildPayoutBody(request);
  const logContext = {
    ref: request.externalReference ?? null,
    country: body.transfer_country,
    currency: body.currency_to_pay,
    amount: body.transfer_amount,
    bankCode: body.bank_code,
    account: maskTail(request.bankAccount),
    document: maskTail(request.beneficiaryDocument),
    documentType: body.beneficiary_document_type,
    accountType: body.bank_account_type ?? null,
    branch: body.bank_branch ? maskTail(request.bankBranch) : null,
    purpose: body.purpose
  };

  console.info(`${LOG_PREFIX} creating payout`, logContext);

  try {
    const payout = await dlocalGoRequest<DlocalGoPayout>("/v1/payouts", {
      method: "POST",
      body: JSON.stringify(body)
    });
    console.info(`${LOG_PREFIX} payout created`, {
      ref: request.externalReference ?? null,
      payoutId: payout.payout_id,
      status: payout.status,
      amount: payout.amount ?? null,
      currency: payout.currency_to_pay ?? null
    });
    return payout;
  } catch (error) {
    console.error(`${LOG_PREFIX} payout creation failed`, {
      ref: request.externalReference ?? null,
      country: logContext.country,
      amount: logContext.amount,
      message: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/** Consulta el estado actual de un payout en dLocal. */
export async function getDlocalGoPayout(payoutId: string): Promise<DlocalGoPayout> {
  const id = payoutId.trim();
  console.info(`${LOG_PREFIX} fetching payout status`, { payoutId: id });
  try {
    const payout = await dlocalGoRequest<DlocalGoPayout>(`/v1/payouts/${encodeURIComponent(id)}`);
    console.info(`${LOG_PREFIX} payout status`, {
      payoutId: payout.payout_id ?? id,
      status: payout.status,
      bankName: payout.bank_name ?? null
    });
    return payout;
  } catch (error) {
    console.error(`${LOG_PREFIX} payout status fetch failed`, {
      payoutId: id,
      message: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

const SETTLED_PAYOUT_STATUSES = new Set(["DELIVERED", "COMPLETED"]);
const FAILED_PAYOUT_STATUSES = new Set(["CANCELLED", "REJECTED", "FAILED"]);

/** ¿El payout llegó a destino (dinero entregado)? */
export function isDlocalGoPayoutSettled(status: DlocalGoPayoutStatus): boolean {
  return SETTLED_PAYOUT_STATUSES.has(String(status).trim().toUpperCase());
}

/** ¿El payout terminó en un estado de falla (requiere reintento o revisión)? */
export function isDlocalGoPayoutFailed(status: DlocalGoPayoutStatus): boolean {
  return FAILED_PAYOUT_STATUSES.has(String(status).trim().toUpperCase());
}

/**
 * Verifica la firma del webhook de payouts. dLocal usa el mismo esquema HMAC que en payments
 * (`V2-HMAC-SHA256, Signature: ...` sobre `API_KEY + rawBody`, secret = API_SECRET).
 */
export function verifyDlocalGoPayoutNotificationSignature(params: {
  authorizationHeader: string | null | undefined;
  rawBody: string;
}): boolean {
  return verifyDlocalGoNotificationSignature(params);
}
