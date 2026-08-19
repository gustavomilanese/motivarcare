import { describe, expect, it } from "vitest";
import { DLOCAL_CHECKOUT_UNAVAILABLE_ERROR } from "@therapy/types";
import { assertPatientDlocalCheckoutAllowed, resolvePatientDlocalPayerCountry } from "./dlocalPatientCheckout.js";

describe("dlocalPatientCheckout", () => {
  it("uses Colombia residency for payer country", () => {
    expect(
      resolvePatientDlocalPayerCountry({ market: "US", residencyCountry: "CO" })
    ).toBe("CO");
  });

  it("rejects explicit US residency even if the commercial market is still AR", () => {
    expect(
      resolvePatientDlocalPayerCountry({ market: "AR", residencyCountry: "US" })
    ).toBeNull();
    expect(() =>
      assertPatientDlocalCheckoutAllowed({ market: "AR", residencyCountry: "US" })
    ).toThrow(DLOCAL_CHECKOUT_UNAVAILABLE_ERROR);
  });

  it("falls back to AR market when residency is missing", () => {
    expect(resolvePatientDlocalPayerCountry({ market: "AR", residencyCountry: null })).toBe("AR");
  });
});
