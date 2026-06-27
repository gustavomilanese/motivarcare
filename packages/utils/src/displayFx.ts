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

/** Coherente con `roundSessionPriceArsFromUsd` (misma regla para ARS). */
export function roundDisplayMajorFromUsd(
  usdMajor: number,
  displayCurrency: SupportedCurrency,
  ratePerUsd: number
): number {
  if (displayCurrency === "ARS") {
    return roundSessionPriceArsFromUsd(usdMajor, ratePerUsd);
  }
  const raw = usdMajor * ratePerUsd;
  if (displayCurrency === "IDR" || displayCurrency === "PYG" || displayCurrency === "NGN") {
    return Math.round(raw / 100) * 100;
  }
  if (displayCurrency === "COP" || displayCurrency === "CLP") {
    return Math.round(raw / 100) * 100;
  }
  return Math.round(raw);
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
