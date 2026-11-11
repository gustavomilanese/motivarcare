import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { Professional } from "../../app/types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const HONORIFIC = /^(dr|dra|lic|licda)\.?$/i;

/**
 * Rubro del profesional para el chip (psicólogo, nutricionista, …).
 * Hoy casi todos son psicología; el title/specialty pueden afinarlo.
 */
export function resolveProfessionalRoleLabel(
  professional: Professional,
  language: AppLanguage
): string {
  const title = (professional.title ?? "").trim();
  if (title && !HONORIFIC.test(title)) {
    const lower = title.toLowerCase();
    // Evitar genéricos poco útiles en el chip.
    if (!/salud mental|profesional/i.test(lower) || /psicolog|terapeuta|nutri|coach/i.test(lower)) {
      if (!/^profesional de salud mental$/i.test(title)) {
        return title;
      }
    }
  }

  const specialty = (professional.specialties ?? []).map((item) => item.trim()).find(Boolean);
  if (specialty && /psicolog|terapeuta|nutri|coach|psiquiatra/i.test(specialty)) {
    return specialty;
  }

  return t(language, {
    es: "Psicólogo",
    en: "Psychologist",
    pt: "Psicólogo"
  });
}
