import { useEffect, useState } from "react";
import {
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
  type SupportedCurrency
} from "@therapy/i18n-config";
import { AdminPortal } from "./pages/AdminPortal";
import { AuthScreen } from "./pages/AuthScreen";
import {
  AUTH_EXPIRED_EVENT,
  CURRENCY_KEY,
  LANGUAGE_KEY,
  TOKEN_KEY,
  USER_KEY
} from "./services/api";
import type { AuthUser } from "./types";

function readStoredUser(): AuthUser | null {
  const token = window.localStorage.getItem(TOKEN_KEY);
  const rawUser = window.localStorage.getItem(USER_KEY);

  if (!token || !rawUser) {
    return null;
  }

  try {
    const user = JSON.parse(rawUser) as AuthUser;
    if (user.role !== "ADMIN") {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

export function App() {
  const [token, setToken] = useState<string>(() => window.localStorage.getItem(TOKEN_KEY) ?? "");
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [language, setLanguage] = useState<AppLanguage>(() => {
    const saved = window.localStorage.getItem(LANGUAGE_KEY);
    return (SUPPORTED_LANGUAGES as readonly string[]).includes(saved ?? "") ? (saved as AppLanguage) : "es";
  });
  const [currency, setCurrency] = useState<SupportedCurrency>(() => {
    const saved = window.localStorage.getItem(CURRENCY_KEY);
    return (SUPPORTED_CURRENCIES as readonly string[]).includes(saved ?? "") ? (saved as SupportedCurrency) : "USD";
  });

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    window.localStorage.setItem(CURRENCY_KEY, currency);
  }, [currency]);

  useEffect(() => {
    document.title = "MotivarCare Admin";
    let icon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      document.head.appendChild(icon);
    }
    icon.type = "image/svg+xml";
    icon.href = "/favicon.svg?v=admin-20260309";
  }, []);

  const handleAuthSuccess = (nextToken: string, nextUser: AuthUser) => {
    window.localStorage.setItem(TOKEN_KEY, nextToken);
    window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const handleLogout = () => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    setToken("");
    setUser(null);
  };

  useEffect(() => {
    const onAuthExpired = () => {
      setToken("");
      setUser(null);
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
  }, []);

  if (!token || !user) {
    return (
      <AuthScreen language={language} onAuthSuccess={handleAuthSuccess} />
    );
  }

  return (
    <AdminPortal
      token={token}
      onLogout={handleLogout}
      language={language}
      currency={currency}
      onLanguageChange={setLanguage}
      onCurrencyChange={setCurrency}
    />
  );
}
