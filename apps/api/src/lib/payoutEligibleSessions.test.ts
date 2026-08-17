import { describe, expect, it } from "vitest";
import { awaitingPayoutDepositWhere, payoutEligibleSessionWhere } from "./payoutEligibleSessions.js";

describe("payoutEligibleSessionWhere", () => {
  it("requires completed sessions that the professional already sent for payout", () => {
    expect(payoutEligibleSessionWhere).toEqual({
      bookingStatus: "COMPLETED",
      submittedForPayoutAt: { not: null },
      payoutLineId: null
    });
  });
});

describe("awaitingPayoutDepositWhere", () => {
  it("keeps submitted sessions until the payout line is PAID", () => {
    expect(awaitingPayoutDepositWhere).toEqual({
      bookingStatus: "COMPLETED",
      submittedForPayoutAt: { not: null },
      OR: [{ payoutLineId: null }, { payoutLine: { status: { not: "PAID" } } }]
    });
  });
});
