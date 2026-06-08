import type { AppLanguage, DisplayFxRates, SupportedCurrency } from "@therapy/i18n-config";
import { formatUsdMajorForPatientDisplay } from "@therapy/i18n-config";

/**
 * Formatea el monto de una compra para historial UI. Snapshots del backend están en USD;
 * se convierte a moneda local de display (no altera datos de cobro).
 */
export function formatSubscriptionPurchasePrice(params: {
  priceCents: number | null | undefined;
  language: AppLanguage;
  displayCurrency: SupportedCurrency;
  /** Ignorado para display: snapshots son USD canónico. */
  purchaseCurrency?: string | null;
  fxRates?: DisplayFxRates;
}): string | null {
  if (params.priceCents == null || !Number.isFinite(params.priceCents)) {
    return null;
  }
  const usdMajor = Math.round(params.priceCents) / 100;
  return formatUsdMajorForPatientDisplay({
    usdMajor,
    displayCurrency: params.displayCurrency,
    language: params.language,
    fxRates: params.fxRates,
    maximumFractionDigits: 0
  });
}
