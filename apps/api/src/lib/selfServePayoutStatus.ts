export const PAYOUT_STATUSES = ["draft", "pending_review", "active", "rejected"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

function asPayoutStatus(value: unknown): PayoutStatus {
  if (value === "draft" || value === "pending_review" || value === "active" || value === "rejected") {
    return value;
  }
  return "draft";
}

/**
 * Professionals may submit bank/tax data. They must not self-set `active` / `rejected`.
 * Client `payoutStatus` is ignored.
 */
export function resolveSelfServePayoutStatus(input: {
  existingStatus: unknown;
  submittedPayoutDetails: boolean;
  payoutDetailsChanged: boolean;
}): PayoutStatus {
  const existing = asPayoutStatus(input.existingStatus);
  if (!input.submittedPayoutDetails) {
    return existing;
  }
  if (existing === "active" && !input.payoutDetailsChanged) {
    return "active";
  }
  return "pending_review";
}

export function payoutBankFingerprint(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "";
  }
  const bank = value as Record<string, unknown>;
  return [
    String(bank.transferType ?? ""),
    String(bank.accountValue ?? ""),
    String(bank.accountHolderName ?? ""),
    String(bank.bankName ?? ""),
    String(bank.payoutCountry ?? ""),
    String(bank.document ?? ""),
    String(bank.bankCode ?? "")
  ].join("|");
}
