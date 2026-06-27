import { describe, expect, it } from "vitest";
import { DLOCAL_GO_PAYER_COUNTRIES } from "./dlocalGoCoverage.js";
import {
  defaultDisplayCurrencyCodeForPatient,
  displayCurrencyCodeForResidencyCountry,
  PATIENT_LIVE_FX_CURRENCY_CODES
} from "./patientDisplayCurrency.js";

describe("patientDisplayCurrency", () => {
  it("maps dLocal LatAm countries to local ISO 4217 codes", () => {
    expect(displayCurrencyCodeForResidencyCountry("CO")).toBe("COP");
    expect(displayCurrencyCodeForResidencyCountry("MX")).toBe("MXN");
    expect(displayCurrencyCodeForResidencyCountry("CL")).toBe("CLP");
    expect(displayCurrencyCodeForResidencyCountry("PE")).toBe("PEN");
    expect(displayCurrencyCodeForResidencyCountry("UY")).toBe("UYU");
    expect(displayCurrencyCodeForResidencyCountry("BO")).toBe("BOB");
    expect(displayCurrencyCodeForResidencyCountry("CR")).toBe("CRC");
    expect(displayCurrencyCodeForResidencyCountry("GT")).toBe("GTQ");
    expect(displayCurrencyCodeForResidencyCountry("PY")).toBe("PYG");
  });

  it("uses USD for Ecuador (dollarized)", () => {
    expect(displayCurrencyCodeForResidencyCountry("EC")).toBe("USD");
  });

  it("maps Africa and Asia dLocal countries", () => {
    expect(displayCurrencyCodeForResidencyCountry("ID")).toBe("IDR");
    expect(displayCurrencyCodeForResidencyCountry("MY")).toBe("MYR");
    expect(displayCurrencyCodeForResidencyCountry("KE")).toBe("KES");
    expect(displayCurrencyCodeForResidencyCountry("NG")).toBe("NGN");
  });

  it("prefers residency over commercial market for Colombia", () => {
    expect(
      defaultDisplayCurrencyCodeForPatient({ residencyCountry: "CO", market: "US" })
    ).toBe("COP");
  });

  it("falls back to market when residency is missing", () => {
    expect(defaultDisplayCurrencyCodeForPatient({ residencyCountry: null, market: "AR" })).toBe("ARS");
    expect(defaultDisplayCurrencyCodeForPatient({ residencyCountry: null, market: "BR" })).toBe("BRL");
    expect(defaultDisplayCurrencyCodeForPatient({ residencyCountry: null, market: "US" })).toBe("USD");
  });

  it("lists every non-USD patient FX code used by the portal", () => {
    expect(PATIENT_LIVE_FX_CURRENCY_CODES).toContain("COP");
    expect(PATIENT_LIVE_FX_CURRENCY_CODES).not.toContain("USD");
  });

  it("maps every dLocal Go payer country to a display currency", () => {
    for (const country of DLOCAL_GO_PAYER_COUNTRIES) {
      const currency = displayCurrencyCodeForResidencyCountry(country);
      expect(currency, `missing display currency for ${country}`).toBeTruthy();
      expect(defaultDisplayCurrencyCodeForPatient({ residencyCountry: country })).toBe(currency);
      if (currency !== "USD") {
        expect(PATIENT_LIVE_FX_CURRENCY_CODES).toContain(currency);
      }
    }
  });
});
