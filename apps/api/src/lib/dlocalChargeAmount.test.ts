import { describe, expect, it } from "vitest";
import { resolveDlocalChargeAmount } from "./dlocalChargeAmount.js";

describe("resolveDlocalChargeAmount", () => {
  it("converts USD catalog to ARS with ceil×500 for Argentina", () => {
    expect(
      resolveDlocalChargeAmount({
        payerCountry: "AR",
        priceUsdCents: 10_000,
        ratesPerUsd: { ARS: 1_000 }
      })
    ).toEqual({ amountMajor: 100_000, currency: "ARS" });

    // 459 * 1321.473 ≈ 606_556.1 → ceil×500 = 607_000
    expect(
      resolveDlocalChargeAmount({
        payerCountry: "AR",
        priceUsdCents: 45_900,
        ratesPerUsd: { ARS: 1_321.473 }
      })
    ).toEqual({ amountMajor: 607_000, currency: "ARS" });
  });

  it("charges COP with dLocal FX for Colombia", () => {
    expect(
      resolveDlocalChargeAmount({
        payerCountry: "CO",
        priceUsdCents: 6_500,
        ratesPerUsd: { COP: 4_200 }
      })
    ).toEqual({ amountMajor: 273_000, currency: "COP" });
  });

  it("keeps USD for Ecuador (dolarizado)", () => {
    expect(
      resolveDlocalChargeAmount({
        payerCountry: "EC",
        priceUsdCents: 6_500,
        ratesPerUsd: {}
      })
    ).toEqual({ amountMajor: 65, currency: "USD" });
  });

  it("requires FX for local-currency countries", () => {
    expect(() =>
      resolveDlocalChargeAmount({
        payerCountry: "AR",
        priceUsdCents: 1_000,
        ratesPerUsd: null
      })
    ).toThrow(/USD\/ARS/);
  });
});
