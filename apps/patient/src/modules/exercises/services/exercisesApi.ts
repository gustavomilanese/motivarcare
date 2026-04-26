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

interface WebContentResponse {
  exercises?: ExercisePost[];
  updatedAt?: { exercises?: string | null };
}

let inflight: Promise<ExercisePost[]> | null = null;

/**
 * Lista de ejercicios publicados (mismo origen `/api/public/web-content` que la landing).
 * El backend ya filtra `status === "published"` y ordena por featured + sortOrder + publishedAt.
 */
export async function fetchPublishedExercises(): Promise<ExercisePost[]> {
  if (inflight) {
    return inflight;
  }
  const pending = (async (): Promise<ExercisePost[]> => {
    const response = await apiRequest<WebContentResponse>("/api/public/web-content", {});
    return Array.isArray(response.exercises) ? response.exercises : [];
  })().finally(() => {
    inflight = null;
  });
  inflight = pending;
  return pending;
}
