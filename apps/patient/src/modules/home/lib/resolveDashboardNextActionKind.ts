export type DashboardNextActionKind =
  | "assign_professional"
  | "trial_rebook"
  | "next_session"
  | "trial_pending"
  | "book_with_credits"
  | "buy_sessions";

export function resolveDashboardNextActionKind(params: {
  hasAssignedProfessional: boolean;
  trialRebookAvailable: boolean;
  hasNextBooking: boolean;
  trialPending: boolean;
  availableSessions: number;
}): DashboardNextActionKind {
  if (!params.hasAssignedProfessional) {
    return "assign_professional";
  }
  if (params.trialRebookAvailable) {
    return "trial_rebook";
  }
  if (params.hasNextBooking) {
    return "next_session";
  }
  if (params.trialPending) {
    return "trial_pending";
  }
  if (params.availableSessions > 0) {
    return "book_with_credits";
  }
  return "buy_sessions";
}
