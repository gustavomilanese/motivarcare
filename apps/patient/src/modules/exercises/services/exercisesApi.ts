import { apiRequest } from "../../app/services/api";

export type ExerciseCategory =
  | "respiracion"
  | "postura"
  | "grounding"
  | "movimiento"
  | "relajacion"
  | "mindfulness";

export type ExerciseDifficulty = "principiante" | "intermedio" | "avanzado";

/** Coincide con `exerciseSchema` del backend (apps/api/src/modules/public/public.routes.ts). */
export interface ExercisePost {
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
  tips: string[];
  benefits: string[];
  contraindications: string;
  tags: string[];
  status: "published" | "draft";
  featured: boolean;
  publishedAt: string;
  sortOrder: number;
}

export interface ExerciseRoutineStep {
  id: string;
  slug: string;
  title: string;
  emoji: string;
  durationMinutes: number;
  category: ExerciseCategory;
  summary: string;
}

export interface ExerciseRoutine {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  emoji: string;
  exerciseIds: string[];
  exercises: ExerciseRoutineStep[];
  totalDurationMinutes: number;
  tags: string[];
  status: "published" | "draft";
  featured: boolean;
  publishedAt: string;
  sortOrder: number;
}

interface WebContentResponse {
  exercises?: ExercisePost[];
  exerciseRoutines?: ExerciseRoutine[];
}

let inflightExercises: Promise<ExercisePost[]> | null = null;
let inflightRoutines: Promise<ExerciseRoutine[]> | null = null;
let inflightBundle: Promise<{ exercises: ExercisePost[]; routines: ExerciseRoutine[] }> | null = null;

async function fetchWebContentBundle(): Promise<{ exercises: ExercisePost[]; routines: ExerciseRoutine[] }> {
  if (inflightBundle) {
    return inflightBundle;
  }
  const pending = (async () => {
    const response = await apiRequest<WebContentResponse>("/api/public/web-content", {});
    return {
      exercises: Array.isArray(response.exercises) ? response.exercises : [],
      routines: Array.isArray(response.exerciseRoutines) ? response.exerciseRoutines : []
    };
  })().finally(() => {
    inflightBundle = null;
  });
  inflightBundle = pending;
  return pending;
}

export async function fetchPublishedExercises(): Promise<ExercisePost[]> {
  if (inflightExercises) {
    return inflightExercises;
  }
  const pending = fetchWebContentBundle()
    .then((bundle) => bundle.exercises)
    .finally(() => {
      inflightExercises = null;
    });
  inflightExercises = pending;
  return pending;
}

export async function fetchPublishedExerciseRoutines(): Promise<ExerciseRoutine[]> {
  if (inflightRoutines) {
    return inflightRoutines;
  }
  const pending = fetchWebContentBundle()
    .then((bundle) => bundle.routines)
    .finally(() => {
      inflightRoutines = null;
    });
  inflightRoutines = pending;
  return pending;
}

export async function fetchPublishedExercisesContent(): Promise<{
  exercises: ExercisePost[];
  routines: ExerciseRoutine[];
}> {
  return fetchWebContentBundle();
}
