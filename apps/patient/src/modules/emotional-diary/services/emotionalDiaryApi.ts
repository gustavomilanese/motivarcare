import type {
  EmotionalDiaryEntry,
  EmotionalDiarySessionSummary,
  EmotionalDiarySettings,
  EmotionalDiaryStats
} from "@therapy/types";
import { apiRequest } from "../../app/services/api";
import { loadDiaryStore } from "../lib/storage";

export type {
  EmotionalDiaryEntry,
  EmotionalDiaryEntryStatus,
  EmotionalDiaryMood,
  EmotionalDiarySessionSummary,
  EmotionalDiarySettings,
  EmotionalDiaryStats
} from "@therapy/types";

const MIGRATION_FLAG = "motivarcare-emotional-diary-api-migrated-v1";

interface SettingsEnvelope {
  settings: EmotionalDiarySettings;
}

interface EntriesEnvelope {
  entries: EmotionalDiaryEntry[];
}

interface EntryEnvelope {
  entry: EmotionalDiaryEntry;
}

interface StatsEnvelope {
  stats: EmotionalDiaryStats;
}

export type CreateDiaryEntryInput = {
  status: EmotionalDiaryEntry["status"];
  mood: EmotionalDiaryEntry["mood"];
  whatHappened: string;
  feelings: string[];
  recurringThought: string;
  needsNow: string[];
  isPrivate: boolean;
  shareWithPsychologist?: boolean;
  title?: string;
};

export type PatchDiaryEntryInput = Partial<CreateDiaryEntryInput>;

/** One-time migration from Phase 1 localStorage to API when the store has seed/user data. */
export async function migrateLocalDiaryIfNeeded(token: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(MIGRATION_FLAG) === "1") return;

  const local = loadDiaryStore();
  const remoteEntries = await fetchDiaryEntries(token).catch(() => [] as EmotionalDiaryEntry[]);
  if (remoteEntries.length > 0) {
    window.localStorage.setItem(MIGRATION_FLAG, "1");
    return;
  }

  if (local.settings.shareWithPsychologistDefault !== true) {
    await patchDiarySettings({ shareWithPsychologistDefault: local.settings.shareWithPsychologistDefault }, token);
  }

  for (const entry of local.entries) {
    await createDiaryEntry(
      {
        status: entry.status,
        mood: entry.mood,
        whatHappened: entry.whatHappened,
        feelings: entry.feelings,
        recurringThought: entry.recurringThought,
        needsNow: entry.needsNow,
        isPrivate: entry.isPrivate,
        shareWithPsychologist: entry.shareWithPsychologist,
        title: entry.title
      },
      token
    );
  }

  window.localStorage.setItem(MIGRATION_FLAG, "1");
}

export async function fetchDiarySettings(token: string): Promise<EmotionalDiarySettings> {
  const result = await apiRequest<SettingsEnvelope>("/api/emotional-diary/settings", { method: "GET" }, token);
  return result.settings;
}

export async function patchDiarySettings(
  patch: { shareWithPsychologistDefault: boolean },
  token: string
): Promise<EmotionalDiarySettings> {
  const result = await apiRequest<SettingsEnvelope>(
    "/api/emotional-diary/settings",
    { method: "PATCH", body: JSON.stringify(patch) },
    token
  );
  return result.settings;
}

export async function fetchDiaryEntries(
  token: string,
  status?: EmotionalDiaryEntry["status"]
): Promise<EmotionalDiaryEntry[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const result = await apiRequest<EntriesEnvelope>(`/api/emotional-diary/entries${query}`, { method: "GET" }, token);
  return result.entries;
}

export async function fetchDiaryEntry(entryId: string, token: string): Promise<EmotionalDiaryEntry> {
  const result = await apiRequest<EntryEnvelope>(
    `/api/emotional-diary/entries/${encodeURIComponent(entryId)}`,
    { method: "GET" },
    token
  );
  return result.entry;
}

export async function createDiaryEntry(input: CreateDiaryEntryInput, token: string): Promise<EmotionalDiaryEntry> {
  const result = await apiRequest<EntryEnvelope>(
    "/api/emotional-diary/entries",
    { method: "POST", body: JSON.stringify(input) },
    token
  );
  return result.entry;
}

export async function patchDiaryEntry(
  entryId: string,
  input: PatchDiaryEntryInput,
  token: string
): Promise<EmotionalDiaryEntry> {
  const result = await apiRequest<EntryEnvelope>(
    `/api/emotional-diary/entries/${encodeURIComponent(entryId)}`,
    { method: "PATCH", body: JSON.stringify(input) },
    token
  );
  return result.entry;
}

export async function fetchDiaryStats(token: string): Promise<EmotionalDiaryStats> {
  const result = await apiRequest<StatsEnvelope>("/api/emotional-diary/stats", { method: "GET" }, token);
  return result.stats;
}

export async function fetchDiarySessionSummary(token: string): Promise<EmotionalDiarySessionSummary> {
  return apiRequest<EmotionalDiarySessionSummary>("/api/emotional-diary/session-summary", { method: "GET" }, token);
}
