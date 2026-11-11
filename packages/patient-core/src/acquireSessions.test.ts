import { describe, expect, it } from "vitest";
import { resolveAcquireSessionsIntent } from "./acquireSessions.js";

const assignedReady = {
  hasAssignedProfessional: true,
  pricingReady: true,
  creditsRemaining: 0,
  plans: [],
  featuredPackageId: null
};

describe("resolveAcquireSessionsIntent", () => {
  it("asks to assign only when there is no pricing professional", () => {
    expect(
      resolveAcquireSessionsIntent("book_without_credits", "desktop", {
        ...assignedReady,
        hasAssignedProfessional: false
      })
    ).toEqual({ type: "navigate_assign_professional" });
  });

  it("does not ask to assign when professional exists but catalog pricing is not ready", () => {
    expect(
      resolveAcquireSessionsIntent("book_without_credits", "desktop", {
        ...assignedReady,
        pricingReady: false,
        creditsRemaining: 0
      })
    ).toEqual({ type: "open_checkout", planId: null });

    expect(
      resolveAcquireSessionsIntent("buy_cta", "desktop", {
        ...assignedReady,
        pricingReady: false
      })
    ).toEqual({ type: "open_checkout", planId: null });
  });

  it("opens checkout when assigned and balance is empty", () => {
    expect(resolveAcquireSessionsIntent("book_without_credits", "desktop", assignedReady)).toEqual({
      type: "open_checkout",
      planId: null
    });
  });

  it("opens booking when credits remain", () => {
    expect(
      resolveAcquireSessionsIntent("book_without_credits", "mobile", {
        ...assignedReady,
        creditsRemaining: 2
      })
    ).toEqual({ type: "open_new_booking_panel" });
  });
});
