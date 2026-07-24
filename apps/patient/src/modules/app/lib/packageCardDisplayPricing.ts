import {
  PATIENT_LOCAL_PRICE_ROUND_STEP,
  convertUsdMajorToDisplayMajor,
  formatLocalMajorForPatientDisplay,
  type AppLanguage,
  type DisplayFxRates,
  type SupportedCurrency
} from "@therapy/i18n-config";

export type PackageCardDisplayPricing = {
  /** Precio de lista del paquete completo (USD→local, ceil×500). */
  listLocalMajor: number;
  /** Total a pagar del paquete con descuento (USD→local, ceil×500). */
  totalLocalMajor: number;
  /** Equivalente MKT por sesión: total local ÷ créditos, ceil×500. */
  perSessionLocalMajor: number;
  /** Ahorro en local: lista − total (ambos ya redondeados). */
  savingLocalMajor: number;
  discountPercent: number;
  credits: number;
};

const HARD_CURRENCIES = new Set<SupportedCurrency>(["USD", "EUR", "GBP"]);

function ceilLocalMajor(amount: number, currency: SupportedCurrency): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }
  if (HARD_CURRENCIES.has(currency)) {
    return Math.round(amount);
  }
  const step = PATIENT_LOCAL_PRICE_ROUND_STEP;
  return Math.max(step, Math.ceil(amount / step) * step);
}

/**
 * Precios de tarjeta de paquete en moneda local, en orden:
 * 1) lista del paquete → 2) total con descuento → 3) /sesión MKT desde el total.
 */
export function resolvePackageCardDisplayPricing(params: {
  priceCents: number;
  discountPercent: number;
  credits: number;
  displayCurrency: SupportedCurrency;
  fxRates?: DisplayFxRates;
}): PackageCardDisplayPricing {
  const credits = Math.max(1, Math.round(params.credits));
  const discountPercent = Math.max(0, Math.min(99, params.discountPercent));
  const totalUsdMajor = Math.max(0, params.priceCents) / 100;
  const listUsdMajor =
    discountPercent > 0
      ? Math.round(totalUsdMajor / (1 - discountPercent / 100))
      : totalUsdMajor;

  const listLocalMajor = convertUsdMajorToDisplayMajor(
    listUsdMajor,
    params.displayCurrency,
    params.fxRates
  );
  const totalLocalMajor = convertUsdMajorToDisplayMajor(
    totalUsdMajor,
    params.displayCurrency,
    params.fxRates
  );
  const perSessionLocalMajor = ceilLocalMajor(totalLocalMajor / credits, params.displayCurrency);

  return {
    listLocalMajor,
    totalLocalMajor,
    perSessionLocalMajor,
    savingLocalMajor: Math.max(0, listLocalMajor - totalLocalMajor),
    discountPercent,
    credits
  };
}

export function formatPackageCardMoney(params: {
  amountMajor: number;
  displayCurrency: SupportedCurrency;
  language: AppLanguage;
  residencyCountry?: string | null;
}): string {
  return formatLocalMajorForPatientDisplay({
    amountMajor: params.amountMajor,
    displayCurrency: params.displayCurrency,
    language: params.language,
    residencyCountry: params.residencyCountry,
    maximumFractionDigits: 0
  });
}
