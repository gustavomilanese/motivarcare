import { z } from "zod";
import { validateDlocalPayoutProfile } from "@therapy/types";

export const payoutBankTransferTypeSchema = z.enum(["cbu", "cvu", "alias", "iban", "ach"]);

export const payoutAccountTypeSchema = z.enum(["CHECKING", "SAVINGS"]);

export const payoutBankAccountSchema = z.object({
  transferType: payoutBankTransferTypeSchema,
  accountValue: z.string().trim().min(4).max(80),
  accountHolderName: z.string().trim().min(2).max(120),
  bankName: z.string().trim().max(80).optional().nullable(),
  // Campos dLocal payouts (POST /v1/payouts). Opcionales por retrocompatibilidad.
  payoutCountry: z.string().trim().max(2).optional().nullable(),
  beneficiaryFirstName: z.string().trim().max(80).optional().nullable(),
  beneficiaryLastName: z.string().trim().max(80).optional().nullable(),
  documentType: z.string().trim().max(20).optional().nullable(),
  document: z.string().trim().max(40).optional().nullable(),
  bankCode: z.string().trim().max(20).optional().nullable(),
  bankBranch: z.string().trim().max(20).optional().nullable(),
  accountType: payoutAccountTypeSchema.optional().nullable()
});

export const payoutProviderSchema = z.enum(["dlocal", "stripe"]);

export const payoutStatusSchema = z.enum(["draft", "pending_review", "active", "rejected"]);

export const professionalPayoutAdminPayloadSchema = z.object({
  taxId: z.string().max(60).optional(),
  legalName: z.string().max(120).optional(),
  payoutMethod: payoutProviderSchema.optional(),
  payoutAccount: z.string().max(120).optional(),
  payoutStatus: payoutStatusSchema.optional(),
  payoutBankAccount: payoutBankAccountSchema.optional().nullable(),
  payoutSubmittedAt: z.string().datetime().nullable().optional(),
  legalAcceptedAt: z.string().datetime().nullable().optional(),
  acceptedDocuments: z.array(z.string().max(120)).optional(),
  notes: z.string().max(1000).optional()
});

export type ProfessionalPayoutAdminPayload = z.infer<typeof professionalPayoutAdminPayloadSchema>;

export function defaultProfessionalPayoutAdminData() {
  return {
    taxId: "",
    legalName: "",
    payoutMethod: "stripe" as const,
    payoutAccount: "",
    payoutStatus: "draft" as const,
    payoutBankAccount: null,
    payoutSubmittedAt: null,
    legalAcceptedAt: null,
    acceptedDocuments: [] as string[]
  };
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function validatePayoutBankAccountForProvider(
  provider: "dlocal" | "stripe",
  bank: z.infer<typeof payoutBankAccountSchema>
): string | null {
  // Si el perfil trae país de cobro dLocal, validamos con la spec compartida por país
  // (documento, cuenta, banco, sucursal, tipo de cuenta según Country requirements).
  if (bank.payoutCountry) {
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
    return error ? error.message : null;
  }

  const accountValue =
    bank.transferType === "cbu" || bank.transferType === "cvu"
      ? digitsOnly(bank.accountValue)
      : bank.transferType === "alias"
        ? bank.accountValue.trim().toLowerCase()
        : bank.accountValue.trim().replace(/\s+/g, "");

  if (provider === "dlocal") {
    if (bank.transferType === "cbu" || bank.transferType === "cvu") {
      return /^\d{22}$/.test(accountValue) ? null : "Invalid CBU/CVU for Argentina payout";
    }
    if (bank.transferType === "alias") {
      return /^[a-z0-9.]{6,20}$/.test(accountValue) ? null : "Invalid bank alias for Argentina payout";
    }
    return "Argentina payouts require CBU, CVU, or alias";
  }

  if (bank.transferType === "iban") {
    return accountValue.length >= 15 && accountValue.length <= 34 ? null : "Invalid IBAN";
  }
  if (bank.transferType === "ach") {
    return accountValue.length >= 4 ? null : "Invalid account number";
  }
  return "International payouts require IBAN or account number";
}

/**
 * Validación genérica multi-país del identificador fiscal: alfanumérico, largo razonable.
 * No imponemos el formato exacto de cada país (RFC, NIT, RUT, CUIT…); el proveedor de
 * pagos valida el formato real al ejecutar el payout. Así soportamos muchos países.
 */
export function validateTaxIdForProvider(_provider: "dlocal" | "stripe", taxId: string): string | null {
  const normalized = taxId.replace(/[^a-zA-Z0-9]/g, "");
  return normalized.length >= 5 && normalized.length <= 30 ? null : "Invalid tax identifier";
}
