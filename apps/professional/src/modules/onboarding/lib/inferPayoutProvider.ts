import type { PayoutProvider } from "../components/ProfessionalPayoutSetupPanel";

/** LatAm + Caribe (ISO 3166-1 alpha-2), incluyendo AR y BR. */
const DLOCAL_PAYOUT_ISO = new Set<string>([
  "AR",
  "BR",
  "AI",
  "AG",
  "AW",
  "BS",
  "BB",
  "BZ",
  "BM",
  "BO",
  "VG",
  "KY",
  "CL",
  "CO",
  "CR",
  "CU",
  "CW",
  "DM",
  "DO",
  "EC",
  "SV",
  "FK",
  "GF",
  "GD",
  "GP",
  "GT",
  "GY",
  "HT",
  "HN",
  "JM",
  "MQ",
  "MX",
  "MS",
  "NI",
  "PA",
  "PY",
  "PE",
  "PR",
  "BL",
  "KN",
  "LC",
  "MF",
  "VC",
  "SX",
  "SR",
  "TT",
  "TC",
  "UY",
  "VE",
  "VI"
]);

const LATAM_TIMEZONE_HINT =
  /Argentina|Bogota|Lima|Santiago|Mexico|Sao_Paulo|Montevideo|Caracas|La_Paz|Asuncion|Guayaquil|Panama|Costa_Rica|Guatemala|Havana|Jamaica|Port_of_Spain|El_Salvador|Nicaragua|Tegucigalpa|Guyana|Suriname|Barbados|Belize|Cayman|Aruba|Curacao|Port-au-Prince|Martinique|Guadeloupe|Puerto_Rico|Dominica|Grenada|Antigua|Bahamas|Bermuda|St_/i;

/** Residencia del profesional → proveedor de cobros (Latam: DLocal; resto: Stripe). */
export function inferPayoutProviderFromResidencyCountry(iso: string): PayoutProvider {
  const code = iso.trim().toUpperCase();
  if (!code) {
    return inferPayoutProviderFromBrowser();
  }
  if (code === "US") {
    return "stripe";
  }
  if (DLOCAL_PAYOUT_ISO.has(code)) {
    return "dlocal";
  }
  return "stripe";
}

/** Aproximación por zona horaria del navegador cuando aún no hay país de residencia. */
export function inferPayoutProviderFromBrowser(): PayoutProvider {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (LATAM_TIMEZONE_HINT.test(tz)) {
      return "dlocal";
    }
    if (tz.startsWith("America/")) {
      return "stripe";
    }
  } catch {
    // ignore
  }
  return "dlocal";
}
