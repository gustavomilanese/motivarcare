import type { SupportedCurrency } from "@therapy/i18n-config";
import { formatCurrencyMinor, type AppLanguage } from "@therapy/i18n-config";

function resolvePurchaseDisplayCurrency(
  purchaseCurrency: string | null | undefined,
  displayCurrency: SupportedCurrency
): SupportedCurrency {
  const raw = (purchaseCurrency ?? displayCurrency).toLowerCase();
  // Compras BR históricas: snapshot `brl` con centavos USD (sin FX). Mostrar USD.
  if (raw === "brl") {
    return "USD";
  }
  if (raw === "usd" || raw === "ars" || raw === "eur" || raw === "gbp") {
    return raw.toUpperCase() as SupportedCurrency;
  }
  return displayCurrency;
}

/**
 * Formatea el monto de una compra usando la moneda en la que fue cobrada (snapshot del
 * backend), sin convertir. Si la compra no trae moneda (legacy), cae a `displayCurrency`.
 */
export function formatSubscriptionPurchasePrice(params: {
  priceCents: number | null | undefined;
  language: AppLanguage;
  displayCurrency: SupportedCurrency;
  /** Moneda en la que se cobró la compra (snapshot). */
  purchaseCurrency?: string | null;
}): string | null {
  if (params.priceCents == null || !Number.isFinite(params.priceCents)) {
    return null;
  }
  const currency = resolvePurchaseDisplayCurrency(params.purchaseCurrency, params.displayCurrency);
  return formatCurrencyMinor({
    amountMinor: Math.round(params.priceCents),
    currency,
    language: params.language,
    maximumFractionDigits: 0,
    fallbackCurrency: params.displayCurrency
  });
}
