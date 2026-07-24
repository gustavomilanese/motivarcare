import { describe, expect, it } from "vitest";
import { resolvePackageCardDisplayPricing } from "./packageCardDisplayPricing";

describe("resolvePackageCardDisplayPricing", () => {
  it("lista → total con descuento → /sesión desde el total local", () => {
    // 5% OFF: final USD 459 → lista ≈ 483; con ARS 1400 → ceil×500
    const pricing = resolvePackageCardDisplayPricing({
      priceCents: 45_900,
      discountPercent: 5,
      credits: 4,
      displayCurrency: "ARS",
      fxRates: { ratesPerUsd: { ARS: 1_400 } }
    });

    expect(pricing.listLocalMajor % 500).toBe(0);
    expect(pricing.totalLocalMajor % 500).toBe(0);
    expect(pricing.perSessionLocalMajor % 500).toBe(0);
    expect(pricing.savingLocalMajor).toBe(pricing.listLocalMajor - pricing.totalLocalMajor);
    expect(pricing.perSessionLocalMajor).toBeGreaterThanOrEqual(
      Math.ceil(pricing.totalLocalMajor / 4 / 500) * 500
    );
  });

  it("sin descuento: lista = total", () => {
    const pricing = resolvePackageCardDisplayPricing({
      priceCents: 10_000,
      discountPercent: 0,
      credits: 1,
      displayCurrency: "ARS",
      fxRates: { ratesPerUsd: { ARS: 1_000 } }
    });
    expect(pricing.listLocalMajor).toBe(pricing.totalLocalMajor);
    expect(pricing.savingLocalMajor).toBe(0);
    expect(pricing.perSessionLocalMajor).toBe(pricing.totalLocalMajor);
  });
});
