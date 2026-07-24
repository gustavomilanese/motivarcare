import { dlocalGoRequest, isDlocalGoConfigured } from "./dlocalGoClient.js";

const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Monedas locales de países dLocal Go (EC es USD → no necesita FX).
 * Incluye LATAM + ID/MY/KE/NG.
 */
export const DLOCAL_GO_DISPLAY_CURRENCIES = [
  "ARS",
  "BOB",
  "BRL",
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

/** @deprecated Usar {@link DLOCAL_GO_DISPLAY_CURRENCIES}. */
export const DLOCAL_GO_LATAM_DISPLAY_CURRENCIES = DLOCAL_GO_DISPLAY_CURRENCIES;

export type DlocalGoLatamDisplayCurrency = (typeof DLOCAL_GO_DISPLAY_CURRENCIES)[number];

export type DlocalGoCurrencyExchange = {
  source_currency?: string;
  target_currency?: string;
  value?: number;
};

type FxCache = {
  ratesPerUsd: Record<string, number>;
  cachedAtMs: number;
};

let cache: FxCache | null = null;

function isPositiveRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function parseExchangeList(body: unknown): Record<string, number> {
  if (!Array.isArray(body)) {
    return {};
  }
  const rates: Record<string, number> = {};
  for (const row of body) {
    if (typeof row !== "object" || row == null) {
      continue;
    }
    const item = row as DlocalGoCurrencyExchange;
    const source = String(item.source_currency ?? "").trim().toUpperCase();
    const target = String(item.target_currency ?? "").trim().toUpperCase();
    if (source !== "USD" || !/^[A-Z]{3}$/.test(target) || !isPositiveRate(item.value)) {
      continue;
    }
    rates[target] = item.value;
  }
  return rates;
}

/** Solo para tests. */
export function parseExchangeListForTests(body: unknown): Record<string, number> {
  return parseExchangeList(body);
}

/**
 * Cotizaciones USD → local publicadas por dLocal Go (`GET /v1/currency-exchanges`).
 * Cache ~15 min. Si no hay credenciales o falla la API, retorna {}.
 */
export async function getDlocalGoUsdFxRates(): Promise<Record<string, number>> {
  if (!isDlocalGoConfigured()) {
    return {};
  }

  if (cache && Date.now() - cache.cachedAtMs < CACHE_TTL_MS) {
    return cache.ratesPerUsd;
  }

  try {
    const body = await dlocalGoRequest<unknown>("/v1/currency-exchanges");
    const ratesPerUsd = parseExchangeList(body);
    cache = {
      ratesPerUsd,
      cachedAtMs: Date.now()
    };
    return ratesPerUsd;
  } catch (error) {
    console.warn(
      "[dlocalGoFx] currency-exchanges unavailable",
      error instanceof Error ? error.message : error
    );
    return cache?.ratesPerUsd ?? {};
  }
}

/** Solo para tests. */
export function resetDlocalGoFxCacheForTests(): void {
  cache = null;
}
