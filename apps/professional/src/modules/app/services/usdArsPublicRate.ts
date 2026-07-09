import { roundSessionPriceArsFromUsd, type DisplayFxRates, type SupportedCurrency } from "@therapy/i18n-config";
import { API_BASE } from "./api";

export { roundSessionPriceArsFromUsd };

/**
 * Cotizaciones live (1 USD = N moneda local) para convertir el precio USD del
 * profesional a su moneda local de residencia (display-only; el cobro base sigue en USD).
 * Coherente con `GET /api/public/fx/display-rates` que usa el portal del paciente.
 */
export async function fetchPublicDisplayFxRates(): Promise<DisplayFxRates> {
  const base = API_BASE.replace(/\/$/, "");
  const path = "/api/public/fx/display-rates";
  const url = base ? `${base}${path}` : path;
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error("FX_UNAVAILABLE");
  }
  const data = (await response.json()) as {
    ratesPerUsd?: Partial<Record<SupportedCurrency, number>>;
  };
  if (!data.ratesPerUsd || typeof data.ratesPerUsd !== "object") {
    throw new Error("FX_BAD_SHAPE");
  }
  return { ratesPerUsd: data.ratesPerUsd };
}

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
