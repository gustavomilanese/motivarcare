import { describe, expect, it } from "vitest";
import {
  DLOCAL_CHECKOUT_UNAVAILABLE_ERROR,
  isDlocalGoCheckoutAvailable,
  resolveDlocalPayerCountry
} from "./dlocalGoCoverage.js";

describe("dlocalGoCoverage", () => {
  it("routes Colombia by residency even when commercial market is US", () => {
    expect(
      resolveDlocalPayerCountry({ residencyCountry: "CO", market: "US" })
    ).toBe("CO");
    expect(
      isDlocalGoCheckoutAvailable({ residencyCountry: "CO", market: "US" })
    ).toBe(true);
  });

  it("falls back to AR/BR market when residency is missing", () => {
    expect(resolveDlocalPayerCountry({ residencyCountry: null, market: "AR" })).toBe("AR");
    expect(resolveDlocalPayerCountry({ residencyCountry: null, market: "BR" })).toBe("BR");
  });

  it("blocks US and ES payers until another provider is wired", () => {
    expect(resolveDlocalPayerCountry({ residencyCountry: "US", market: "US" })).toBeNull();
    expect(resolveDlocalPayerCountry({ residencyCountry: "ES", market: "ES" })).toBeNull();
    expect(isDlocalGoCheckoutAvailable({ residencyCountry: "US", market: "US" })).toBe(false);
  });

  it("exports a stable unavailable error token", () => {
    expect(DLOCAL_CHECKOUT_UNAVAILABLE_ERROR).toContain("country of residence");
  });
});
