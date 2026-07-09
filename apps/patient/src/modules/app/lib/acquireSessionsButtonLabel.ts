import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";

const ACQUIRE_NEW_SESSIONS_LABEL: LocalizedText = {
  es: "Adquirir nuevas sesiones",
  en: "Get new sessions",
  pt: "Adquirir novas sessoes"
};

export function acquireNewSessionsButtonLabel(language: AppLanguage): string {
  return `+ ${textByLanguage(language, ACQUIRE_NEW_SESSIONS_LABEL)}`;
}
