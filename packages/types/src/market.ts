export const MARKETS = ["AR", "US", "BR", "ES"] as const;
export type Market = (typeof MARKETS)[number];

export function isMarket(value: unknown): value is Market {
  return value === "AR" || value === "US" || value === "BR" || value === "ES";
}

/** Moneda de unidad mayor del listado de sesión para ese mercado (campo API `sessionPriceUsd` = enteros en esta moneda). */
export function majorCurrencyCodeForMarket(market: Market): "ARS" | "USD" | "BRL" | "EUR" {
  if (market === "AR") {
    return "ARS";
  }
  if (market === "US") {
    return "USD";
  }
  if (market === "BR") {
    return "BRL";
  }
  return "EUR";
}
