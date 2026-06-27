import { normalizeResidencyCountryIso2 } from "./dlocalGoCoverage.js";

/**
 * Moneda de display del paciente según país de residencia (ISO 3166-1 alpha-2).
 * Incluye países dLocal Go + mercados frecuentes del portal.
 */
export const RESIDENCY_DISPLAY_CURRENCY: Record<string, string> = {
  AR: "ARS",
  BO: "BOB",
  BR: "BRL",
  CL: "CLP",
  CO: "COP",
  CR: "CRC",
  EC: "USD",
  GT: "GTQ",
  MX: "MXN",
  PY: "PYG",
  PE: "PEN",
  UY: "UYU",
  ID: "IDR",
  MY: "MYR",
  KE: "KES",
  NG: "NGN",
  US: "USD",
  ES: "EUR",
  GB: "GBP"
};

/** Monedas para las que el portal paciente puede pedir cotización live (1 unidad USD = N local). */
export const PATIENT_LIVE_FX_CURRENCY_CODES = [
  "ARS",
  "BRL",
  "EUR",
  "GBP",
  "BOB",
  "CLP",
  "COP",
  "CRC",
  "GTQ",
  "MXN",
  "PEN",
  "PYG",
  "UYU",
  "IDR",
  "MYR",
  "KES",
  "NGN"
] as const;

export type PatientLiveFxCurrencyCode = (typeof PATIENT_LIVE_FX_CURRENCY_CODES)[number];

export function displayCurrencyCodeForResidencyCountry(iso2: string | null | undefined): string | null {
  const country = normalizeResidencyCountryIso2(iso2);
  if (!country) {
    return null;
  }
  return RESIDENCY_DISPLAY_CURRENCY[country] ?? null;
}

/**
 * Moneda de display recomendada para un paciente.
 * Prioriza residencia; si falta, infiere desde mercado comercial.
 */
export function defaultDisplayCurrencyCodeForPatient(params: {
  residencyCountry?: string | null;
  market?: string | null;
}): string {
  const fromResidency = displayCurrencyCodeForResidencyCountry(params.residencyCountry);
  if (fromResidency) {
    return fromResidency;
  }

  const market = (params.market ?? "").trim().toUpperCase();
  switch (market) {
    case "AR":
      return "ARS";
    case "BR":
      return "BRL";
    case "ES":
      return "EUR";
    default:
      return "USD";
  }
}
