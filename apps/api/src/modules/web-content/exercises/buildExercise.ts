import type { ExerciseDifficulty, ExercisePost, ExerciseCategory } from "../exercises.defaults.js";

export const EXERCISE_CATALOG_DATE = "2026-06-03";

type ExerciseDef = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: ExerciseCategory;
  durationMinutes: number;
  difficulty: ExerciseDifficulty;
  emoji: string;
  steps: string[];
  tips?: string[];
  benefits?: string[];
  contraindications?: string;
  tags?: string[];
  featured?: boolean;
  sortOrder: number;
};

export function buildExercise(def: ExerciseDef): ExercisePost {
  return {
    id: def.id,
    slug: def.slug,
    title: def.title,
    summary: def.summary,
    description: def.description,
    category: def.category,
    durationMinutes: def.durationMinutes,
    difficulty: def.difficulty,
    emoji: def.emoji,
    steps: def.steps,
    tips: def.tips ?? [],
    benefits: def.benefits ?? [],
    contraindications: def.contraindications ?? "",
    tags: def.tags ?? [],
    status: "published",
    featured: def.featured ?? false,
    publishedAt: EXERCISE_CATALOG_DATE,
    sortOrder: def.sortOrder
  };
}
