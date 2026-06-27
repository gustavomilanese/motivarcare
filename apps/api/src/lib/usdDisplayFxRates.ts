import { PATIENT_LIVE_FX_CURRENCY_CODES } from "@therapy/types";
import { STATIC_FX_RATE_FROM_USD } from "@therapy/i18n-config";
import { getUsdArsRate } from "./usdArsExchange.js";

const CACHE_TTL_MS = 15 * 60 * 1000;

type RatesCache = {
  ratesPerUsd: Record<string, number>;
  cachedAtMs: number;
};

let cache: RatesCache | null = null;

type OpenErApiResponse = {
  result?: string;
  rates?: Record<string, number>;
};

function isPositiveRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

async function fetchOpenErApiUsdRates(): Promise<Record<string, number>> {
  const response = await fetch("https://open.er-api.com/v6/latest/USD", {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000)
  });
  if (!response.ok) {
    throw new Error("OPEN_ER_API_UNAVAILABLE");
  }
  const data = (await response.json()) as OpenErApiResponse;
  if (data.result !== "success" || !data.rates || typeof data.rates !== "object") {
    throw new Error("OPEN_ER_API_BAD_SHAPE");
  }
  return data.rates;
}

function staticFallbackRates(): Record<string, number> {
  const out: Record<string, number> = { USD: 1 };
  for (const code of PATIENT_LIVE_FX_CURRENCY_CODES) {
    const rate = STATIC_FX_RATE_FROM_USD[code as keyof typeof STATIC_FX_RATE_FROM_USD];
    if (isPositiveRate(rate)) {
      out[code] = rate;
    }
  }
  return out;
}

/**
 * Cotizaciones para display del portal paciente (1 USD = N moneda local).
 * ARS usa Bluelytics/DolarAPI; el resto open.er-api.com con fallback estático.
 */
export async function getUsdDisplayFxRates(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.cachedAtMs < CACHE_TTL_MS) {
    return cache.ratesPerUsd;
  }

  const rates: Record<string, number> = { USD: 1 };

  try {
    const arsPerUsd = await getUsdArsRate();
    if (isPositiveRate(arsPerUsd)) {
      rates.ARS = arsPerUsd;
    }
  } catch {
    // ARS fallback applied below if missing
  }

  try {
    const remote = await fetchOpenErApiUsdRates();
    for (const code of PATIENT_LIVE_FX_CURRENCY_CODES) {
      if (code === "ARS") {
        continue;
      }
      const candidate = remote[code];
      if (isPositiveRate(candidate)) {
        rates[code] = candidate;
      }
    }
  } catch {
    // partial / static fallback below
  }

  const fallback = staticFallbackRates();
  for (const code of PATIENT_LIVE_FX_CURRENCY_CODES) {
    if (!isPositiveRate(rates[code])) {
      rates[code] = fallback[code] ?? rates[code];
    }
  }

  cache = {
    ratesPerUsd: rates,
    cachedAtMs: Date.now()
  };
  return rates;
}

/** Solo para tests. */
export function resetUsdDisplayFxRatesCacheForTests(): void {
  cache = null;
}
