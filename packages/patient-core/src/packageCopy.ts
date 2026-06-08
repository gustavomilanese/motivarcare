import type { LocalizedText } from "@therapy/i18n-config";

export type PackageCopyTranslator = (values: LocalizedText) => string;

export function describePackagePlan(credits: number, t: PackageCopyTranslator): string {
  if (credits >= 12) {
    return t({
      es: "Mayor frecuencia para procesos de alta demanda.",
      en: "Higher frequency for high-demand processes.",
      pt: "Maior frequencia para processos de alta demanda."
    });
  }
  if (credits >= 8) {
    return t({
      es: "Plan recomendado para trabajo mensual sostenido.",
      en: "Recommended plan for sustained monthly work.",
      pt: "Plano recomendado para trabalho mensal sustentado."
    });
  }
  return t({
    es: "Ideal para una primera etapa de trabajo terapéutico.",
    en: "Ideal for an initial therapy stage.",
    pt: "Ideal para uma primeira etapa de trabalho terapeutico."
  });
}

export function bundleDisplayName(credits: number, t: PackageCopyTranslator): string {
  if (credits >= 12) {
    return t({
      es: "Intensivo · 12 sesiones",
      en: "Intensive · 12 sessions",
      pt: "Intensivo · 12 sessoes"
    });
  }
  if (credits >= 8) {
    return t({
      es: "Continuidad · 8 sesiones",
      en: "Continuity · 8 sessions",
      pt: "Continuidade · 8 sessoes"
    });
  }
  return t({
    es: "Inicio · 4 sesiones",
    en: "Starter · 4 sessions",
    pt: "Inicio · 4 sessoes"
  });
}
