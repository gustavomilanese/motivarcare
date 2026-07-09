import { useEffect, useMemo, useState } from "react";
import {
  type AppLanguage,
  type DisplayFxRates,
  type SupportedCurrency,
  defaultDisplayCurrencyForPatient,
  formatUsdMajorForPatientDisplay
} from "@therapy/i18n-config";
import { fetchPublicDisplayFxRates } from "../services/usdArsPublicRate";

/** Convierte y formatea precios USD a la moneda local del profesional (según residencia). */
export function useProfessionalLocalSessionPriceDisplay(params: {
  residencyCountry?: string | null;
  sessionPriceUsd: number;
  language: AppLanguage;
}) {
  const [displayFxRates, setDisplayFxRates] = useState<DisplayFxRates>({});
  const [fxRatesError, setFxRatesError] = useState(false);

  const proDisplayCurrency: SupportedCurrency = useMemo(
    () => defaultDisplayCurrencyForPatient({ residencyCountry: params.residencyCountry }),
    [params.residencyCountry]
  );

  useEffect(() => {
    let cancelled = false;
    void fetchPublicDisplayFxRates()
      .then((rates) => {
        if (!cancelled) {
          setDisplayFxRates(rates);
          setFxRatesError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDisplayFxRates({});
          setFxRatesError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const formatUsdMajorLocal = (usdMajor: number): string | null => {
    const usd = Math.round(Number(usdMajor || 0));
    if (!usd || proDisplayCurrency === "USD") {
      return null;
    }
    return formatUsdMajorForPatientDisplay({
      usdMajor: usd,
      displayCurrency: proDisplayCurrency,
      language: params.language,
      fxRates: displayFxRates,
      residencyCountry: params.residencyCountry
    });
  };

  const sessionPriceLocalLabel = useMemo(
    () => formatUsdMajorLocal(params.sessionPriceUsd),
    [params.sessionPriceUsd, proDisplayCurrency, displayFxRates, params.language, params.residencyCountry]
  );

  return {
    proDisplayCurrency,
    sessionPriceLocalLabel,
    formatUsdMajorLocal,
    fxRatesError
  };
}
