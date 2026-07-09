import {
  DLOCAL_PAYOUT_PURPOSE,
  dlocalPayoutCurrencyForCountry,
  getDlocalPayoutCountryConfig,
  isDlocalPayoutCountry,
  normalizePayoutCountry,
  validateDlocalPayoutProfile,
  type ProfessionalPayoutAdminData,
  type ProfessionalPayoutBankAccount
} from "@therapy/types";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import {
  createDlocalGoPayout,
  getDlocalGoPayout,
  isDlocalGoConfigured,
  type DlocalGoPayout,
  type DlocalGoPayoutStatus
} from "../../lib/dlocalGoPayouts.js";

const LOG_PREFIX = "[dlocal-payouts]";

/** Error de dominio con `code` estable para mapear a HTTP en las rutas. */
export class ProfessionalPayoutError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "ProfessionalPayoutError";
    this.code = code;
  }
}

function adminConfigKey(professionalProfileId: string): string {
  return `professional-admin-${professionalProfileId}`;
}

function payoutRecordKey(payoutId: string): string {
  return `dlocal-payout-${payoutId}`;
}

/** Registro liviano que persistimos por cada payout para que el webhook lo actualice. */
export type StoredPayoutRecord = {
  payoutId: string;
  professionalProfileId: string;
  transferCountry: string;
  currencyToPay: string;
  amount: number;
  status: DlocalGoPayoutStatus;
  externalReference: string | null;
  createdAt: string;
  updatedAt: string;
  bankName?: string | null;
};

export async function loadProfessionalPayoutAdmin(
  professionalProfileId: string
): Promise<ProfessionalPayoutAdminData | null> {
  const config = await prisma.systemConfig.findUnique({ where: { key: adminConfigKey(professionalProfileId) } });
  if (!config?.value || typeof config.value !== "object" || Array.isArray(config.value)) {
    return null;
  }
  return config.value as ProfessionalPayoutAdminData;
}

/**
 * Determina si un profesional puede recibir payouts vía dLocal según los datos que cargó
 * en el onboarding. No llama a dLocal; sólo valida contra la spec compartida.
 */
export function assessPayoutReadiness(admin: ProfessionalPayoutAdminData | null): {
  ready: boolean;
  reason?: string;
} {
  if (!admin) {
    return { ready: false, reason: "El profesional todavía no cargó datos de cobro." };
  }
  if (admin.payoutMethod && admin.payoutMethod !== "dlocal") {
    return { ready: false, reason: "El método de cobro configurado no es dLocal." };
  }
  const bank = admin.payoutBankAccount;
  if (!bank || !bank.payoutCountry) {
    return { ready: false, reason: "Falta el país de cobro del profesional." };
  }
  if (!isDlocalPayoutCountry(bank.payoutCountry)) {
    return { ready: false, reason: `dLocal todavía no transfiere a cuentas en ${bank.payoutCountry}.` };
  }
  const error = validateDlocalPayoutProfile({
    payoutCountry: bank.payoutCountry,
    beneficiaryFirstName: bank.beneficiaryFirstName ?? "",
    beneficiaryLastName: bank.beneficiaryLastName ?? "",
    documentType: bank.documentType ?? "",
    document: bank.document ?? "",
    bankCode: bank.bankCode ?? "",
    bankAccount: bank.accountValue,
    bankBranch: bank.bankBranch ?? null,
    accountType: bank.accountType ?? null
  });
  if (error) {
    return { ready: false, reason: error.message };
  }
  return { ready: true };
}

function payoutNotificationUrl(): string {
  const base = (env.API_PUBLIC_URL || "").replace(/\/+$/, "");
  return `${base}/api/payouts/dlocal/webhook`;
}

async function upsertPayoutRecord(record: StoredPayoutRecord): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key: payoutRecordKey(record.payoutId) },
    create: { key: payoutRecordKey(record.payoutId), value: record },
    update: { value: record }
  });
}

export async function getStoredPayoutRecord(payoutId: string): Promise<StoredPayoutRecord | null> {
  const config = await prisma.systemConfig.findUnique({ where: { key: payoutRecordKey(payoutId) } });
  if (!config?.value || typeof config.value !== "object" || Array.isArray(config.value)) {
    return null;
  }
  return config.value as StoredPayoutRecord;
}

/**
 * Ejecuta un payout a un profesional vía dLocal.
 *
 * @param amount  Monto en la **moneda local del país de cobro** (`currency_to_pay`).
 *                La conversión desde el neto interno la resuelve el llamador (finanzas/admin).
 */
