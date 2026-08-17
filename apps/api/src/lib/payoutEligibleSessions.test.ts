import { describe, expect, it } from "vitest";
import {
  awaitingPayoutDepositWhere,
  isSessionEligibleForAdminPayout,
  payoutEligibleSessionWhere,
  readyToSendForPayoutWhere,
  shouldReleaseSessionsAfterDlocalFailure
} from "./payoutEligibleSessions.js";

describe("readyToSendForPayoutWhere", () => {
  it("keeps completed sessions that were not sent for payout yet", () => {
    expect(readyToSendForPayoutWhere).toEqual({
      bookingStatus: "COMPLETED",
      submittedForPayoutAt: null,
      payoutLineId: null
    });
  });
});

describe("payoutEligibleSessionWhere", () => {
  it("requires completed sessions sent for payout, including those on a FAILED line", () => {
    expect(payoutEligibleSessionWhere).toEqual({
      bookingStatus: "COMPLETED",
      submittedForPayoutAt: { not: null },
      OR: [{ payoutLineId: null }, { payoutLine: { status: "FAILED" } }]
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

describe("isSessionEligibleForAdminPayout", () => {
  const submitted = "2026-08-16T12:00:00.000Z";

  it("includes completed submitted sessions with no payout line", () => {
    expect(
      isSessionEligibleForAdminPayout({
        bookingStatus: "COMPLETED",
        submittedForPayoutAt: submitted,
        payoutLineStatus: null
      })
    ).toBe(true);
  });

  it("includes sessions stuck on a FAILED line so they can be retried", () => {
    expect(
      isSessionEligibleForAdminPayout({
        bookingStatus: "COMPLETED",
        submittedForPayoutAt: submitted,
        payoutLineStatus: "FAILED"
      })
    ).toBe(true);
  });

  it("does not include in-flight SUBMITTED sessions (webhook still pending)", () => {
    expect(
      isSessionEligibleForAdminPayout({
        bookingStatus: "COMPLETED",
        submittedForPayoutAt: submitted,
        payoutLineStatus: "SUBMITTED"
      })
    ).toBe(false);
  });

  it("does not include PAID or unsubmitted sessions", () => {
    expect(
      isSessionEligibleForAdminPayout({
        bookingStatus: "COMPLETED",
        submittedForPayoutAt: submitted,
        payoutLineStatus: "PAID"
      })
    ).toBe(false);
    expect(
      isSessionEligibleForAdminPayout({
        bookingStatus: "COMPLETED",
        submittedForPayoutAt: null,
        payoutLineStatus: null
      })
    ).toBe(false);
    expect(
      isSessionEligibleForAdminPayout({
        bookingStatus: "CONFIRMED",
        submittedForPayoutAt: submitted,
        payoutLineStatus: null
      })
    ).toBe(false);
  });
});

describe("shouldReleaseSessionsAfterDlocalFailure", () => {
  it("releases sessions only when dLocal never returned a payout id", () => {
    expect(shouldReleaseSessionsAfterDlocalFailure({ dlocalPayoutId: null })).toBe(true);
    expect(shouldReleaseSessionsAfterDlocalFailure({ dlocalPayoutId: "   " })).toBe(true);
    expect(shouldReleaseSessionsAfterDlocalFailure({ dlocalPayoutId: "PO-123" })).toBe(false);
  });
});
