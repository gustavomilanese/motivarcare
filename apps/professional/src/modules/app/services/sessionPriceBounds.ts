import { API_BASE } from "./api";

export const FALLBACK_SESSION_PRICE_MIN_USD = 30;
export const FALLBACK_SESSION_PRICE_MAX_USD = 1000;
export const FALLBACK_SESSION_PRICE_MIN_ARS = 2_000;
export const FALLBACK_SESSION_PRICE_MAX_ARS = 5_000_000;

export type SessionPriceBoundsDual = {
  usd: { min: number; max: number };
  ars: { min: number; max: number };
};

function boundsUrl(): string {
  const base = API_BASE.replace(/\/$/, "");
  const path = "/api/public/session-price-bounds";
  return base ? `${base}${path}` : path;
}

/** Límites ARS + USD desde la API (misma regla que el PATCH del perfil). */
export async function fetchSessionPriceBoundsDual(): Promise<SessionPriceBoundsDual> {
  try {
    const response = await fetch(boundsUrl(), { credentials: "include" });
    if (!response.ok) {
      throw new Error("bounds");
    }
    const data = (await response.json()) as {
      sessionPriceMinUsd: number;
      sessionPriceMaxUsd: number;
      sessionPriceMinArs?: number;
      sessionPriceMaxArs?: number;
    };
    if (
      typeof data.sessionPriceMinUsd !== "number"
      || typeof data.sessionPriceMaxUsd !== "number"
      || !Number.isFinite(data.sessionPriceMinUsd)
      || !Number.isFinite(data.sessionPriceMaxUsd)
    ) {
      throw new Error("bounds shape");
    }
    return {
      usd: { min: data.sessionPriceMinUsd, max: data.sessionPriceMaxUsd },
      ars: {
        min: typeof data.sessionPriceMinArs === "number" ? data.sessionPriceMinArs : FALLBACK_SESSION_PRICE_MIN_ARS,
        max: typeof data.sessionPriceMaxArs === "number" ? data.sessionPriceMaxArs : FALLBACK_SESSION_PRICE_MAX_ARS
      }
    };
  } catch {
    return {
      usd: { min: FALLBACK_SESSION_PRICE_MIN_USD, max: FALLBACK_SESSION_PRICE_MAX_USD },
      ars: { min: FALLBACK_SESSION_PRICE_MIN_ARS, max: FALLBACK_SESSION_PRICE_MAX_ARS }
    };
  }
}

/** Límites USD desde la config de finanzas (misma regla que el PATCH del perfil). */
export async function fetchSessionPriceBoundsUsd(): Promise<{ min: number; max: number }> {
  const dual = await fetchSessionPriceBoundsDual();
  return dual.usd;
}
