import { describe, expect, it } from "vitest";
import { extractDlocalGoErrorMessage, isDlocalGoPaymentPaid } from "./dlocalGoClient.js";

describe("isDlocalGoPaymentPaid", () => {
  it("accepts paid-like dLocal statuses", () => {
    expect(isDlocalGoPaymentPaid("PAID")).toBe(true);
    expect(isDlocalGoPaymentPaid("paid")).toBe(true);
    expect(isDlocalGoPaymentPaid("COMPLETED")).toBe(true);
    expect(isDlocalGoPaymentPaid("APPROVED")).toBe(true);
  });

  it("rejects pending or failed statuses", () => {
    expect(isDlocalGoPaymentPaid("PENDING")).toBe(false);
    expect(isDlocalGoPaymentPaid("REJECTED")).toBe(false);
    expect(isDlocalGoPaymentPaid("CANCELLED")).toBe(false);
  });
});

describe("extractDlocalGoErrorMessage", () => {
  it("includes the field name when dLocal only says must not be null", () => {
    expect(
      extractDlocalGoErrorMessage(
        {
          message: "must not be null",
          errors: [{ field: "bankAccountType", defaultMessage: "must not be null" }]
        },
        400
      )
    ).toBe("bankAccountType: must not be null");
  });
});
