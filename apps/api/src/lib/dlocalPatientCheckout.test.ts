import { describe, expect, it } from "vitest";
import { DLOCAL_CHECKOUT_UNAVAILABLE_ERROR } from "@therapy/types";
import {
  assertPatientDlocalCheckoutAllowed,
  healedResidencyForPatient,
  resolvePatientDlocalPayerCountry
} from "./dlocalPatientCheckout.js";

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

  it("allows Argentina timezone when residency was stored as US", () => {
    expect(
      resolvePatientDlocalPayerCountry({
        market: "US",
        residencyCountry: "US",
        lastSeenTimezone: "America/Argentina/Buenos_Aires"
      })
    ).toBe("AR");
    expect(
      healedResidencyForPatient({
        market: "US",
        residencyCountry: "US",
        lastSeenTimezone: "America/Argentina/Buenos_Aires"
      })
    ).toBe("AR");
  });
});
