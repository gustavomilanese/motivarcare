import type { Market } from "./market.js";
import { PATIENT_PORTAL_RESIDENCY_CODES } from "./residencyMarket.js";

/**
 * Países desde los que dLocal Go puede cobrar a pagadores locales (ISO 3166-1 alpha-2).
 * Fuente: helpcenter.dlocalgo.com — LATAM (incl. PA) + ID, MY, KE, NG.
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
  "PA",
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

const IANA_TZ_TO_DLOCAL_PAYER: Array<[RegExp, string]> = [
  [/Argentina|Buenos_Aires|Catamarca|ComodRivadavia|Cordoba|Jujuy|La_Rioja|Mendoza|Rio_Gallegos|Salta|San_Juan|San_Luis|Tucuman|Ushuaia/i, "AR"],
  [/Sao_Paulo|Fortaleza|Recife|Bahia|Belem|Manaus|Noronha|Porto_Velho|Rio_Branco|Araguaina|Campo_Grande|Cuiaba|Eirunepe|Maceio|Santarem/i, "BR"],
  [/Bogota/i, "CO"],
  [/Santiago|Punta_Arenas/i, "CL"],
  [/Mexico_City|Cancun|Merida|Monterrey|Mazatlan|Tijuana|Hermosillo|Chihuahua|Bahia_Banderas|Matamoros/i, "MX"],
  [/Lima/i, "PE"],
  [/La_Paz/i, "BO"],
  [/Asuncion/i, "PY"],
  [/Montevideo/i, "UY"],
  [/Guayaquil/i, "EC"],
  [/Panama/i, "PA"],
  [/Costa_Rica/i, "CR"],
  [/Guatemala/i, "GT"],
  [/Jakarta|Makassar|Jayapura|Pontianak/i, "ID"],
  [/Kuala_Lumpur|Kuching/i, "MY"],
  [/Nairobi/i, "KE"],
  [/Lagos/i, "NG"]
];

export function normalizeResidencyCountryIso2(code: string | null | undefined): string | null {
  const normalized = (code ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

export function isDlocalGoPayerCountry(iso2: string | null | undefined): boolean {
  const country = normalizeResidencyCountryIso2(iso2);
  return country != null && DLOCAL_GO_PAYER_COUNTRIES.has(country);
}

/** País dLocal a partir de IANA TZ (p. ej. America/Argentina/Buenos_Aires → AR). */
export function inferDlocalPayerCountryFromTimezone(timezone: string | null | undefined): string | null {
  const tz = (timezone ?? "").trim();
  if (!tz) {
    return null;
  }
  for (const [pattern, iso] of IANA_TZ_TO_DLOCAL_PAYER) {
    if (pattern.test(tz)) {
      return iso;
    }
  }
  return null;
}

const US_TZ_HINT =
  /America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Boise|Juneau|Indiana|Kentucky|North_Dakota)|Pacific\/Honolulu/i;

/**
 * Registro / intake: zona horaria primero.
 * Un Chrome `en-US` en Argentina no debe ganar sobre `America/Argentina/Buenos_Aires`.
 */
export function inferPatientPortalResidencyIso2(params?: {
  locales?: readonly string[];
  timezone?: string | null;
}): string {
  const timezone = params?.timezone ?? "";
  const fromDlocalTz = inferDlocalPayerCountryFromTimezone(timezone);
  if (fromDlocalTz) {
    return fromDlocalTz;
  }
  if (US_TZ_HINT.test(timezone)) {
    return "US";
  }
  const allow = new Set<string>(PATIENT_PORTAL_RESIDENCY_CODES);
  for (const loc of params?.locales ?? []) {
    const match = String(loc).match(/[-_]([A-Za-z]{2})$/);
    if (match) {
      const region = match[1].toUpperCase();
      if (allow.has(region)) {
        return region;
      }
    }
  }
  return "AR";
}

/**
 * Si la residencia guardada no es dLocal (US/ES/vacía) y la TZ sí lo es, devolver el ISO a persistir.
 * No pisa una residencia dLocal ya correcta.
 */
export function resolveHealedDlocalResidencyCountry(params: {
  existingResidency: string | null | undefined;
  requestedResidency?: string | null;
  timezone?: string | null;
}): string | null {
  const existing = normalizeResidencyCountryIso2(params.existingResidency);
  if (existing && DLOCAL_GO_PAYER_COUNTRIES.has(existing)) {
    return null;
  }
  const fromTz = inferDlocalPayerCountryFromTimezone(params.timezone);
  if (fromTz && fromTz !== existing) {
    return fromTz;
  }
  if (!existing) {
    return normalizeResidencyCountryIso2(params.requestedResidency);
  }
  return null;
}

/**
 * País que se envía a dLocal Go (`country` en POST /v1/payments).
 * Prioriza residencia declarada; si falta, infiere AR/BR desde el mercado comercial;
 * si la residencia es US/ES por locale del browser, recupera el país dLocal desde la TZ.
 */
export function resolveDlocalPayerCountry(params: {
  residencyCountry: string | null | undefined;
  market: Market;
  timezone?: string | null;
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
  return inferDlocalPayerCountryFromTimezone(params.timezone);
}

export function isDlocalGoCheckoutAvailable(params: {
  residencyCountry: string | null | undefined;
  market: Market;
  timezone?: string | null;
}): boolean {
  return resolveDlocalPayerCountry(params) != null;
}
