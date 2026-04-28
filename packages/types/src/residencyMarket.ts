import type { Market } from "./market.js";

/**
 * ISO 3166-1 alpha-2 (mayúsculas). Latinoamérica y Caribe (M49) salvo AR y BR,
 * que tienen mercado propio. Sirve para “resto LatAm → mercado US (USD)”.
 */
const LATIN_AMERICA_AND_CARIBBEAN_ISO = new Set<string>([
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

export type ResidencyCountryOption = {
  code: string;
  names: { es: string; en: string; pt: string };
};

/**
 * Subconjunto para registro/intake web del paciente (producto acotado).
 * El resto de países queda fuera del combo hasta habilitarlos de nuevo.
 */
export const PATIENT_PORTAL_RESIDENCY_CODES = ["AR", "BR", "CO", "US"] as const;

export function filterResidencyOptionsForPatientPortal(
  options: readonly ResidencyCountryOption[]
): ResidencyCountryOption[] {
  const allow = new Set<string>([...PATIENT_PORTAL_RESIDENCY_CODES]);
  return options.filter((o) => allow.has(o.code));
}

/** Opciones para selects de residencia (valor = ISO2). Incluye LatAm, US, ES y otros frecuentes. */
export const RESIDENCY_COUNTRY_OPTIONS: ResidencyCountryOption[] = [
  { code: "AR", names: { es: "Argentina", en: "Argentina", pt: "Argentina" } },
  { code: "BR", names: { es: "Brasil", en: "Brazil", pt: "Brasil" } },
  { code: "US", names: { es: "Estados Unidos", en: "United States", pt: "Estados Unidos" } },
  { code: "ES", names: { es: "España", en: "Spain", pt: "Espanha" } },
  { code: "MX", names: { es: "México", en: "Mexico", pt: "Mexico" } },
  { code: "CL", names: { es: "Chile", en: "Chile", pt: "Chile" } },
  { code: "CO", names: { es: "Colombia", en: "Colombia", pt: "Colombia" } },
  { code: "PE", names: { es: "Perú", en: "Peru", pt: "Peru" } },
  { code: "UY", names: { es: "Uruguay", en: "Uruguay", pt: "Uruguay" } },
  { code: "PY", names: { es: "Paraguay", en: "Paraguay", pt: "Paraguai" } },
  { code: "BO", names: { es: "Bolivia", en: "Bolivia", pt: "Bolivia" } },
  { code: "EC", names: { es: "Ecuador", en: "Ecuador", pt: "Equador" } },
  { code: "VE", names: { es: "Venezuela", en: "Venezuela", pt: "Venezuela" } },
  { code: "CR", names: { es: "Costa Rica", en: "Costa Rica", pt: "Costa Rica" } },
  { code: "PA", names: { es: "Panamá", en: "Panama", pt: "Panama" } },
  { code: "GT", names: { es: "Guatemala", en: "Guatemala", pt: "Guatemala" } },
  { code: "HN", names: { es: "Honduras", en: "Honduras", pt: "Honduras" } },
  { code: "SV", names: { es: "El Salvador", en: "El Salvador", pt: "El Salvador" } },
  { code: "NI", names: { es: "Nicaragua", en: "Nicaragua", pt: "Nicaragua" } },
  { code: "CU", names: { es: "Cuba", en: "Cuba", pt: "Cuba" } },
  { code: "DO", names: { es: "República Dominicana", en: "Dominican Republic", pt: "Republica Dominicana" } },
  { code: "PR", names: { es: "Puerto Rico", en: "Puerto Rico", pt: "Porto Rico" } },
  { code: "CA", names: { es: "Canadá", en: "Canada", pt: "Canada" } },
  { code: "PT", names: { es: "Portugal", en: "Portugal", pt: "Portugal" } },
  { code: "FR", names: { es: "Francia", en: "France", pt: "Franca" } },
  { code: "DE", names: { es: "Alemania", en: "Germany", pt: "Alemanha" } },
  { code: "IT", names: { es: "Italia", en: "Italy", pt: "Italia" } },
  { code: "GB", names: { es: "Reino Unido", en: "United Kingdom", pt: "Reino Unido" } },
  { code: "IE", names: { es: "Irlanda", en: "Ireland", pt: "Irlanda" } },
  { code: "NL", names: { es: "Países Bajos", en: "Netherlands", pt: "Paises Baixos" } },
  { code: "BE", names: { es: "Bélgica", en: "Belgium", pt: "Belgica" } },
  { code: "CH", names: { es: "Suiza", en: "Switzerland", pt: "Suica" } },
  { code: "AT", names: { es: "Austria", en: "Austria", pt: "Austria" } },
  { code: "SE", names: { es: "Suecia", en: "Sweden", pt: "Suecia" } },
  { code: "NO", names: { es: "Noruega", en: "Norway", pt: "Noruega" } },
  { code: "DK", names: { es: "Dinamarca", en: "Denmark", pt: "Dinamarca" } },
  { code: "FI", names: { es: "Finlandia", en: "Finland", pt: "Finlandia" } },
  { code: "PL", names: { es: "Polonia", en: "Poland", pt: "Polonia" } },
  { code: "CZ", names: { es: "República Checa", en: "Czech Republic", pt: "Republica Tcheca" } },
  { code: "GR", names: { es: "Grecia", en: "Greece", pt: "Grecia" } },
  { code: "IL", names: { es: "Israel", en: "Israel", pt: "Israel" } },
  { code: "AU", names: { es: "Australia", en: "Australia", pt: "Australia" } },
  { code: "NZ", names: { es: "Nueva Zelanda", en: "New Zealand", pt: "Nova Zelandia" } },
  { code: "JP", names: { es: "Japón", en: "Japan", pt: "Japao" } },
  { code: "KR", names: { es: "Corea del Sur", en: "South Korea", pt: "Coreia do Sul" } },
  { code: "IN", names: { es: "India", en: "India", pt: "India" } },
  { code: "ZA", names: { es: "Sudáfrica", en: "South Africa", pt: "Africa do Sul" } }
].sort((a, b) => a.names.es.localeCompare(b.names.es, "es"));

/**
 * Mercado comercial a partir del país de residencia (ISO2).
 * - AR / US / BR / ES → mismo código de mercado.
 * - Resto de Latinoamérica y Caribe (salvo AR/BR) → US (catálogo en USD normalizado).
 * - Resto del mundo → US (internacional / Stripe por defecto).
 */
export function marketFromResidencyCountry(iso2: string | null | undefined): Market {
  const c = (iso2 ?? "").trim().toUpperCase();
  if (c === "AR") {
    return "AR";
  }
  if (c === "US") {
    return "US";
  }
  if (c === "BR") {
    return "BR";
  }
  if (c === "ES") {
    return "ES";
  }
  if (LATIN_AMERICA_AND_CARIBBEAN_ISO.has(c)) {
    return "US";
  }
  return "US";
}

export function residencyCountryLabel(
  code: string | null | undefined,
  language: "es" | "en" | "pt"
): string {
  const c = (code ?? "").trim().toUpperCase();
  const row = RESIDENCY_COUNTRY_OPTIONS.find((o) => o.code === c);
  return row ? row.names[language] : c || "—";
}
