/**
 * USD → ARS para precio de lista profesional (Argentina) y cobro dLocal AR.
 * Prioriza FX de dLocal Go (misma tasa del checkout); si falta, oficial Bluelytics/DolarAPI.
 * Override por env en dev/staging.
 */

import { roundSessionPriceArsFromUsd, SESSION_PRICE_ARS_ROUND_STEP } from "@therapy/i18n-config";
import { getDlocalGoUsdFxRates } from "./dlocalGoFx.js";

export { roundSessionPriceArsFromUsd, SESSION_PRICE_ARS_ROUND_STEP };

const CACHE_TTL_MS = 15 * 60 * 1000;

export type UsdArsProvider = "dlocalgo" | "bluelytics" | "dolarapi" | "override";

export interface UsdArsQuote {
  /** ARS por 1 USD. */
  rate: number;
  /** Origen de la cotización, para snapshot de auditoría. */
  provider: UsdArsProvider;
  /** Cuándo se obtuvo la cotización (no la última lectura del caché). */
  fetchedAt: Date;
}

let cache: { quote: UsdArsQuote; cachedAtMs: number } | null = null;

function parseEnvOverride(): number | null {
  const raw = process.env.USD_ARS_RATE_OVERRIDE?.trim();
  if (!raw) {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function fetchBluelyticsOfficial(): Promise<number | null> {
  const response = await fetch("https://api.bluelytics.com.ar/v2/latest", {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000)
  });
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as {
    oficial?: { value_avg?: number; value_sell?: number };
  };
  const candidate = data?.oficial?.value_avg ?? data?.oficial?.value_sell;
  return typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0 ? candidate : null;
}

async function fetchDolarApiOfficial(): Promise<number | null> {
  const response = await fetch("https://dolarapi.com/v1/dolares/oficial", {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000)
  });
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as { venta?: number };
  const venta = data?.venta;
  return typeof venta === "number" && Number.isFinite(venta) && venta > 0 ? venta : null;
}

/**
 * Cotización ARS por 1 USD con metadata de provider y timestamp.
 * Cache ~15 min. Prioriza dLocal Go; útil para snapshot al cobrar.
 */
export async function getUsdArsQuote(): Promise<UsdArsQuote> {
  const override = parseEnvOverride();
  if (override !== null) {
    return { rate: override, provider: "override", fetchedAt: new Date() };
  }

  const now = Date.now();
  if (cache && now - cache.cachedAtMs < CACHE_TTL_MS) {
    return cache.quote;
  }

  const fetchedAt = new Date();
  let quote: UsdArsQuote | null = null;

  try {
    const dlocalRates = await getDlocalGoUsdFxRates();
    const dlocalArs = dlocalRates.ARS;
    if (typeof dlocalArs === "number" && Number.isFinite(dlocalArs) && dlocalArs > 0) {
      quote = { rate: dlocalArs, provider: "dlocalgo", fetchedAt };
    }
  } catch {
    // fall through to market FX
  }

  if (quote === null) {
    const fromBluelytics = await fetchBluelyticsOfficial();
    if (fromBluelytics !== null) {
      quote = { rate: fromBluelytics, provider: "bluelytics", fetchedAt };
    } else {
      const fromDolarApi = await fetchDolarApiOfficial();
      if (fromDolarApi !== null) {
        quote = { rate: fromDolarApi, provider: "dolarapi", fetchedAt };
      }
    }
  }

  if (quote === null) {
    throw new Error("USD_ARS_RATE_UNAVAILABLE");
  }

  cache = { quote, cachedAtMs: now };
  return quote;
}

/**
 * Compatibilidad con consumidores que solo necesitan el número.
 * Cache ~15 min.
 */
export async function getUsdArsRate(): Promise<number> {
  const quote = await getUsdArsQuote();
  return quote.rate;
}

/** Solo para tests: invalida el caché de cotización. */
export function __resetUsdArsCacheForTests(): void {
  cache = null;
}
