import { defaultDisplayCurrencyCodeForPatient } from "@therapy/types";
import { roundSessionPriceArsFromUsd } from "./sessionPriceArs.js";
import {
  STATIC_FX_RATE_FROM_USD,
  coerceSupportedCurrency,
  type SupportedCurrency
} from "./currencies.js";

const LANGUAGE_LOCALE: Record<"es" | "en" | "pt", string> = {
  es: "es-AR",
  en: "en-US",
  pt: "pt-BR"
};

const RESIDENCY_DISPLAY_LOCALE: Record<string, string> = {
  AR: "es-AR",
  BO: "es-BO",
  BR: "pt-BR",
  CL: "es-CL",
  CO: "es-CO",
  CR: "es-CR",
  EC: "es-EC",
  GT: "es-GT",
  MX: "es-MX",
  PY: "es-PY",
  PE: "es-PE",
  UY: "es-UY",
  US: "en-US",
  ES: "es-ES",
  GB: "en-GB",
  ID: "id-ID",
  MY: "ms-MY",
  KE: "en-KE",
  NG: "en-NG"
};

export type DisplayFxRates = {
  /** 1 USD = N unidades de la moneda local. */
  ratesPerUsd?: Partial<Record<SupportedCurrency, number>> | null;
  /** @deprecated Usar `ratesPerUsd.ARS`. */
  arsPerUsd?: number | null;
  /** @deprecated Usar `ratesPerUsd.BRL`. */
  brlPerUsd?: number | null;
  /** @deprecated Usar `ratesPerUsd.EUR`. */
  eurPerUsd?: number | null;
};

function normalizeRatesMap(fxRates?: DisplayFxRates): Partial<Record<SupportedCurrency, number>> {
  const map: Partial<Record<SupportedCurrency, number>> = { ...(fxRates?.ratesPerUsd ?? {}) };
  if (typeof fxRates?.arsPerUsd === "number" && fxRates.arsPerUsd > 0) {
    map.ARS = fxRates.arsPerUsd;
  }
  if (typeof fxRates?.brlPerUsd === "number" && fxRates.brlPerUsd > 0) {
    map.BRL = fxRates.brlPerUsd;
  }
  if (typeof fxRates?.eurPerUsd === "number" && fxRates.eurPerUsd > 0) {
    map.EUR = fxRates.eurPerUsd;
  }
  return map;
}

export function displayCurrencyForMarket(market: string | null | undefined): SupportedCurrency {
  return coerceSupportedCurrency(
    defaultDisplayCurrencyCodeForPatient({ market }),
    "USD"
  );
}

export function defaultDisplayCurrencyForPatient(params: {
  residencyCountry?: string | null;
  market?: string | null;
}): SupportedCurrency {
  return coerceSupportedCurrency(defaultDisplayCurrencyCodeForPatient(params), "USD");
}

export function resolveFxRatePerUsd(
  displayCurrency: SupportedCurrency,
  fxRates?: DisplayFxRates
): number {
  if (displayCurrency === "USD") {
    return 1;
  }
  const live = normalizeRatesMap(fxRates)[displayCurrency];
  if (typeof live === "number" && Number.isFinite(live) && live > 0) {
    return live;
  }
  return STATIC_FX_RATE_FROM_USD[displayCurrency];
}

/**
 * Monedas "duras" de baja denominación: se muestran con conversión exacta (redondeo a
 * entero), sin snapping. Evita alterar montos chicos donde cada unidad importa.
 */
const HARD_LOW_DENOMINATION_CURRENCIES: ReadonlySet<SupportedCurrency> = new Set([
  "USD",
  "EUR",
  "GBP"
]);

/**
 * Paso de redondeo "natural" para un monto ya convertido a moneda local (solo display).
 * Apunta a ~1% del valor y lo ajusta al múltiplo redondo {1,2,5}×10ⁿ más cercano, de modo
 * que el paso escale con la magnitud: montos chicos conservan detalle y montos grandes
 * (COP, IDR, PYG…) pierden los dígitos de ruido (p. ej. COP 83.740 → paso 1.000 → 84.000).
 */
