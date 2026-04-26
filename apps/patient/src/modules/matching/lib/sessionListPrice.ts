import type { AppLanguage } from "@therapy/i18n-config";
import { defaultDisplayCurrencyForMarket, formatCurrencyMajor, textByLanguage, type LocalizedText } from "@therapy/i18n-config";
import type { Market } from "@therapy/types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/**
 * Precio de lista por sesión en la moneda del market del paciente (unidades mayores).
 *
 * Para AR el backend ya populates `sessionPriceArs` derivado del precio USD del
 * profesional con el FX vigente; este helper sólo lo lee. Si no hay precio en pesos,
 * devolvemos `null` (no convertimos en cliente con tasas hardcodeadas).
 */
export function effectiveSessionListMajorUnits(
  p: { sessionPriceArs: number | null; sessionPriceUsd: number | null },
  patientMarket: Market
): number | null {
  if (patientMarket === "AR") {
    if (p.sessionPriceArs != null && p.sessionPriceArs > 0) {
      return p.sessionPriceArs;
    }
    return null;
  }
  if (p.sessionPriceUsd != null && p.sessionPriceUsd > 0) {
    return p.sessionPriceUsd;
  }
  return null;
}

export function formatSessionListMajorPrice(
  patientMarket: Market,
  major: number | null,
  language: AppLanguage
): string {
  if (major === null) {
    return t(language, { es: "Precio a confirmar", en: "Price on request", pt: "Preco sob consulta" });
  }
  return formatCurrencyMajor({
    amountMajor: major,
    currency: defaultDisplayCurrencyForMarket(patientMarket),
    language,
    maximumFractionDigits: 0,
    fallbackCurrency: "USD"
  });
}
