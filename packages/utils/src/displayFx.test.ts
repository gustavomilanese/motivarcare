import { describe, expect, it } from "vitest";
import {
  convertUsdMajorToDisplayMajor,
  displayCurrencyForMarket,
  formatUsdMajorForPatientDisplay,
  resolveFxRatePerUsd,
  roundDisplayMajorFromUsd
} from "./displayFx.js";

describe("displayCurrencyForMarket", () => {
  it("maps markets to display currencies", () => {
    expect(displayCurrencyForMarket("AR")).toBe("ARS");
    expect(displayCurrencyForMarket("BR")).toBe("BRL");
    expect(displayCurrencyForMarket("ES")).toBe("EUR");
    expect(displayCurrencyForMarket("US")).toBe("USD");
    expect(displayCurrencyForMarket(null)).toBe("USD");
  });
});

describe("resolveFxRatePerUsd", () => {
  it("prefers live ARS rate when provided", () => {
    expect(resolveFxRatePerUsd("ARS", { arsPerUsd: 1400 })).toBe(1400);
  });

  it("falls back to static ARS when live rate missing", () => {
    expect(resolveFxRatePerUsd("ARS")).toBe(1070);
    expect(resolveFxRatePerUsd("ARS", { arsPerUsd: null })).toBe(1070);
  });

  it("uses static BRL and EUR when live rates missing", () => {
    expect(resolveFxRatePerUsd("BRL")).toBe(5.08);
    expect(resolveFxRatePerUsd("EUR")).toBe(0.92);
  });
});

describe("roundDisplayMajorFromUsd", () => {
  it("redondea ARS al múltiplo de 2.000 más cercano", () => {
    expect(roundDisplayMajorFromUsd(65, "ARS", 1400)).toBe(92_000);
    expect(roundDisplayMajorFromUsd(65, "ARS", 1392.5)).toBe(90_000);
  });

  it("rounds other currencies to integer major units", () => {
    expect(roundDisplayMajorFromUsd(65, "USD", 1)).toBe(65);
    expect(roundDisplayMajorFromUsd(65, "BRL", 5.08)).toBe(330);
    expect(roundDisplayMajorFromUsd(65, "EUR", 0.92)).toBe(60);
  });
});

describe("convertUsdMajorToDisplayMajor", () => {
  it("converts Fernando USD 65/session for AR patient with live FX", () => {
    expect(convertUsdMajorToDisplayMajor(65, "ARS", { arsPerUsd: 1400 })).toBe(92_000);
  });

  it("converts with static ARS fallback", () => {
    expect(convertUsdMajorToDisplayMajor(65, "ARS")).toBe(70_000);
  });
});

describe("formatUsdMajorForPatientDisplay", () => {
  it("formats ARS with code display", () => {
    const label = formatUsdMajorForPatientDisplay({
      usdMajor: 65,
      displayCurrency: "ARS",
      language: "es",
      fxRates: { arsPerUsd: 1400 }
    });
    expect(label).toContain("92");
    expect(label).toMatch(/ARS/i);
  });
});
