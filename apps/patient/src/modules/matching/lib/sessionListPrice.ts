import type { AppLanguage, DisplayFxRates, SupportedCurrency } from "@therapy/i18n-config";
import { textByLanguage, type LocalizedText } from "@therapy/i18n-config";
import type { Market } from "@therapy/types";
import { formatPatientUsdPrice } from "../../app/lib/formatPatientUsdPrice";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/**
 * Precio de lista por sesión en USD (unidades mayores). Fuente canónica para matching/UI.
 * La conversión a ARS u otra moneda local queda para la capa de presentación.
 */
export function effectiveSessionListMajorUnits(
  p: { sessionPriceArs: number | null; sessionPriceUsd: number | null },
  _patientMarket: Market
): number | null {
  if (p.sessionPriceUsd != null && p.sessionPriceUsd > 0) {
    return p.sessionPriceUsd;
  }
  return null;
}

export function formatSessionListMajorPrice(
  displayCurrency: SupportedCurrency,
  major: number | null,
  language: AppLanguage,
  fxRates?: DisplayFxRates
): string {
  if (major === null) {
    return t(language, { es: "Precio a confirmar", en: "Price on request", pt: "Preco sob consulta" });
  }
  return formatPatientUsdPrice({
    usdMajor: major,
    displayCurrency,
    language,
    fxRates
  });
}
