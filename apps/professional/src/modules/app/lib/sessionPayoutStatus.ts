import { type AppLanguage, textByLanguage } from "@therapy/i18n-config";
import { PORTAL_SESSION_FLOW } from "./sessionLifecycle";

export type SessionPayoutStatus = "completed" | "submitted" | "paid";

export function resolveSessionPayoutStatus(input: {
  submittedForPayout?: boolean;
  payoutPaid?: boolean;
}): SessionPayoutStatus {
  if (input.payoutPaid) {
    return "paid";
  }
  if (input.submittedForPayout) {
    return "submitted";
  }
  return "completed";
}

export function sessionPayoutStatusLabel(language: AppLanguage, status: SessionPayoutStatus): string {
  const step =
    status === "paid"
      ? PORTAL_SESSION_FLOW[3]
      : status === "submitted"
        ? PORTAL_SESSION_FLOW[2]
        : PORTAL_SESSION_FLOW[1];
  return textByLanguage(language, step!.label);
}
