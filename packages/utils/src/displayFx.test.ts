import { describe, expect, it } from "vitest";
import {
  convertUsdMajorToDisplayMajor,
  defaultDisplayCurrencyForPatient,
  displayCurrencyForMarket,
  formatUsdMajorForPatientDisplay,
  resolveFxRatePerUsd,
  roundDisplayMajorFromUsd
} from "./displayFx.js";

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

  it("rounds COP and CLP to hundreds", () => {
    expect(roundDisplayMajorFromUsd(65, "COP", 4200)).toBe(273_000);
    expect(roundDisplayMajorFromUsd(65, "CLP", 950)).toBe(61_800);
  });

  it("rounds BRL and MXN to integer major units", () => {
    expect(roundDisplayMajorFromUsd(65, "BRL", 5.08)).toBe(330);
    expect(roundDisplayMajorFromUsd(65, "MXN", 18)).toBe(1170);
  });
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
    expect(label).toContain("92");
    expect(label).toMatch(/ARS/i);
  });
});
