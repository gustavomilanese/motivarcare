import { resolvePortalLanguage, type AppLanguage } from "@therapy/i18n-config";

export function resolvePatientPortalLanguage(stored: unknown): AppLanguage {
  return resolvePortalLanguage({
    storedLanguage: typeof stored === "string" ? stored : undefined,
    buildDefaultLanguage:
      typeof import.meta.env.VITE_DEFAULT_APP_LANGUAGE === "string"
        ? import.meta.env.VITE_DEFAULT_APP_LANGUAGE
        : undefined
  });
}
