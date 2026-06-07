export const MARKETS = ["AR", "US", "BR", "ES"] as const;
export type Market = (typeof MARKETS)[number];

export function isMarket(value: unknown): value is Market {
  return value === "AR" || value === "US" || value === "BR" || value === "ES";
}

/**
 * Moneda real de cobro para catálogo y snapshots de compra (minor units).
 * AR cobra en pesos; BR/US usan USD vía Stripe (sin conversión a BRL todavía).
 */
export function billingCurrencyCodeForMarket(market: Market): "ars" | "usd" | "eur" {
  if (market === "AR") {
    return "ars";
  }
  if (market === "ES") {
    return "eur";
  }
  return "usd";
}

/** Etiqueta ISO mayúscula para UI/admin (precio lista del profesional en `sessionPriceUsd` salvo AR). */
export function majorCurrencyCodeForMarket(market: Market): "ARS" | "USD" | "EUR" {
  return billingCurrencyCodeForMarket(market).toUpperCase() as "ARS" | "USD" | "EUR";
}
