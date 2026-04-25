import { API_BASE } from "./api";

/** Coherente con `GET /api/public/fx/usd-ars` y el redondeo del API al persistir perfil. */
export function roundSessionPriceArsFromUsd(usdMajor: number, arsPerUsd: number): number {
  const raw = usdMajor * arsPerUsd;
  return Math.ceil(raw / 1000) * 1000;
}

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
