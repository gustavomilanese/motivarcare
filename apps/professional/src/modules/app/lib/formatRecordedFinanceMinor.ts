import { formatCurrencyMinor, localeFromLanguage, type AppLanguage } from "@therapy/i18n-config";

/** Montos de `finance_session_record`: ya están en centavos de la moneda del registro (ARS, USD, …). */
export function formatRecordedFinanceMinor(
  amountMinor: number,
  currencyRaw: string | null | undefined,
  language: AppLanguage
): string {
  return formatCurrencyMinor({
    amountMinor,
    currency: (currencyRaw ?? "usd").toLowerCase(),
    language,
    maximumFractionDigits: 0
  });
}

/** Monto sin código de moneda (p. ej. listados donde la moneda es única en la página). */
export function formatRecordedFinanceAmountOnly(amountMinor: number, language: AppLanguage): string {
  return new Intl.NumberFormat(localeFromLanguage(language), {
    maximumFractionDigits: 0
  }).format(amountMinor / 100);
}
