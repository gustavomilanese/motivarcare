import { formatCurrencyCents, type AppLanguage, type SupportedCurrency } from "@therapy/i18n-config";

/** Monto mostrado en la moneda del portal; `priceCents` son centavos USD (igual que el checkout). */
export function formatSubscriptionPurchasePrice(params: {
  priceCents: number | null | undefined;
  language: AppLanguage;
  displayCurrency: SupportedCurrency;
}): string | null {
  if (params.priceCents == null || !Number.isFinite(params.priceCents)) {
    return null;
  }
  return formatCurrencyCents({
    centsInUsd: Math.round(params.priceCents),
    currency: params.displayCurrency,
    language: params.language,
    maximumFractionDigits: 0
  });
}
