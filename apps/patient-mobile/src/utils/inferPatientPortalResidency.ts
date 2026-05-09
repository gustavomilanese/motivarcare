import { PATIENT_PORTAL_RESIDENCY_CODES } from "@therapy/types";

const ALLOW = new Set<string>(PATIENT_PORTAL_RESIDENCY_CODES);

/**
 * Sin selector en registro móvil: la API exige ISO2. Alinear con portal web (AuthScreen).
 * El usuario puede afinar en intake.
 */
export function inferPatientPortalResidencyIso2(): string {
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions();
    const locale = resolved.locale ?? "";
    const fromLocale = locale.match(/-([A-Za-z]{2})$/);
    if (fromLocale) {
      const region = fromLocale[1].toUpperCase();
      if (ALLOW.has(region)) return region;
    }
    const tz = resolved.timeZone ?? "";
    if (/Argentina|Buenos_Aires|Cordoba|Mendoza|Ushuaia|Salta/i.test(tz)) return "AR";
    if (/Sao_Paulo|Fortaleza|Recife|Bahia|Belem|Manaus|Brazil/i.test(tz)) return "BR";
    if (/Bogota/i.test(tz)) return "CO";
    if (/New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Honolulu|Detroit|Indianapolis/i.test(tz)) {
      return "US";
    }
  } catch {
    // ignore
  }
  return "AR";
}
