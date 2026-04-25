/**
 * USD → ARS para precio de lista profesional (Argentina).
 * Usa tipo de cambio oficial con caché en memoria; override por env en dev/staging.
 */

const CACHE_TTL_MS = 15 * 60 * 1000;

let cache: { rate: number; fetchedAt: number } | null = null;

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
 * Cotización ARS por 1 USD (mayorista/oficial). Cache ~15 min.
 */
export async function getUsdArsRate(): Promise<number> {
  const override = parseEnvOverride();
  if (override !== null) {
    return override;
  }

  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rate;
  }

  const primary = await fetchBluelyticsOfficial();
  const rate = primary ?? (await fetchDolarApiOfficial());
  if (rate === null) {
    throw new Error("USD_ARS_RATE_UNAVAILABLE");
  }

  cache = { rate, fetchedAt: now };
  return rate;
}
