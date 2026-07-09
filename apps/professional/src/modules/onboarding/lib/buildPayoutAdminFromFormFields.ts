import type {
  ProfessionalPayoutAdminData,
  ProfessionalPayoutBankTransferType,
  ProfessionalPayoutProvider
} from "@therapy/types";
import { isDlocalPayoutCountry } from "@therapy/types";
import { normalizeBankAccountValue, payoutFormToDlocalProfile, type PayoutFormFields } from "./professionalPayoutValidation";

/**
 * Construye el `ProfessionalPayoutAdminData` que se envía a `/api/professional/admin` a partir
 * de los campos del formulario de cobro. Compartido por el onboarding web y mobile para que
 * ambos persistan exactamente los mismos datos dLocal (país de cobro, banco, cuenta, etc.).
 */
export function buildPayoutAdminFromFormFields(
  provider: ProfessionalPayoutProvider,
  fields: PayoutFormFields
): ProfessionalPayoutAdminData {
  if (provider === "dlocal" && isDlocalPayoutCountry(fields.payoutCountry)) {
    const dlocal = payoutFormToDlocalProfile(fields);
    const fullName = `${dlocal.beneficiaryFirstName} ${dlocal.beneficiaryLastName}`.trim();
    return {
      taxId: dlocal.document,
      legalName: fields.legalName.trim() || fullName,
      payoutMethod: "dlocal",
      payoutStatus: "pending_review",
      payoutSubmittedAt: new Date().toISOString(),
      payoutBankAccount: {
        transferType: fields.bankTransferType,
        accountValue: dlocal.bankAccount,
        accountHolderName: fields.accountHolderName.trim() || fullName,
        bankName: fields.bankName.trim() || null,
        payoutCountry: dlocal.payoutCountry,
        beneficiaryFirstName: dlocal.beneficiaryFirstName,
        beneficiaryLastName: dlocal.beneficiaryLastName,
        documentType: dlocal.documentType,
        document: dlocal.document,
        bankCode: dlocal.bankCode,
        bankBranch: dlocal.bankBranch ?? null,
        accountType: dlocal.accountType ?? null
      }
    };
  }

  return {
    taxId: fields.taxId.trim() || undefined,
    legalName: fields.legalName.trim(),
    payoutMethod: provider,
    payoutStatus: "pending_review",
    payoutSubmittedAt: new Date().toISOString(),
    payoutBankAccount: {
      transferType: fields.bankTransferType as ProfessionalPayoutBankTransferType,
      accountValue: normalizeBankAccountValue(fields.bankTransferType, fields.bankAccountValue),
      accountHolderName: fields.accountHolderName.trim(),
      bankName: fields.bankName.trim() || null
    }
  };
}
