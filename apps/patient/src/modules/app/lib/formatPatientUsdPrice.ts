import {
  formatUsdMajorForPatientDisplay,
  type AppLanguage,
  type DisplayFxRates,
  type SupportedCurrency
} from "@therapy/i18n-config";

/** Display-only: convierte USD (unidades mayores) a moneda local del paciente y formatea. */
export function formatPatientUsdPrice(params: {
  usdMajor: number;
  displayCurrency: SupportedCurrency;
  language: AppLanguage;
  fxRates?: DisplayFxRates;
  residencyCountry?: string | null;
  maximumFractionDigits?: number;
}): string {
  return formatUsdMajorForPatientDisplay({
    ...params,
    residencyCountry: params.residencyCountry
  });
}
