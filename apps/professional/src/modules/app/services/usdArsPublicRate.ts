import { roundSessionPriceArsFromUsd } from "@therapy/i18n-config";
import { API_BASE } from "./api";

export { roundSessionPriceArsFromUsd };

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