export async function createProfessionalPayout(params: {
  professionalProfileId: string;
  amount: number;
  externalReference?: string | null;
  beneficiaryEmail?: string | null;
  description?: string | null;
}): Promise<{ payout: DlocalGoPayout; record: StoredPayoutRecord }> {
  if (!isDlocalGoConfigured()) {
    throw new ProfessionalPayoutError("dlocal_not_configured", "dLocal Go no está configurado (faltan credenciales).");
  }
  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    throw new ProfessionalPayoutError("invalid_amount", "El monto del payout debe ser mayor a 0.");
  }

  const admin = await loadProfessionalPayoutAdmin(params.professionalProfileId);
  const readiness = assessPayoutReadiness(admin);
  if (!readiness.ready || !admin?.payoutBankAccount) {
    throw new ProfessionalPayoutError("profile_incomplete", readiness.reason ?? "Perfil de cobro incompleto.");
  }

  const bank: ProfessionalPayoutBankAccount = admin.payoutBankAccount;
  const country = normalizePayoutCountry(bank.payoutCountry);
  if (!country) {
    throw new ProfessionalPayoutError("payout_country_unsupported", "País de cobro no soportado por dLocal.");
  }
  const config = getDlocalPayoutCountryConfig(country);
  const currency = dlocalPayoutCurrencyForCountry(country);
  if (!config || !currency) {
    throw new ProfessionalPayoutError("payout_country_unsupported", "País de cobro no soportado por dLocal.");
  }

  console.info(`${LOG_PREFIX} initiating professional payout`, {
    professionalProfileId: params.professionalProfileId,
    ref: params.externalReference ?? null,
    country,
    currency,
    amount: params.amount
  });

  const payout = await createDlocalGoPayout({
    transferAmount: params.amount,
    transferCountry: country,
    currencyToPay: currency,
    flowType: "B2C",
    purpose: DLOCAL_PAYOUT_PURPOSE,
    beneficiaryFirstName: bank.beneficiaryFirstName ?? "",
    beneficiaryLastName: bank.beneficiaryLastName ?? "",
    beneficiaryEmail: params.beneficiaryEmail ?? null,
    beneficiaryDocument: bank.document ?? "",
    beneficiaryDocumentType: bank.documentType ?? "",
    bankCode: bank.bankCode ?? "",
    bankAccount: bank.accountValue,
    bankBranch: config.requiresBranch ? bank.bankBranch ?? null : null,
    bankAccountType: config.requiresAccountType ? bank.accountType ?? null : null,
    description: params.description ?? "MotivarCare - pago de sesiones",
    notificationUrl: payoutNotificationUrl(),
    externalReference: params.externalReference ?? null
  });

  const now = new Date().toISOString();
  const record: StoredPayoutRecord = {
    payoutId: payout.payout_id,
    professionalProfileId: params.professionalProfileId,
    transferCountry: country,
    currencyToPay: currency,
    amount: params.amount,
    status: payout.status,
    externalReference: params.externalReference ?? null,
    createdAt: now,
    updatedAt: now,
    bankName: payout.bank_name ?? null
  };
  await upsertPayoutRecord(record);

  return { payout, record };
}

/**
 * Refresca el estado de un payout consultando a dLocal y persiste el resultado.
 * Idempotente: pensado para el webhook (puede recibir la misma notificación varias veces).
 */
export async function syncPayoutStatus(payoutId: string): Promise<StoredPayoutRecord | null> {
  const payout = await getDlocalGoPayout(payoutId);
  const existing = await getStoredPayoutRecord(payoutId);

  if (!existing) {
    console.warn(`${LOG_PREFIX} received status for unknown payout`, {
      payoutId,
      status: payout.status
    });
    return null;
  }

  if (existing.status === payout.status) {
    console.info(`${LOG_PREFIX} payout status unchanged`, { payoutId, status: payout.status });
    return existing;
  }

  const updated: StoredPayoutRecord = {
    ...existing,
    status: payout.status,
    bankName: payout.bank_name ?? existing.bankName ?? null,
    updatedAt: new Date().toISOString()
  };
  await upsertPayoutRecord(updated);
  console.info(`${LOG_PREFIX} payout status updated`, {
    payoutId,
    from: existing.status,
    to: payout.status,
    professionalProfileId: existing.professionalProfileId
  });
  return updated;
}
