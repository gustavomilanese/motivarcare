import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

export function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}
