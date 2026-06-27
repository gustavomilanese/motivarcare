import type { AppLanguage, DisplayFxRates, SupportedCurrency } from "@therapy/i18n-config";
import { textByLanguage, type LocalizedText } from "@therapy/i18n-config";
import type { Market } from "@therapy/types";
import { formatPatientUsdPrice } from "../../app/lib/formatPatientUsdPrice";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

type SessionListPriceProfessional = {
  sessionPriceArs: number | null;
  sessionPriceUsd: number | null;
};

/** Precio de lista por sesión en USD (unidades mayores). Misma tarifa individual y pareja en esta fase. */
export function effectiveSessionListMajorUnits(
  p: SessionListPriceProfessional,
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
  fxRates?: DisplayFxRates,
  residencyCountry?: string | null
): string {
  if (major === null) {
    return t(language, {
      es: "Precio a confirmar",
      en: "Price on request",
      pt: "Preco sob consulta"
    });
  }
  return formatPatientUsdPrice({
    usdMajor: major,
    displayCurrency,
    language,
    fxRates,
    residencyCountry
  });
}
