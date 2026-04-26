export const SUPPORTED_LANGUAGES = ["es", "en", "pt"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "BRL", "ARS"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export type LocalizedText = Record<AppLanguage, string>;

const LANGUAGE_LOCALE: Record<AppLanguage, string> = {
  es: "es-AR",
  en: "en-US",
  pt: "pt-BR"
};

const CURRENCY_RATE_FROM_USD: Record<SupportedCurrency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  BRL: 5.08,
  ARS: 1070
};

const LANGUAGE_LABELS: Record<AppLanguage, LocalizedText> = {
  es: { es: "Espanol", en: "Spanish", pt: "Espanhol" },
  en: { es: "Ingles", en: "English", pt: "Ingles" },
  pt: { es: "Portugues", en: "Portuguese", pt: "Portugues" }
};

const CURRENCY_LABELS: Record<SupportedCurrency, LocalizedText> = {
  USD: { es: "Dolar estadounidense (USD)", en: "US Dollar (USD)", pt: "Dolar americano (USD)" },
  EUR: { es: "Euro (EUR)", en: "Euro (EUR)", pt: "Euro (EUR)" },
  GBP: { es: "Libra esterlina (GBP)", en: "British Pound (GBP)", pt: "Libra esterlina (GBP)" },
  BRL: { es: "Real brasileno (BRL)", en: "Brazilian Real (BRL)", pt: "Real brasileiro (BRL)" },
  ARS: { es: "Peso argentino (ARS)", en: "Argentine Peso (ARS)", pt: "Peso argentino (ARS)" }
};

export function localeFromLanguage(language: AppLanguage): string {
  return LANGUAGE_LOCALE[language];
}

export function textByLanguage(language: AppLanguage, value: LocalizedText): string {
  return value[language];
}

export function languageOptionLabel(option: AppLanguage, uiLanguage: AppLanguage): string {
  return LANGUAGE_LABELS[option][uiLanguage];
}

export function currencyOptionLabel(currency: SupportedCurrency, uiLanguage: AppLanguage): string {
  return CURRENCY_LABELS[currency][uiLanguage];
}

export function convertUsdAmount(amountInUsd: number, currency: SupportedCurrency): number {
  return amountInUsd * CURRENCY_RATE_FROM_USD[currency];
}

export function convertUsdCents(centsInUsd: number, currency: SupportedCurrency): number {
  return Math.round(convertUsdAmount(centsInUsd / 100, currency) * 100);
}

/**
 * @deprecated Convierte un monto en USD a la moneda destino con tasa hardcodeada.
 * Usar `formatCurrencyMajor` cuando el monto ya esté expresado en la moneda final
 * (p. ej. precios devueltos por el API en `currency` nativa del market).
 */
export function formatCurrencyAmount(params: {
  amountInUsd: number;
  currency: SupportedCurrency;
  language: AppLanguage;
  maximumFractionDigits?: number;
}): string {
  const locale = localeFromLanguage(params.language);
  const converted = convertUsdAmount(params.amountInUsd, params.currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: params.currency,
    maximumFractionDigits: params.maximumFractionDigits ?? 0
  }).format(converted);
}

/** @deprecated Igual que `formatCurrencyAmount` pero recibe centavos. */
export function formatCurrencyCents(params: {
  centsInUsd: number;
  currency: SupportedCurrency;
  language: AppLanguage;
  maximumFractionDigits?: number;
}): string {
  return formatCurrencyAmount({
    amountInUsd: params.centsInUsd / 100,
    currency: params.currency,
    language: params.language,
    maximumFractionDigits: params.maximumFractionDigits
  });
}

function normalizeCurrencyCode(currency: string | null | undefined, fallback: SupportedCurrency): SupportedCurrency {
  if (!currency) {
    return fallback;
  }
  const upper = currency.trim().toUpperCase();
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(upper) ? (upper as SupportedCurrency) : fallback;
}

/**
 * Formatea un monto que YA está expresado en la moneda final (no convierte).
 * Para precios que vienen del API en su moneda nativa (p. ej. ARS para market AR).
 *
 * Por defecto usa `currencyDisplay: "code"` (p. ej. "ARS 380.000", "USD 95").
 * El símbolo "$" es ambiguo en LATAM (lo comparten ARS, USD, MXN, CLP, etc.) y
 * un paciente argentino mirando "$ 380" no puede saber si son pesos o dólares.
 * Mostrar el código ISO disipa cualquier duda y es práctica estándar en
 * plataformas multimercado.
 */
export function formatCurrencyMajor(params: {
  /** Monto en unidades mayores (no centavos). */
  amountMajor: number;
  /** Código ISO de la moneda — case-insensitive. */
  currency: string;
  language: AppLanguage;
  maximumFractionDigits?: number;
  fallbackCurrency?: SupportedCurrency;
  /**
   * Cómo mostrar la moneda. Por defecto `"code"` (ARS, USD, EUR, BRL).
   * Pasar `"symbol"` para mostrar "$ / US$ / € / R$" (sólo si el contexto
   * deja inequívocamente claro de qué moneda se trata).
   */
  currencyDisplay?: "code" | "symbol" | "narrowSymbol" | "name";
}): string {
  const code = normalizeCurrencyCode(params.currency, params.fallbackCurrency ?? "USD");
  const locale = localeFromLanguage(params.language);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    currencyDisplay: params.currencyDisplay ?? "code",
    maximumFractionDigits: params.maximumFractionDigits ?? 0
  }).format(params.amountMajor);
}

/**
 * Formatea un monto en centavos que YA está expresado en la moneda final (no convierte).
 * Útil para `priceCents` devuelto por el API junto con `currency`.
 */
export function formatCurrencyMinor(params: {
  /** Monto en centavos / unidades menores. */
  amountMinor: number;
  /** Código ISO de la moneda — case-insensitive. */
  currency: string;
  language: AppLanguage;
  maximumFractionDigits?: number;
  fallbackCurrency?: SupportedCurrency;
  currencyDisplay?: "code" | "symbol" | "narrowSymbol" | "name";
}): string {
  return formatCurrencyMajor({
    amountMajor: params.amountMinor / 100,
    currency: params.currency,
    language: params.language,
    maximumFractionDigits: params.maximumFractionDigits,
    fallbackCurrency: params.fallbackCurrency,
    currencyDisplay: params.currencyDisplay
  });
}

/**
 * Devuelve la moneda mostrada por defecto para un mercado dado
 * (residencia del paciente). Mantiene la regla "residencia marca el mercado".
 */
export function defaultDisplayCurrencyForMarket(market: string | null | undefined): SupportedCurrency {
  switch ((market ?? "").toUpperCase()) {
    case "AR":
      return "ARS";
    case "BR":
      return "BRL";
    case "ES":
      return "EUR";
    case "US":
    default:
      return "USD";
  }
}

export function formatDateWithLocale(params: {
  value: string;
  language: AppLanguage;
  timeZone?: string;
  options: Intl.DateTimeFormatOptions;
}): string {
  return new Intl.DateTimeFormat(localeFromLanguage(params.language), {
    ...params.options,
    ...(params.timeZone ? { timeZone: params.timeZone } : {})
  }).format(new Date(params.value));
}

export function replaceTemplate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((result, [key, value]) => {
    return result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }, template);
}
