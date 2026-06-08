import { useEffect, useState } from "react";
import type { DisplayFxRates } from "@therapy/i18n-config";
import { fetchDisplayFxRatesForMarket } from "../lib/fetchDisplayFxRates";

export function useDisplayFxRates(
  patientMarket: string | null | undefined,
  displayCurrency?: string | null
): {
  fxRates: DisplayFxRates;
  fxLoading: boolean;
  fxError: string | null;
} {
  const [fxRates, setFxRates] = useState<DisplayFxRates>({});
  const [fxLoading, setFxLoading] = useState(false);
  const [fxError, setFxError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const needsLiveArs =
      (displayCurrency ?? "").trim().toUpperCase() === "ARS"
      || (patientMarket ?? "").trim().toUpperCase() === "AR";

    if (!needsLiveArs) {
      setFxRates({});
      setFxLoading(false);
      setFxError(null);
      return () => {
        active = false;
      };
    }

    setFxLoading(true);
    setFxError(null);

    void fetchDisplayFxRatesForMarket(patientMarket)
      .then((rates) => {
        if (!active) {
          return;
        }
        setFxRates(rates);
        if (rates.arsPerUsd == null) {
          setFxError("FX_UNAVAILABLE");
        } else {
          setFxError(null);
        }
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setFxRates({});
        setFxError("FX_UNAVAILABLE");
      })
      .finally(() => {
        if (active) {
          setFxLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [displayCurrency, patientMarket]);

  return { fxRates, fxLoading, fxError };
}
