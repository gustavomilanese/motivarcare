import { formatCurrencyMinor, type AppLanguage } from "@therapy/i18n-config";

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
