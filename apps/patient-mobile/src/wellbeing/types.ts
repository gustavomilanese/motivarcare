import type {
  EmotionalDiaryEntry,
  EmotionalDiaryEntryStatus,
  EmotionalDiaryMood,
  EmotionalDiarySessionSummary,
  EmotionalDiarySettings,
  EmotionalDiaryStats
} from "@therapy/types";

export type ExerciseCategory =
  | "respiracion"
  | "postura"
  | "grounding"
  | "movimiento"
  | "relajacion"
  | "mindfulness";

export type ExerciseDifficulty = "principiante" | "intermedio" | "avanzado";

export type ExercisePost = {
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
};

export type ExerciseRoutineStep = {
  id: string;
  slug: string;
  title: string;
  emoji: string;
  durationMinutes: number;
  category: ExerciseCategory;
  summary: string;
};

export type ExerciseRoutine = {
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
};

export type RelaxationPlaylistItem = {
  id: string;
  categoryId: string;
  categoryLabel: { es: string; en: string; pt: string };
  title: { es: string; en: string; pt: string };
  blurb: { es: string; en: string; pt: string };
  embedType: "spotify" | "youtube";
  embedSrc: string;
  openUrl: string;
};

export type CreateDiaryEntryInput = {
  status: EmotionalDiaryEntryStatus;
  mood: EmotionalDiaryMood;
  whatHappened: string;
  feelings: string[];
  recurringThought: string;
  needsNow: string[];
  isPrivate: boolean;
  shareWithPsychologist?: boolean;
  title?: string;
};

export type {
  EmotionalDiaryEntry,
  EmotionalDiaryEntryStatus,
  EmotionalDiaryMood,
  EmotionalDiarySessionSummary,
  EmotionalDiarySettings,
  EmotionalDiaryStats
};
