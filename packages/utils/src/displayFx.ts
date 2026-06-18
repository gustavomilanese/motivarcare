import { roundSessionPriceArsFromUsd } from "./sessionPriceArs.js";

type AppLanguage = "es" | "en" | "pt";
type SupportedCurrency = "USD" | "EUR" | "GBP" | "BRL" | "ARS";

/** Static USD→local rates when live FX is unavailable (must match billing fallbacks). */
export const STATIC_FX_RATE_FROM_USD: Record<"ARS" | "BRL" | "EUR" | "USD", number> = {
  USD: 1,
  ARS: 1070,
  BRL: 5.08,
  EUR: 0.92
};

const LANGUAGE_LOCALE: Record<AppLanguage, string> = {
  es: "es-AR",
  en: "en-US",
  pt: "pt-BR"
};

export type DisplayFxRates = {
  arsPerUsd?: number | null;
  brlPerUsd?: number | null;
  eurPerUsd?: number | null;
};

export function displayCurrencyForMarket(market: string | null | undefined): SupportedCurrency {
  const code = (market ?? "").trim().toUpperCase();
  switch (code) {
    case "AR":
      return "ARS";
    case "BR":
      return "BRL";
    case "ES":
      return "EUR";
    default:
      return "USD";
  }
}

export function resolveFxRatePerUsd(
  displayCurrency: SupportedCurrency,
  fxRates?: DisplayFxRates
): number {
  switch (displayCurrency) {
    case "ARS": {
      const live = fxRates?.arsPerUsd;
      if (typeof live === "number" && Number.isFinite(live) && live > 0) {
        return live;
      }
      return STATIC_FX_RATE_FROM_USD.ARS;
    }
    case "BRL": {
      const live = fxRates?.brlPerUsd;
      if (typeof live === "number" && Number.isFinite(live) && live > 0) {
        return live;
      }
      return STATIC_FX_RATE_FROM_USD.BRL;
    }
    case "EUR": {
      const live = fxRates?.eurPerUsd;
      if (typeof live === "number" && Number.isFinite(live) && live > 0) {
        return live;
      }
      return STATIC_FX_RATE_FROM_USD.EUR;
    }
    default:
      return STATIC_FX_RATE_FROM_USD.USD;
  }
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

function formatDisplayMajor(params: {
  amountMajor: number;
  currency: SupportedCurrency;
  language: AppLanguage;
  maximumFractionDigits?: number;
}): string {
  const locale = LANGUAGE_LOCALE[params.language];
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: params.currency,
    currencyDisplay: "code",
    maximumFractionDigits: params.maximumFractionDigits ?? 0
  }).format(params.amountMajor);
}

/** Convierte USD (unidades mayores) a moneda local de display y formatea para UI paciente. */
export function formatUsdMajorForPatientDisplay(params: {
  usdMajor: number;
  displayCurrency: SupportedCurrency;
  language: AppLanguage;
  fxRates?: DisplayFxRates;
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
    maximumFractionDigits: params.maximumFractionDigits
  });
}
