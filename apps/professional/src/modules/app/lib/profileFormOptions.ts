import type { AppLanguage, LocalizedText } from "@therapy/i18n-config";
import { textByLanguage } from "@therapy/i18n-config";
import { WEB_PROFESSIONAL_TITLE_OPTIONS_ES } from "../../onboarding/constants/webProfessionalTitleOptions";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function profileTitleOptions(language: AppLanguage): Array<{ value: string; label: string }> {
  return WEB_PROFESSIONAL_TITLE_OPTIONS_ES.map((title) => ({
    value: title,
    label:
      title === "Psicólogo"
        ? t(language, { es: "Psicólogo", en: "Psychologist", pt: "Psicologo" })
        : title === "Psiquiatra"
          ? t(language, { es: "Psiquiatra", en: "Psychiatrist", pt: "Psiquiatra" })
          : title === "Sexólogo"
            ? t(language, { es: "Sexólogo", en: "Sexologist", pt: "Sexologo" })
            : title === "Coach"
              ? t(language, { es: "Coach", en: "Coach", pt: "Coach" })
              : t(language, { es: "Nutricionista", en: "Nutritionist", pt: "Nutricionista" })
  }));
}

export function profileExperienceBandOptions(language: AppLanguage): Array<{ value: string; label: string }> {
  return [
    { value: "Menos de 1 ano", label: t(language, { es: "Menos de 1 año", en: "Less than 1 year", pt: "Menos de 1 ano" }) },
    { value: "1-3 anos", label: t(language, { es: "1-3 años", en: "1-3 years", pt: "1-3 anos" }) },
    { value: "3-6 anos", label: t(language, { es: "3-6 años", en: "3-6 years", pt: "3-6 anos" }) },
    { value: "6-10 anos", label: t(language, { es: "6-10 años", en: "6-10 years", pt: "6-10 anos" }) },
    { value: "10-15 anos", label: t(language, { es: "10-15 años", en: "10-15 years", pt: "10-15 anos" }) },
    { value: "15-20 anos", label: t(language, { es: "15-20 años", en: "15-20 years", pt: "15-20 anos" }) },
    { value: "Mas de 20 anos", label: t(language, { es: "Más de 20 años", en: "More than 20 years", pt: "Mais de 20 anos" }) }
  ];
}

export function profilePracticeBandOptions(language: AppLanguage): Array<{ value: string; label: string }> {
  return [
    { value: "Menos de 500 horas", label: t(language, { es: "Menos de 500 horas", en: "Less than 500 hours", pt: "Menos de 500 horas" }) },
    { value: "500-1000 horas", label: t(language, { es: "500-1000 horas", en: "500-1000 hours", pt: "500-1000 horas" }) },
    { value: "1000-3000 horas", label: t(language, { es: "1000-3000 horas", en: "1000-3000 hours", pt: "1000-3000 horas" }) },
    { value: "3000-5000 horas", label: t(language, { es: "3000-5000 horas", en: "3000-5000 hours", pt: "3000-5000 horas" }) },
    { value: "Mas de 5000 horas", label: t(language, { es: "Más de 5000 horas", en: "More than 5000 hours", pt: "Mais de 5000 horas" }) }
  ];
}

export function profileGenderOptions(language: AppLanguage): Array<{ value: string; label: string }> {
  return [
    { value: "Hombre", label: t(language, { es: "Hombre", en: "Man", pt: "Homem" }) },
    { value: "Mujer", label: t(language, { es: "Mujer", en: "Woman", pt: "Mulher" }) },
    { value: "Persona no binaria", label: t(language, { es: "Persona no binaria", en: "Non-binary", pt: "Pessoa nao binaria" }) },
    { value: "Mujer trans", label: t(language, { es: "Mujer trans", en: "Trans woman", pt: "Mulher trans" }) },
    { value: "Hombre trans", label: t(language, { es: "Hombre trans", en: "Trans man", pt: "Homem trans" }) },
    {
      value: "Otra identidad LGBTQ+",
      label: t(language, { es: "Otra identidad LGBTQ+", en: "Another LGBTQ+ identity", pt: "Outra identidade LGBTQIA+" })
    },
    {
      value: "Prefiero no decirlo",
      label: t(language, { es: "Prefiero no decirlo", en: "Prefer not to say", pt: "Prefiro nao dizer" })
    }
  ];
}
