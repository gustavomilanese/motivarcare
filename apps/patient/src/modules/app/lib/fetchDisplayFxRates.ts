import type { DisplayFxRates, SupportedCurrency } from "@therapy/i18n-config";
import { API_BASE } from "../services/api";

/** @deprecated Usar `fetchPublicDisplayFxRates`. */
export async function fetchPublicUsdArsRate(): Promise<number> {
  const rates = await fetchPublicDisplayFxRates();
  const ars = rates.ratesPerUsd?.ARS;
  if (typeof ars !== "number" || !Number.isFinite(ars) || ars <= 0) {
    throw new Error("FX_UNAVAILABLE");
  }
  return ars;
}

export type PublicDisplayFxRatesResponse = {
  ratesPerUsd: Partial<Record<SupportedCurrency, number>>;
};

/** Cotizaciones live para convertir precios USD a moneda local del paciente. */
export async function fetchPublicDisplayFxRates(): Promise<DisplayFxRates> {
  const base = API_BASE.replace(/\/$/, "");
  const path = "/api/public/fx/display-rates";
  const url = base ? `${base}${path}` : path;
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error("FX_UNAVAILABLE");
  }
  const data = (await response.json()) as PublicDisplayFxRatesResponse;
  if (!data.ratesPerUsd || typeof data.ratesPerUsd !== "object") {
    throw new Error("FX_BAD_SHAPE");
  }
  return { ratesPerUsd: data.ratesPerUsd };
}

/** Carga tasas live cuando la moneda de display no es USD. */
export async function fetchDisplayFxRatesForCurrency(
  displayCurrency: string | null | undefined
): Promise<DisplayFxRates> {
  const code = (displayCurrency ?? "").trim().toUpperCase();
  if (!code || code === "USD") {
    return {};
  }
  try {
    return await fetchPublicDisplayFxRates();
  } catch {
    return {};
  }
}

/** @deprecated Usar `fetchDisplayFxRatesForCurrency`. */
export async function fetchDisplayFxRatesForMarket(market: string | null | undefined): Promise<DisplayFxRates> {
  if ((market ?? "").trim().toUpperCase() === "AR") {
    try {
      const arsPerUsd = await fetchPublicUsdArsRate();
      return { arsPerUsd, ratesPerUsd: { ARS: arsPerUsd } };
    } catch {
      return {};
    }
  }
  return fetchDisplayFxRatesForCurrency("USD");
}
