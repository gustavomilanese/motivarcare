import { describe, expect, it } from "vitest";
import { resolveDlocalChargeAmount } from "./dlocalChargeAmount.js";

describe("resolveDlocalChargeAmount", () => {
  it("converts USD catalog price to ARS for Argentina", () => {
    expect(
      resolveDlocalChargeAmount({ market: "AR", priceUsdCents: 10_000, arsPerUsd: 1_000 })
    ).toEqual({ amountMajor: 100_000, currency: "ARS" });
  });

  it("keeps USD for non-AR dLocal markets (e.g. Colombia via residency)", () => {
    expect(
      resolveDlocalChargeAmount({ market: "US", priceUsdCents: 6500, arsPerUsd: null })
    ).toEqual({ amountMajor: 65, currency: "USD" });
  });

  it("requires FX for Argentina", () => {
    expect(() =>
      resolveDlocalChargeAmount({ market: "AR", priceUsdCents: 1000, arsPerUsd: null })
    ).toThrow(/USD\/ARS/);
  });
});
