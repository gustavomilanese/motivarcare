import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AppLanguage = "es" | "en" | "pt";
export type AppCurrency = "USD" | "ARS" | "EUR" | "BRL" | "MXN" | "CLP" | "COP" | "UYU";

const LANG_KEY = "mc:patient-prefs:language";
const CURRENCY_KEY = "mc:patient-prefs:currency";

type PrefsContextValue = {
  language: AppLanguage;
  currency: AppCurrency;
  setLanguage: (language: AppLanguage) => void;
  setCurrency: (currency: AppCurrency) => void;
  ready: boolean;
};

const PrefsContext = createContext<PrefsContextValue | null>(null);

export function PatientPreferencesProvider(props: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("es");
  const [currency, setCurrencyState] = useState<AppCurrency>("USD");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [lang, cur] = await Promise.all([
          AsyncStorage.getItem(LANG_KEY),
          AsyncStorage.getItem(CURRENCY_KEY)
        ]);
        if (!alive) return;
        if (lang === "es" || lang === "en" || lang === "pt") setLanguageState(lang);
        if (cur && ["USD", "ARS", "EUR", "BRL", "MXN", "CLP", "COP", "UYU"].includes(cur)) {
          setCurrencyState(cur as AppCurrency);
        }
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setLanguage = useCallback((next: AppLanguage) => {
    setLanguageState(next);
    void AsyncStorage.setItem(LANG_KEY, next);
  }, []);

  const setCurrency = useCallback((next: AppCurrency) => {
    setCurrencyState(next);
    void AsyncStorage.setItem(CURRENCY_KEY, next);
  }, []);

  const value = useMemo(
    () => ({ language, currency, setLanguage, setCurrency, ready }),
    [language, currency, setLanguage, setCurrency, ready]
  );

  return <PrefsContext.Provider value={value}>{props.children}</PrefsContext.Provider>;
}

export function usePatientPreferences(): PrefsContextValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) {
    throw new Error("usePatientPreferences must be used within PatientPreferencesProvider");
  }
  return ctx;
}
