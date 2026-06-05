/** Máximo de caracteres en «¿Qué pasó hoy?» (paciente + API). */
export const EMOTIONAL_DIARY_WHAT_HAPPENED_MAX_LENGTH = 3000;

export type EmotionalDiaryMood = "very_bad" | "bad" | "regular" | "good" | "very_good";

export type EmotionalDiaryEntryStatus = "draft" | "published";

export interface EmotionalDiarySettings {
  shareWithPsychologistDefault: boolean;
  updatedAt: string;
}

export interface EmotionalDiaryEntry {
  id: string;
  status: EmotionalDiaryEntryStatus;
  mood: EmotionalDiaryMood;
  title: string;
  whatHappened: string;
  feelings: string[];
  recurringThought: string;
  needsNow: string[];
  isPrivate: boolean;
  shareWithPsychologist: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmotionalDiaryMoodTrendPoint {
  label: string;
  score: number;
  mood: EmotionalDiaryMood;
}

export interface EmotionalDiaryInsight {
  id: string;
  icon: string;
  textEs: string;
  textEn: string;
  textPt: string;
}

export interface EmotionalDiaryStats {
  entriesThisMonth: number;
  entriesPrevMonth: number;
  mostFrequentMood: EmotionalDiaryMood;
  mostFrequentMoodPct: number;
  consecutiveDays: number;
  sharedWithPsychologist: number;
  lastSharedAt: string | null;
  moodTrend: EmotionalDiaryMoodTrendPoint[];
  insights: EmotionalDiaryInsight[];
}

export interface EmotionalDiarySessionSummary {
  summary: string;
  entryCount: number;
  generatedAt: string;
}

export interface EmotionalDiaryPatientListItem {
  patientId: string;
  patientName: string;
  patientAvatarUrl: string | null;
  sharedEntryCount: number;
  lastSharedAt: string | null;
}
