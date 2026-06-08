import type { DisplayFxRates } from "@therapy/i18n-config";
import { API_BASE } from "../services/api";

/** Coherente con `GET /api/public/fx/usd-ars` y el redondeo del API al persistir perfil. */
export async function fetchPublicUsdArsRate(): Promise<number> {
  const base = API_BASE.replace(/\/$/, "");
  const path = "/api/public/fx/usd-ars";
  const url = base ? `${base}${path}` : path;
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error("FX_UNAVAILABLE");
  }
  const data = (await response.json()) as { rate?: number };
  if (typeof data.rate !== "number" || !Number.isFinite(data.rate) || data.rate <= 0) {
    throw new Error("FX_BAD_SHAPE");
  }
  return data.rate;
}

/** Carga tasas live para display (hoy solo ARS). Falla en silencio → caller usa fallback estático. */
export async function fetchDisplayFxRatesForMarket(market: string | null | undefined): Promise<DisplayFxRates> {
  if ((market ?? "").trim().toUpperCase() !== "AR") {
    return {};
  }
  try {
    const arsPerUsd = await fetchPublicUsdArsRate();
    return { arsPerUsd };
  } catch {
    return {};
  }
}
