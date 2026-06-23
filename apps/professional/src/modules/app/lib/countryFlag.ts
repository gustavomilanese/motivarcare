const ISO3_TO_ISO2: Record<string, string> = {
  ARG: "AR",
  URY: "UY",
  BRA: "BR",
  CHL: "CL",
  MEX: "MX",
  VEN: "VE",
  ESP: "ES",
  USA: "US",
  COL: "CO",
  PER: "PE",
  PRY: "PY",
  BOL: "BO",
  ECU: "EC",
  PAN: "PA",
  CRI: "CR",
  GTM: "GT",
  HND: "HN",
  SLV: "SV",
  NIC: "NI",
  DOM: "DO"
};

const COUNTRY_ALIASES_TO_ISO2: Record<string, string> = {
  argentina: "AR",
  uruguay: "UY",
  brasil: "BR",
  brazil: "BR",
  chile: "CL",
  mexico: "MX",
  venezuela: "VE",
  espana: "ES",
  spain: "ES",
  "estados unidos": "US",
  "united states": "US",
  colombia: "CO",
  peru: "PE",
  paraguay: "PY",
  bolivia: "BO",
  ecuador: "EC",
  panama: "PA",
  "costa rica": "CR",
  guatemala: "GT",
  honduras: "HN",
  "el salvador": "SV",
  nicaragua: "NI",
  "republica dominicana": "DO",
  "dominican republic": "DO"
};

const FLAG_PAIR_REGEX = /^[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]$/u;

function normalizeCountry(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function iso2ToFlag(iso2: string): string {
  const upper = iso2.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) {
    return "";
  }

  const first = upper.charCodeAt(0) - 65 + 0x1f1e6;
  const second = upper.charCodeAt(1) - 65 + 0x1f1e6;
  return String.fromCodePoint(first, second);
}

export function countryToFlag(country: string | null): string {
  if (!country) {
    return "";
  }

  const raw = country.trim();
  if (raw.length === 0) {
    return "";
  }

  if (FLAG_PAIR_REGEX.test(raw)) {
    return raw;
  }

  const normalized = normalizeCountry(raw);
  if (normalized.length === 2 && /^[a-z]{2}$/.test(normalized)) {
    return iso2ToFlag(normalized);
  }

  if (normalized.length === 3 && /^[a-z]{3}$/.test(normalized)) {
    const iso2 = ISO3_TO_ISO2[normalized.toUpperCase()];
    return iso2 ? iso2ToFlag(iso2) : "";
  }

  const exact = COUNTRY_ALIASES_TO_ISO2[normalized];
  if (exact) {
    return iso2ToFlag(exact);
  }

  for (const [alias, iso2] of Object.entries(COUNTRY_ALIASES_TO_ISO2)) {
    if (normalized.includes(alias)) {
      return iso2ToFlag(iso2);
    }
  }

  return "";
}
