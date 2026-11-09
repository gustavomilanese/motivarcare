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

/** Acentos DS por categoría (alineados a `wellbeingMarkTone`). */
export function categoryAccent(category: ExerciseCategory): { accent: string; accentSoft: string } {
  switch (category) {
    case "respiracion":
      return { accent: "#2f6b51", accentSoft: "#e7f1ea" };
    case "postura":
      return { accent: "#1e4033", accentSoft: "#d6e7dc" };
    case "grounding":
      return { accent: "#5e9677", accentSoft: "#e7f1ea" };
    case "movimiento":
      return { accent: "#2a5543", accentSoft: "#d6e7dc" };
    case "relajacion":
      return { accent: "#1b2a23", accentSoft: "#fbe9b0" };
    case "mindfulness":
      return { accent: "#1e4033", accentSoft: "#e6edc4" };
    default:
      return { accent: "#1e4033", accentSoft: "#e7f1ea" };
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

/** Hasta `limit` ejercicios publicados de la misma categoría; si faltan, completa con otros. */
export function pickRelatedByCategory<T extends { id: string; category: ExerciseCategory; status?: string }>(
  all: T[],
  current: Pick<T, "id" | "category">,
  limit = 3
): T[] {
  const isPublished = (item: T) => item.status === undefined || item.status === "published";
  const others = all.filter((item) => item.id !== current.id && isPublished(item));
  const sameCategory = others.filter((item) => item.category === current.category);
  if (sameCategory.length >= limit) {
    return sameCategory.slice(0, limit);
  }
  const sameIds = new Set(sameCategory.map((item) => item.id));
  const fillers = others.filter((item) => !sameIds.has(item.id));
  return [...sameCategory, ...fillers].slice(0, limit);
}
