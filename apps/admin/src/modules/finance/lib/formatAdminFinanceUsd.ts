import { type AppLanguage, formatCurrencyCents } from "@therapy/i18n-config";

/** Montos de finanzas admin: siempre USD canónico (centavos USD). */
export function formatAdminFinanceUsd(cents: number, language: AppLanguage): string {
  return formatCurrencyCents({
    centsInUsd: cents,
    language,
    currency: "USD",
    maximumFractionDigits: 0
  });
}
