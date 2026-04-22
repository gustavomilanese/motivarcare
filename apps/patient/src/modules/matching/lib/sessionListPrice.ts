import type { AppLanguage } from "@therapy/i18n-config";
import { textByLanguage, type LocalizedText } from "@therapy/i18n-config";
import type { Market } from "@therapy/types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/**
 * Precio de lista por sesión (enteros en moneda mayor) que corresponde mostrar / ordenar
 * para el mercado del paciente — alineado con `listPriceMajorUnitsForPackageMarket` en API.
 */
export function effectiveSessionListMajorUnits(
  p: { sessionPriceArs: number | null; sessionPriceUsd: number | null },
  patientMarket: Market
): number | null {
  if (patientMarket === "AR") {
    if (p.sessionPriceArs != null && p.sessionPriceArs > 0) {
      return p.sessionPriceArs;
    }
    if (p.sessionPriceUsd != null && p.sessionPriceUsd > 0) {
      return p.sessionPriceUsd;
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
  if (patientMarket === "AR") {
    const locale = language === "en" ? "en-US" : language === "pt" ? "pt-BR" : "es-AR";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0
    }).format(major);
  }
  return `$${major} USD`;
}
