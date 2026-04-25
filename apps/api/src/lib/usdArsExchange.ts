/**
 * USD → ARS para precio de lista profesional (Argentina).
 * Usa tipo de cambio oficial con caché en memoria; override por env en dev/staging.
 */

const CACHE_TTL_MS = 15 * 60 * 1000;

export type UsdArsProvider = "bluelytics" | "dolarapi" | "override";

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

export function roundSessionPriceArsFromUsd(usdMajor: number, arsPerUsd: number): number {
  const raw = usdMajor * arsPerUsd;
  return Math.ceil(raw / 1000) * 1000;
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
 * Cotización ARS por 1 USD (oficial) con metadata de provider y timestamp.
 * Cache ~15 min. Útil para snapshot al cobrar (auditoría / liquidación).
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
  const fromBluelytics = await fetchBluelyticsOfficial();
  let quote: UsdArsQuote | null = null;
  if (fromBluelytics !== null) {
    quote = { rate: fromBluelytics, provider: "bluelytics", fetchedAt };
  } else {
    const fromDolarApi = await fetchDolarApiOfficial();
    if (fromDolarApi !== null) {
      quote = { rate: fromDolarApi, provider: "dolarapi", fetchedAt };
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
