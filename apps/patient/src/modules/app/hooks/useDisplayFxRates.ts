import { useEffect, useState } from "react";
import type { DisplayFxRates } from "@therapy/i18n-config";
import { fetchDisplayFxRatesForCurrency } from "../lib/fetchDisplayFxRates";

export function useDisplayFxRates(displayCurrency?: string | null): {
  fxRates: DisplayFxRates;
  fxLoading: boolean;
  fxError: string | null;
} {
  const [fxRates, setFxRates] = useState<DisplayFxRates>({});
  const [fxLoading, setFxLoading] = useState(false);
  const [fxError, setFxError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const code = (displayCurrency ?? "").trim().toUpperCase();

    if (!code || code === "USD") {
      setFxRates({});
      setFxLoading(false);
      setFxError(null);
      return () => {
        active = false;
      };
    }

    setFxLoading(true);
    setFxError(null);

    void fetchDisplayFxRatesForCurrency(code)
      .then((rates) => {
        if (!active) {
          return;
        }
        setFxRates(rates);
        const live = rates.ratesPerUsd?.[code as keyof typeof rates.ratesPerUsd];
        setFxError(typeof live === "number" && live > 0 ? null : "FX_UNAVAILABLE");
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
  }, [displayCurrency]);

  return { fxRates, fxLoading, fxError };
}
