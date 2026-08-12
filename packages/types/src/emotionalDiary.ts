/** Máximo de caracteres en «¿Qué pasó hoy?» (paciente + API). */
export const EMOTIONAL_DIARY_WHAT_HAPPENED_MAX_LENGTH = 3000;

/** Prefijo del mensaje de chat al enviar el informe al profesional (también se parsea en notificaciones). */
export const DIARY_SESSION_REPORT_CHAT_PREFIX = "[Informe del diario]";

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

/** Bloque legible de una entrada dentro del informe de sesión. */
export interface EmotionalDiarySessionSummaryBlock {
  entryId: string;
  title: string;
  publishedAt: string;
  mood: EmotionalDiaryMood;
  moodLabelEs: string;
  whatHappened: string;
  feelings: string[];
  recurringThought: string;
  needsNow: string[];
}

export interface EmotionalDiarySessionSummary {
  /** Frase introductoria humana. */
  headline: string;
  entryCount: number;
  generatedAt: string;
  blocks: EmotionalDiarySessionSummaryBlock[];
  /**
   * Texto plano legible (para chat / accesibilidad).
   * Alias histórico: algunos clientes leían solo `summary`.
   */
  summary: string;
}

export interface EmotionalDiarySessionReportSendResult {
  sentAt: string;
  professionalId: string;
  professionalName: string;
  entryCount: number;
  summary: EmotionalDiarySessionSummary;
}

export interface EmotionalDiaryPatientListItem {
  patientId: string;
  patientName: string;
  patientAvatarUrl: string | null;
  sharedEntryCount: number;
  lastSharedAt: string | null;
}

/** Informe enviado por el paciente, visible para el profesional. */
export interface EmotionalDiarySentReportItem {
  patientId: string;
  patientName: string;
  patientAvatarUrl: string | null;
  entryCount: number;
  sentAt: string;
  unread: boolean;
  messageId: string | null;
}
