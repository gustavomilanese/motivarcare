import { describe, expect, it } from "vitest";
import { DLOCAL_CHECKOUT_UNAVAILABLE_ERROR } from "@therapy/types";
import { assertPatientDlocalCheckoutAllowed, resolvePatientDlocalPayerCountry } from "./dlocalPatientCheckout.js";

describe("dlocalPatientCheckout", () => {
  it("uses Colombia residency for payer country", () => {
    expect(
      resolvePatientDlocalPayerCountry({ market: "US", residencyCountry: "CO" })
    ).toBe("CO");
  });

  it("rejects unsupported residency", () => {
    expect(() =>
      assertPatientDlocalCheckoutAllowed({ market: "US", residencyCountry: "US" })
    ).toThrow(DLOCAL_CHECKOUT_UNAVAILABLE_ERROR);
  });
});
