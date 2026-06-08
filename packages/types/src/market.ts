export const MARKETS = ["AR", "US", "BR", "ES"] as const;
export type Market = (typeof MARKETS)[number];

export function isMarket(value: unknown): value is Market {
  return value === "AR" || value === "US" || value === "BR" || value === "ES";
}

/** Moneda canónica de precios, snapshots y cobro (Stripe) en esta fase. */
export const CANONICAL_BILLING_CURRENCY = "usd" as const;

/**
 * Moneda de cobro para catálogo y snapshots de compra (minor units).
 * Hoy todo se maneja en USD; la UI local (ARS/EUR) se derivará después con FX.
 */
export function billingCurrencyCodeForMarket(_market: Market): typeof CANONICAL_BILLING_CURRENCY {
  return CANONICAL_BILLING_CURRENCY;
}

/** Etiqueta ISO mayúscula para UI/admin. */
export function majorCurrencyCodeForMarket(_market: Market): "USD" {
  return "USD";
}
