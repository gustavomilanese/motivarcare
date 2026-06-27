import type { AppLanguage, DisplayFxRates, SupportedCurrency } from "@therapy/i18n-config";
import { textByLanguage, type LocalizedText } from "@therapy/i18n-config";
import type { Market, TherapyModality } from "@therapy/types";
import { formatPatientUsdPrice } from "../../app/lib/formatPatientUsdPrice";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

type SessionListPriceProfessional = {
  sessionPriceArs: number | null;
  sessionPriceUsd: number | null;
  couplesSessionPriceUsd?: number | null;
};

/**
 * Precio de lista por sesión en USD (unidades mayores). Fuente canónica para matching/UI.
 */
export function effectiveSessionListMajorUnits(
  p: SessionListPriceProfessional,
  _patientMarket: Market,
  therapyModality: TherapyModality = "INDIVIDUAL"
): number | null {
  if (therapyModality === "COUPLES") {
    if (p.couplesSessionPriceUsd != null && p.couplesSessionPriceUsd > 0) {
      return p.couplesSessionPriceUsd;
    }
    return null;
  }
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
  residencyCountry?: string | null,
  therapyModality: TherapyModality = "INDIVIDUAL"
): string {
  if (major === null) {
    return t(language, {
      es:
        therapyModality === "COUPLES"
          ? "Precio de pareja a confirmar"
          : "Precio a confirmar",
      en:
        therapyModality === "COUPLES"
          ? "Couples price on request"
          : "Price on request",
      pt:
        therapyModality === "COUPLES"
          ? "Preco de casal sob consulta"
          : "Preco sob consulta"
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
