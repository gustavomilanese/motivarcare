import { describe, expect, it } from "vitest";
import {
  convertUsdMajorToDisplayMajor,
  defaultDisplayCurrencyForPatient,
  displayCurrencyForMarket,
  formatUsdMajorForPatientDisplay,
  niceDisplayRoundStep,
  resolveFxRatePerUsd,
  roundDisplayMajorFromUsd
} from "./displayFx.js";
import { STATIC_FX_RATE_FROM_USD, SUPPORTED_CURRENCIES } from "./currencies.js";

describe("defaultDisplayCurrencyForPatient", () => {
  it("maps Colombia residency to COP even with US market", () => {
    expect(
      defaultDisplayCurrencyForPatient({ residencyCountry: "CO", market: "US" })
    ).toBe("COP");
  });

  it("maps all dLocal LatAm residency countries", () => {
    expect(defaultDisplayCurrencyForPatient({ residencyCountry: "MX" })).toBe("MXN");
    expect(defaultDisplayCurrencyForPatient({ residencyCountry: "CL" })).toBe("CLP");
    expect(defaultDisplayCurrencyForPatient({ residencyCountry: "PE" })).toBe("PEN");
    expect(defaultDisplayCurrencyForPatient({ residencyCountry: "UY" })).toBe("UYU");
    expect(defaultDisplayCurrencyForPatient({ residencyCountry: "BO" })).toBe("BOB");
    expect(defaultDisplayCurrencyForPatient({ residencyCountry: "CR" })).toBe("CRC");
    expect(defaultDisplayCurrencyForPatient({ residencyCountry: "GT" })).toBe("GTQ");
    expect(defaultDisplayCurrencyForPatient({ residencyCountry: "PY" })).toBe("PYG");
  });
});

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
  it("prefers live rates from ratesPerUsd map", () => {
    expect(resolveFxRatePerUsd("COP", { ratesPerUsd: { COP: 4300 } })).toBe(4300);
    expect(resolveFxRatePerUsd("ARS", { ratesPerUsd: { ARS: 1400 } })).toBe(1400);
  });

  it("supports legacy arsPerUsd field", () => {
    expect(resolveFxRatePerUsd("ARS", { arsPerUsd: 1400 })).toBe(1400);
  });

  it("falls back to static COP when live rate missing", () => {
    expect(resolveFxRatePerUsd("COP")).toBe(4100);
  });
});

describe("roundDisplayMajorFromUsd", () => {
  it("ceil ARS al múltiplo de 500 hacia arriba", () => {
    expect(roundDisplayMajorFromUsd(65, "ARS", 1400)).toBe(91_000);
    expect(roundDisplayMajorFromUsd(40.001, "ARS", 1000)).toBe(40_500);
  });

  it("ceil COP al múltiplo de 500 hacia arriba", () => {
    // 20 * 4187 = 83_740 → ceil×500 = 84_000
    expect(roundDisplayMajorFromUsd(20, "COP", 4187)).toBe(84_000);
    expect(roundDisplayMajorFromUsd(65, "COP", 4200)).toBe(273_000);
  });

  it("ceil CLP / MXN / BRL al múltiplo de 500", () => {
    // 65 * 950 = 61_750 → 62_000
    expect(roundDisplayMajorFromUsd(65, "CLP", 950)).toBe(62_000);
    expect(roundDisplayMajorFromUsd(65, "MXN", 18)).toBe(1_500);
    expect(roundDisplayMajorFromUsd(65, "BRL", 5.08)).toBe(500);
  });

  it("muestra USD/EUR/GBP con conversión exacta (sin snapping)", () => {
    expect(roundDisplayMajorFromUsd(65, "USD", 1)).toBe(65);
    expect(roundDisplayMajorFromUsd(65, "EUR", 0.92)).toBe(60);
    expect(roundDisplayMajorFromUsd(65, "GBP", 0.79)).toBe(51);
  });

  it("nunca colapsa un monto positivo a 0", () => {
    expect(roundDisplayMajorFromUsd(0.1, "COP", 4200)).toBeGreaterThan(0);
  });
});

describe("niceDisplayRoundStep", () => {
  it("escala el paso con la magnitud del valor (helper legado)", () => {
    expect(niceDisplayRoundStep(65)).toBe(1);
    expect(niceDisplayRoundStep(800)).toBe(10);
    expect(niceDisplayRoundStep(18_600)).toBe(200);
    expect(niceDisplayRoundStep(83_740)).toBe(1_000);
    expect(niceDisplayRoundStep(324_000)).toBe(2_000);
    expect(niceDisplayRoundStep(700_000)).toBe(5_000);
  });

  it("es robusto ante valores no válidos", () => {
    expect(niceDisplayRoundStep(0)).toBe(1);
    expect(niceDisplayRoundStep(-5)).toBe(1);
    expect(niceDisplayRoundStep(Number.NaN)).toBe(1);
  });
});

describe("redondeo ceil×500 para monedas locales (fallback estático)", () => {
  const SESSION_PRICES_USD = [15, 20, 35, 50, 65, 90, 120];
  const HARD = new Set(["USD", "EUR", "GBP"]);

  for (const currency of SUPPORTED_CURRENCIES) {
    it(`${currency}: múltiplo de 500 (o exacto si hard) y nunca por debajo del crudo`, () => {
      const rate = STATIC_FX_RATE_FROM_USD[currency];
      for (const usd of SESSION_PRICES_USD) {
        const raw = usd * rate;
        const value = roundDisplayMajorFromUsd(usd, currency, rate);
        expect(value).toBeGreaterThan(0);
        if (HARD.has(currency)) {
          expect(value).toBe(Math.round(raw));
        } else {
          expect(value % 500).toBe(0);
          expect(value).toBeGreaterThanOrEqual(raw - 1e-9);
        }
      }
    });
  }
});

describe("convertUsdMajorToDisplayMajor", () => {
  it("converts Fernando USD 65/session for Colombian patient", () => {
    expect(convertUsdMajorToDisplayMajor(65, "COP", { ratesPerUsd: { COP: 4200 } })).toBe(273_000);
  });
});

describe("formatUsdMajorForPatientDisplay", () => {
  it("formats COP with Colombian locale", () => {
    const label = formatUsdMajorForPatientDisplay({
      usdMajor: 65,
      displayCurrency: "COP",
      language: "es",
      residencyCountry: "CO",
      fxRates: { ratesPerUsd: { COP: 4200 } }
    });
    expect(label).toMatch(/COP/i);
    expect(label.replace(/\D/g, "")).toContain("273000");
  });

  it("formats ARS with code display", () => {
    const label = formatUsdMajorForPatientDisplay({
      usdMajor: 65,
      displayCurrency: "ARS",
      language: "es",
      fxRates: { ratesPerUsd: { ARS: 1400 } }
    });
    expect(label).toContain("91");
    expect(label).toMatch(/ARS/i);
  });
});
