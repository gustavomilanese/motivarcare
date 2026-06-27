import type { Market } from "./market.js";

/**
 * Países desde los que dLocal Go puede cobrar a pagadores locales (ISO 3166-1 alpha-2).
 * Fuente: helpcenter.dlocalgo.com — LATAM + ID, MY, KE, NG.
 */
export const DLOCAL_GO_PAYER_COUNTRIES = new Set<string>([
  "AR",
  "BO",
  "BR",
  "CL",
  "CO",
  "CR",
  "EC",
  "GT",
  "MX",
  "PY",
  "PE",
  "UY",
  "ID",
  "MY",
  "KE",
  "NG"
]);

export const DLOCAL_CHECKOUT_UNAVAILABLE_ERROR =
  "Online checkout is not available for your country of residence yet";

export function normalizeResidencyCountryIso2(code: string | null | undefined): string | null {
  const normalized = (code ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

export function isDlocalGoPayerCountry(iso2: string | null | undefined): boolean {
  const country = normalizeResidencyCountryIso2(iso2);
  return country != null && DLOCAL_GO_PAYER_COUNTRIES.has(country);
}

/**
 * País que se envía a dLocal Go (`country` en POST /v1/payments).
 * Prioriza residencia declarada; si falta, infiere AR/BR desde el mercado comercial.
 */
export function resolveDlocalPayerCountry(params: {
  residencyCountry: string | null | undefined;
  market: Market;
}): string | null {
  const residency = normalizeResidencyCountryIso2(params.residencyCountry);
  if (residency && DLOCAL_GO_PAYER_COUNTRIES.has(residency)) {
    return residency;
  }
  if (params.market === "AR") {
    return "AR";
  }
  if (params.market === "BR") {
    return "BR";
  }
  return null;
}

export function isDlocalGoCheckoutAvailable(params: {
  residencyCountry: string | null | undefined;
  market: Market;
}): boolean {
  return resolveDlocalPayerCountry(params) != null;
}
