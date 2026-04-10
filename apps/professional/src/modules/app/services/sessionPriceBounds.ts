import { API_BASE } from "./api";

export const FALLBACK_SESSION_PRICE_MIN_USD = 30;
export const FALLBACK_SESSION_PRICE_MAX_USD = 1000;

function boundsUrl(): string {
  const base = API_BASE.replace(/\/$/, "");
  const path = "/api/public/session-price-bounds";
  return base ? `${base}${path}` : path;
}

/** Límites USD desde la config de finanzas (misma regla que el PATCH del perfil). */
export async function fetchSessionPriceBoundsUsd(): Promise<{ min: number; max: number }> {
  try {
    const response = await fetch(boundsUrl(), { credentials: "include" });
    if (!response.ok) {
      throw new Error("bounds");
    }
    const data = (await response.json()) as { sessionPriceMinUsd: number; sessionPriceMaxUsd: number };
    if (
      typeof data.sessionPriceMinUsd !== "number"
      || typeof data.sessionPriceMaxUsd !== "number"
      || !Number.isFinite(data.sessionPriceMinUsd)
      || !Number.isFinite(data.sessionPriceMaxUsd)
    ) {
      throw new Error("bounds shape");
    }
    return { min: data.sessionPriceMinUsd, max: data.sessionPriceMaxUsd };
  } catch {
    return { min: FALLBACK_SESSION_PRICE_MIN_USD, max: FALLBACK_SESSION_PRICE_MAX_USD };
  }
}
