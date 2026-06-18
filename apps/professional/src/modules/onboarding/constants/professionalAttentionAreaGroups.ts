import type { LocalizedText } from "@therapy/i18n-config";
import {
  PROFESSIONAL_ATTENTION_AREA_COUPLES_ES,
  PROFESSIONAL_ATTENTION_AREA_OPTIONS_ES
} from "./professionalAttentionAreas";

export type ProfessionalAttentionAreaGroup = {
  id: string;
  title: LocalizedText;
  areas: readonly string[];
};

export const PROFESSIONAL_ATTENTION_AREA_GROUPS: readonly ProfessionalAttentionAreaGroup[] = [
  {
    id: "mood",
    title: { es: "Ánimo y ansiedad", en: "Mood and anxiety", pt: "Humor e ansiedade" },
    areas: ["Ansiedad", "Ataques de pánico", "Estrés", "Depresión", "Manejo de emociones"]
  },
  {
    id: "relationships",
    title: { es: "Relaciones", en: "Relationships", pt: "Relacionamentos" },
    areas: ["Dificultad en relaciones", "Rupturas amorosas o duelos", PROFESSIONAL_ATTENTION_AREA_COUPLES_ES]
  },
  {
    id: "self-growth",
    title: { es: "Autoestima y crecimiento", en: "Self-esteem and growth", pt: "Autoestima e crescimento" },
    areas: ["Problemas de autoestima", "Crecimiento personal", "Falta de motivación o propósito", "Soledad"]
  },
  {
    id: "work",
    title: { es: "Trabajo y decisiones", en: "Work and decisions", pt: "Trabalho e decisoes" },
    areas: ["Problemas laborales o burnout", "Toma de decisiones importantes"]
  },
  {
    id: "habits",
    title: { es: "Hábitos y bienestar", en: "Habits and wellbeing", pt: "Habitos e bem-estar" },
    areas: ["Problemas de sueño", "Consumo o conductas adictivas", "Dificultad para controlar impulsos"]
  },
  {
    id: "crisis",
    title: { es: "Crisis y experiencias difíciles", en: "Crisis and difficult experiences", pt: "Crises e experiencias dificeis" },
    areas: ["Experiencias difíciles del pasado", "Crisis personales"]
  }
] as const;

const groupedAreas = new Set(PROFESSIONAL_ATTENTION_AREA_GROUPS.flatMap((group) => group.areas));
if (groupedAreas.size !== PROFESSIONAL_ATTENTION_AREA_OPTIONS_ES.length) {
  throw new Error("Professional attention area groups must cover every canonical option exactly once.");
}
for (const area of PROFESSIONAL_ATTENTION_AREA_OPTIONS_ES) {
  if (!groupedAreas.has(area)) {
    throw new Error(`Missing attention area in groups: ${area}`);
  }
}
