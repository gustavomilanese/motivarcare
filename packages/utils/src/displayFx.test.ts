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
  it("redondea ARS al múltiplo de 2.000 más cercano", () => {
    expect(roundDisplayMajorFromUsd(65, "ARS", 1400)).toBe(92_000);
  });

  it("limpia el ruido de montos grandes en COP (valor raro → cifra redonda)", () => {
    // Antes daba COP 83.740 (paso 100). Ahora el paso escala a 1.000.
    expect(roundDisplayMajorFromUsd(20, "COP", 4187)).toBe(84_000);
    expect(roundDisplayMajorFromUsd(65, "COP", 4200)).toBe(274_000);
  });

  it("redondea CLP a un paso natural según magnitud", () => {
    expect(roundDisplayMajorFromUsd(65, "CLP", 950)).toBe(62_000);
  });

  it("preserva montos ya limpios en monedas de baja denominación", () => {
    expect(roundDisplayMajorFromUsd(65, "BRL", 5.08)).toBe(330);
    expect(roundDisplayMajorFromUsd(65, "MXN", 18)).toBe(1170);
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
  it("escala el paso con la magnitud del valor", () => {
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

describe("redondeo con sentido para todas las monedas (fallback estático)", () => {
  const SESSION_PRICES_USD = [15, 20, 35, 50, 65, 90, 120];

  for (const currency of SUPPORTED_CURRENCIES) {
    it(`${currency}: el equivalente es múltiplo de su paso natural y con error < 3%`, () => {
      const rate = STATIC_FX_RATE_FROM_USD[currency];
      for (const usd of SESSION_PRICES_USD) {
        const raw = usd * rate;
        const value = roundDisplayMajorFromUsd(usd, currency, rate);
        expect(value).toBeGreaterThan(0);
        // El valor mostrado no debe desviarse más de ~3% del real.
        const relativeError = Math.abs(value - raw) / raw;
        expect(relativeError).toBeLessThan(0.03);
        // No debe tener dígitos de "ruido": múltiplo de su paso (salvo ARS/hard que ya validamos aparte).
        if (currency !== "ARS" && !["USD", "EUR", "GBP"].includes(currency)) {
          const step = niceDisplayRoundStep(raw);
          expect(value % step).toBe(0);
        }
      }
    });
  }
});

describe("convertUsdMajorToDisplayMajor", () => {
  it("converts Fernando USD 65/session for Colombian patient", () => {
    expect(convertUsdMajorToDisplayMajor(65, "COP", { ratesPerUsd: { COP: 4200 } })).toBe(274_000);
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
    expect(label.replace(/\D/g, "")).toContain("274000");
  });

  it("formats ARS with code display", () => {
    const label = formatUsdMajorForPatientDisplay({
      usdMajor: 65,
      displayCurrency: "ARS",
      language: "es",
      fxRates: { ratesPerUsd: { ARS: 1400 } }
    });
    expect(label).toContain("92");
    expect(label).toMatch(/ARS/i);
  });
});
