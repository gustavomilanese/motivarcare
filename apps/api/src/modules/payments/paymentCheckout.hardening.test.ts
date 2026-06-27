import { describe, expect, it } from "vitest";
import { isDlocalGoPaymentPaid } from "../../lib/dlocalGoClient.js";

describe("payment checkout hardening", () => {
  it("treats APPROVED as paid for dLocal fulfillment", () => {
    expect(isDlocalGoPaymentPaid("APPROVED")).toBe(true);
  });

  it("does not treat PENDING as paid", () => {
    expect(isDlocalGoPaymentPaid("PENDING")).toBe(false);
  });
});
