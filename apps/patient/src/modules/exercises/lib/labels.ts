import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { ExerciseCategory, ExerciseDifficulty } from "../services/exercisesApi";

export function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const CATEGORY_LABELS: Record<ExerciseCategory, LocalizedText> = {
  respiracion: { es: "Respiración", en: "Breathing", pt: "Respiração" },
  postura: { es: "Postura", en: "Posture", pt: "Postura" },
  grounding: { es: "Anclaje", en: "Grounding", pt: "Ancoragem" },
  movimiento: { es: "Movimiento", en: "Movement", pt: "Movimento" },
  relajacion: { es: "Relajación", en: "Relaxation", pt: "Relaxamento" },
  mindfulness: { es: "Mindfulness", en: "Mindfulness", pt: "Mindfulness" }
};

const DIFFICULTY_LABELS: Record<ExerciseDifficulty, LocalizedText> = {
  principiante: { es: "Principiante", en: "Beginner", pt: "Iniciante" },
  intermedio: { es: "Intermedio", en: "Intermediate", pt: "Intermediário" },
  avanzado: { es: "Avanzado", en: "Advanced", pt: "Avançado" }
};

export function categoryLabel(language: AppLanguage, category: ExerciseCategory): string {
  return t(language, CATEGORY_LABELS[category]);
}

export function difficultyLabel(language: AppLanguage, difficulty: ExerciseDifficulty): string {
  return t(language, DIFFICULTY_LABELS[difficulty]);
}

/**
 * Devuelve un par de variables CSS (`--exercise-accent`, `--exercise-accent-soft`) para
 * tematizar tarjetas y badges según la categoría sin tener que mantener una hoja de
 * estilos por cada una.
 */
export function categoryAccent(category: ExerciseCategory): { accent: string; accentSoft: string } {
  switch (category) {
    case "respiracion":
      return { accent: "#5b9bd5", accentSoft: "rgba(91, 155, 213, 0.16)" };
    case "postura":
      return { accent: "#7a5cff", accentSoft: "rgba(122, 92, 255, 0.16)" };
    case "grounding":
      return { accent: "#3aa17e", accentSoft: "rgba(58, 161, 126, 0.16)" };
    case "movimiento":
      return { accent: "#f08b3a", accentSoft: "rgba(240, 139, 58, 0.16)" };
    case "relajacion":
      return { accent: "#d97aa6", accentSoft: "rgba(217, 122, 166, 0.16)" };
    case "mindfulness":
      return { accent: "#48a3a8", accentSoft: "rgba(72, 163, 168, 0.16)" };
    default:
      return { accent: "#7a5cff", accentSoft: "rgba(122, 92, 255, 0.14)" };
  }
}

export function durationLabel(language: AppLanguage, minutes: number): string {
  const safe = Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : 0;
  return t(language, {
    es: `${safe} min`,
    en: `${safe} min`,
    pt: `${safe} min`
  });
}

export const ALL_CATEGORIES: ExerciseCategory[] = [
  "respiracion",
  "postura",
  "grounding",
  "movimiento",
  "relajacion",
  "mindfulness"
];
