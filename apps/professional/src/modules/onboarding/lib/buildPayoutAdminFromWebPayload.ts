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

  return {
    taxId: payload.taxId,
    legalName: payload.payoutProfile.legalName,
    payoutMethod,
    payoutStatus: "pending_review",
    payoutSubmittedAt: new Date().toISOString(),
    payoutBankAccount: {
      transferType: payload.payoutProfile.bankTransferType as ProfessionalPayoutBankTransferType,
      accountValue: payload.payoutProfile.bankAccountValue,
      accountHolderName: payload.payoutProfile.accountHolderName,
      bankName: payload.payoutProfile.bankName ?? null
    }
  };
}