export function niceDisplayRoundStep(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }
  const rough = value / 100;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude; // dentro de [1, 10)
  const unit = normalized < 1.5 ? 1 : normalized < 3.5 ? 2 : normalized < 7.5 ? 5 : 10;
  return Math.max(1, unit * magnitude);
}

/**
 * Redondea el equivalente en moneda local a una cifra "con sentido".
 * ARS mantiene su regla de negocio (múltiplo de 2.000 vía `roundSessionPriceArsFromUsd`);
 * USD/EUR/GBP se muestran exactos; el resto usa redondeo natural por magnitud.
 * Es solo display: el cobro canónico interno sigue en USD.
 */
export function roundDisplayMajorFromUsd(
  usdMajor: number,
  displayCurrency: SupportedCurrency,
  ratePerUsd: number
): number {
  if (displayCurrency === "ARS") {
    return roundSessionPriceArsFromUsd(usdMajor, ratePerUsd);
  }
  const raw = usdMajor * ratePerUsd;
  if (!Number.isFinite(raw) || raw <= 0) {
    return Math.max(0, Math.round(raw));
  }
  if (HARD_LOW_DENOMINATION_CURRENCIES.has(displayCurrency)) {
    return Math.round(raw);
  }
  const step = niceDisplayRoundStep(raw);
  const rounded = Math.round(raw / step) * step;
  // Evita colapsar a 0 valores positivos chicos: sube al primer múltiplo válido.
  return rounded < step ? step : rounded;
}

export function convertUsdMajorToDisplayMajor(
  usdMajor: number,
  displayCurrency: SupportedCurrency,
  fxRates?: DisplayFxRates
): number {
  const ratePerUsd = resolveFxRatePerUsd(displayCurrency, fxRates);
  return roundDisplayMajorFromUsd(usdMajor, displayCurrency, ratePerUsd);
}

function resolveDisplayLocale(params: {
  language: "es" | "en" | "pt";
  residencyCountry?: string | null;
}): string {
  const residency = (params.residencyCountry ?? "").trim().toUpperCase();
  if (residency && RESIDENCY_DISPLAY_LOCALE[residency]) {
    return RESIDENCY_DISPLAY_LOCALE[residency];
  }
  return LANGUAGE_LOCALE[params.language];
}

function formatDisplayMajor(params: {
  amountMajor: number;
  currency: SupportedCurrency;
  language: "es" | "en" | "pt";
  residencyCountry?: string | null;
  maximumFractionDigits?: number;
}): string {
  const locale = resolveDisplayLocale({
    language: params.language,
    residencyCountry: params.residencyCountry
  });
  const fractionDigits =
    params.maximumFractionDigits
    ?? (params.currency === "USD" || params.currency === "EUR" || params.currency === "BRL" || params.currency === "MXN"
      ? 0
      : 0);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: params.currency,
    currencyDisplay: "code",
    maximumFractionDigits: fractionDigits
  }).format(params.amountMajor);
}

/** Convierte USD (unidades mayores) a moneda local de display y formatea para UI paciente. */
export function formatUsdMajorForPatientDisplay(params: {
  usdMajor: number;
  displayCurrency: SupportedCurrency;
  language: "es" | "en" | "pt";
  fxRates?: DisplayFxRates;
  residencyCountry?: string | null;
  maximumFractionDigits?: number;
}): string {
  const converted = convertUsdMajorToDisplayMajor(
    params.usdMajor,
    params.displayCurrency,
    params.fxRates
  );
  return formatDisplayMajor({
    amountMajor: converted,
    currency: params.displayCurrency,
    language: params.language,
    residencyCountry: params.residencyCountry,
    maximumFractionDigits: params.maximumFractionDigits
  });
}
