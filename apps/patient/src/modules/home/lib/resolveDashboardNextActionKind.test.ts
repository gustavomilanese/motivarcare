import { describe, expect, it } from "vitest";
import { resolveDashboardNextActionKind } from "./resolveDashboardNextActionKind";

describe("resolveDashboardNextActionKind", () => {
  it("prioritizes assign, trial rebook, next session, then credits", () => {
    expect(
      resolveDashboardNextActionKind({
        hasAssignedProfessional: false,
        trialRebookAvailable: true,
        hasNextBooking: true,
        trialPending: true,
        availableSessions: 2
      })
    ).toBe("assign_professional");

    expect(
      resolveDashboardNextActionKind({
        hasAssignedProfessional: true,
        trialRebookAvailable: true,
        hasNextBooking: false,
        trialPending: false,
        availableSessions: 0
      })
    ).toBe("trial_rebook");

    expect(
      resolveDashboardNextActionKind({
        hasAssignedProfessional: true,
        trialRebookAvailable: false,
        hasNextBooking: true,
        trialPending: false,
        availableSessions: 1
      })
    ).toBe("next_session");

    expect(
      resolveDashboardNextActionKind({
        hasAssignedProfessional: true,
        trialRebookAvailable: false,
        hasNextBooking: false,
        trialPending: true,
        availableSessions: 0
      })
    ).toBe("trial_pending");

    expect(
      resolveDashboardNextActionKind({
        hasAssignedProfessional: true,
        trialRebookAvailable: false,
        hasNextBooking: false,
        trialPending: false,
        availableSessions: 3
      })
    ).toBe("book_with_credits");

    expect(
      resolveDashboardNextActionKind({
        hasAssignedProfessional: true,
        trialRebookAvailable: false,
        hasNextBooking: false,
        trialPending: false,
        availableSessions: 0
      })
    ).toBe("buy_sessions");
  });
});
