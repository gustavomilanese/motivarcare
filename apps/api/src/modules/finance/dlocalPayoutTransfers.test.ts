import { describe, expect, it } from "vitest";
import {
  dlocalSentPayoutLineWhere,
  resolveDlocalTransferDisplayStatus
} from "./adminUnpaidProfessional.service.js";

describe("dlocalSentPayoutLineWhere", () => {
  it("includes submitted, failed-with-error, and any line with a dLocal id", () => {
    expect(dlocalSentPayoutLineWhere).toEqual({
      OR: [
        { dlocalPayoutId: { not: null } },
        { status: "SUBMITTED" },
        { AND: [{ status: "FAILED" }, { submissionError: { not: null } }] }
      ]
    });
  });
});

describe("resolveDlocalTransferDisplayStatus", () => {
  it("marks paid or delivered payouts as delivered", () => {
    expect(resolveDlocalTransferDisplayStatus({ status: "PAID", dlocalStatus: "PROCESSING" })).toBe("delivered");
    expect(resolveDlocalTransferDisplayStatus({ status: "SUBMITTED", dlocalStatus: "DELIVERED" })).toBe("delivered");
  });

  it("marks failed or rejected payouts as failed", () => {
    expect(resolveDlocalTransferDisplayStatus({ status: "FAILED", dlocalStatus: null })).toBe("failed");
    expect(resolveDlocalTransferDisplayStatus({ status: "SUBMITTED", dlocalStatus: "REJECTED" })).toBe("failed");
  });

  it("keeps in-flight dLocal payouts as in transit", () => {
    expect(resolveDlocalTransferDisplayStatus({ status: "SUBMITTED", dlocalStatus: "PROCESSING" })).toBe("in_transit");
  });
});
