type LocalizedText = Record<"es" | "en" | "pt", string>;

export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "BRL",
  "ARS",
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

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/**
 * Tasas estáticas USD → moneda local (fallback cuando el API de FX no responde).
 * Solo display; el cobro canónico interno sigue en USD.
 */
export const STATIC_FX_RATE_FROM_USD: Record<SupportedCurrency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  BRL: 5.08,
  ARS: 1070,
  BOB: 6.91,
  CLP: 930,
  COP: 4100,
  CRC: 510,
  GTQ: 7.75,
  MXN: 17.5,
  PEN: 3.7,
  PYG: 7800,
  UYU: 40,
  IDR: 16200,
  MYR: 4.47,
  KES: 129,
  NGN: 1500
};

export const CURRENCY_LABELS: Record<SupportedCurrency, LocalizedText> = {
  USD: { es: "Dolar estadounidense (USD)", en: "US Dollar (USD)", pt: "Dolar americano (USD)" },
  EUR: { es: "Euro (EUR)", en: "Euro (EUR)", pt: "Euro (EUR)" },
  GBP: { es: "Libra esterlina (GBP)", en: "British Pound (GBP)", pt: "Libra esterlina (GBP)" },
  BRL: { es: "Real brasileno (BRL)", en: "Brazilian Real (BRL)", pt: "Real brasileiro (BRL)" },
  ARS: { es: "Peso argentino (ARS)", en: "Argentine Peso (ARS)", pt: "Peso argentino (ARS)" },
  BOB: { es: "Boliviano (BOB)", en: "Bolivian Boliviano (BOB)", pt: "Boliviano (BOB)" },
  CLP: { es: "Peso chileno (CLP)", en: "Chilean Peso (CLP)", pt: "Peso chileno (CLP)" },
  COP: { es: "Peso colombiano (COP)", en: "Colombian Peso (COP)", pt: "Peso colombiano (COP)" },
  CRC: { es: "Colon costarricense (CRC)", en: "Costa Rican Colon (CRC)", pt: "Colon costarriquenho (CRC)" },
  GTQ: { es: "Quetzal guatemalteco (GTQ)", en: "Guatemalan Quetzal (GTQ)", pt: "Quetzal guatemalteco (GTQ)" },
  MXN: { es: "Peso mexicano (MXN)", en: "Mexican Peso (MXN)", pt: "Peso mexicano (MXN)" },
  PEN: { es: "Sol peruano (PEN)", en: "Peruvian Sol (PEN)", pt: "Sol peruano (PEN)" },
  PYG: { es: "Guarani paraguayo (PYG)", en: "Paraguayan Guarani (PYG)", pt: "Guarani paraguaio (PYG)" },
  UYU: { es: "Peso uruguayo (UYU)", en: "Uruguayan Peso (UYU)", pt: "Peso uruguaio (UYU)" },
  IDR: { es: "Rupia indonesia (IDR)", en: "Indonesian Rupiah (IDR)", pt: "Rupia indonesia (IDR)" },
  MYR: { es: "Ringgit malayo (MYR)", en: "Malaysian Ringgit (MYR)", pt: "Ringgit malaio (MYR)" },
  KES: { es: "Chelín keniano (KES)", en: "Kenyan Shilling (KES)", pt: "Xelim queniano (KES)" },
  NGN: { es: "Naira nigeriana (NGN)", en: "Nigerian Naira (NGN)", pt: "Naira nigeriana (NGN)" }
};

export function isSupportedCurrency(value: unknown): value is SupportedCurrency {
  return typeof value === "string" && (SUPPORTED_CURRENCIES as readonly string[]).includes(value.trim().toUpperCase());
}

export function coerceSupportedCurrency(
  code: string | null | undefined,
  fallback: SupportedCurrency = "USD"
): SupportedCurrency {
  const upper = (code ?? "").trim().toUpperCase();
  return isSupportedCurrency(upper) ? upper : fallback;
}
