import type {
  ProfessionalPayoutAdminData,
  ProfessionalPayoutBankTransferType
} from "@therapy/types";
import type { ProfessionalWebOnboardingPayload } from "../types";

export function buildPayoutAdminFromWebPayload(
  payload: ProfessionalWebOnboardingPayload
): ProfessionalPayoutAdminData | undefined {
  if (!payload.payoutProfile || !payload.taxId) {
    return undefined;
  }

  const payoutMethod = payload.payoutMethod === "dlocal" ? "dlocal" : "stripe";
  const profile = payload.payoutProfile;

  return {
    taxId: payload.taxId,
    legalName: profile.legalName,
    payoutMethod,
    payoutStatus: "pending_review",
    payoutSubmittedAt: new Date().toISOString(),
    payoutBankAccount: {
      transferType: profile.bankTransferType as ProfessionalPayoutBankTransferType,
      accountValue: profile.bankAccountValue,
      accountHolderName: profile.accountHolderName,
      bankName: profile.bankName ?? null,
      // Campos dLocal (presentes sólo cuando payoutMethod === "dlocal").
      payoutCountry: profile.payoutCountry ?? null,
      beneficiaryFirstName: profile.beneficiaryFirstName ?? null,
      beneficiaryLastName: profile.beneficiaryLastName ?? null,
      documentType: profile.documentType ?? null,
      document: profile.document ?? null,
      bankCode: profile.bankCode ?? null,
      bankBranch: profile.bankBranch ?? null,
      accountType: profile.accountType ?? null
    }
  };
}
