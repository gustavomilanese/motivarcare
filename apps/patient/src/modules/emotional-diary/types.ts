export type {
  EmotionalDiaryEntry as DiaryEntry,
  EmotionalDiaryEntryStatus as DiaryEntryStatus,
  EmotionalDiaryMood as MoodLevel,
  EmotionalDiarySettings as DiarySettings
} from "@therapy/types";

export type DiaryEntryDraft = Omit<
  import("@therapy/types").EmotionalDiaryEntry,
  "id" | "createdAt" | "updatedAt" | "title" | "publishedAt"
> & {
  title?: string;
};

export interface DiaryStore {
  entries: import("@therapy/types").EmotionalDiaryEntry[];
  settings: import("@therapy/types").EmotionalDiarySettings;
}
