import {
  displayCurrencyCodeForResidencyCountry,
  normalizeResidencyCountryIso2
} from "@therapy/types";
import { ceilUsdToLocalMajor, PATIENT_LOCAL_PRICE_ROUND_STEP } from "@therapy/i18n-config";

/**
 * Monto y moneda enviados a dLocal Go.
 * Para todos los países dLocal: convertimos el catálogo USD → moneda local con FX dLocal
 * y el mismo ceil ×500 que muestra el portal (salvo EC/USD, que cobra en USD).
 */
export function resolveDlocalChargeAmount(params: {
  payerCountry: string;
  priceUsdCents: number;
  ratesPerUsd: Partial<Record<string, number>> | null | undefined;
}): { amountMajor: number; currency: string } {
  const country = normalizeResidencyCountryIso2(params.payerCountry);
  if (!country) {
    throw new Error("dLocal payer country is required");
  }

  const currency = (displayCurrencyCodeForResidencyCountry(country) ?? "USD").toUpperCase();
  const usdMajor = params.priceUsdCents / 100;

  if (currency === "USD") {
    return {
      amountMajor: Math.max(0.5, Math.round(usdMajor * 100) / 100),
      currency: "USD"
    };
  }

  const rate = params.ratesPerUsd?.[currency];
  if (rate == null || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(`USD/${currency} exchange rate unavailable for dLocal checkout`);
  }

  return {
    amountMajor: Math.max(PATIENT_LOCAL_PRICE_ROUND_STEP, ceilUsdToLocalMajor(usdMajor, rate)),
    currency
  };
}
