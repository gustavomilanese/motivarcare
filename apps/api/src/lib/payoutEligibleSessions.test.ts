import { describe, expect, it } from "vitest";
import { payoutEligibleSessionWhere } from "./payoutEligibleSessions.js";

describe("payoutEligibleSessionWhere", () => {
  it("requires completed sessions that the professional already sent for payout", () => {
    expect(payoutEligibleSessionWhere).toEqual({
      bookingStatus: "COMPLETED",
      submittedForPayoutAt: { not: null },
      payoutLineId: null
    });
  });
});
