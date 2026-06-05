import type { DiaryEntry, DiaryEntryDraft, DiarySettings, DiaryStore, MoodLevel } from "../types";

const STORAGE_KEY = "motivarcare-emotional-diary-v1";

function defaultSettings(): DiarySettings {
  return { shareWithPsychologistDefault: true, updatedAt: new Date().toISOString() };
}

function deriveTitle(whatHappened: string): string {
  const line = whatHappened.trim().split(/\n/)[0]?.trim() ?? "";
  if (!line) return "Entrada sin título";
  return line.length > 48 ? `${line.slice(0, 45)}…` : line;
}

function seedEntries(): DiaryEntry[] {
  const now = Date.now();
  const day = 86400000;
  const mk = (
    offsetDays: number,
    mood: MoodLevel,
    title: string,
    preview: string,
    share: boolean
  ): DiaryEntry => {
    const createdAt = new Date(now - offsetDays * day).toISOString();
    return {
      id: `seed-${offsetDays}`,
      createdAt,
      updatedAt: createdAt,
      status: "published",
      mood,
      title,
      whatHappened: preview,
      feelings: mood === "regular" ? ["Ansiedad"] : mood === "good" ? ["Calma", "Alegría"] : ["Frustración"],
      recurringThought: "",
      needsNow: ["talk"],
      isPrivate: false,
      shareWithPsychologist: share,
      publishedAt: createdAt
    };
  };

  return [
    mk(0, "regular", "Un día intenso", "Hubo muchas cosas en movimiento hoy y me costó encontrar un momento de calma.", true),
    mk(1, "good", "Me sentí más liviano", "Pude respirar y ordenar lo que me pasaba. Fue un buen día.", false),
    mk(3, "bad", "Día complicado", "Me sentí abrumado con el trabajo y no pude desconectar.", true),
    mk(5, "regular", "Entre lo uno y lo otro", "No fue un mal día, pero tampoco me sentí del todo bien.", false)
  ];
}

function readStore(): DiaryStore {
  if (typeof window === "undefined") {
    return { entries: seedEntries(), settings: defaultSettings() };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = { entries: seedEntries(), settings: defaultSettings() };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as DiaryStore;
    if (!Array.isArray(parsed.entries)) {
      throw new Error("invalid store");
    }
    return {
      entries: parsed.entries,
      settings: parsed.settings ?? defaultSettings()
    };
  } catch {
    const seeded = { entries: seedEntries(), settings: defaultSettings() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeStore(store: DiaryStore): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function loadDiaryStore(): DiaryStore {
  return readStore();
}

export function saveDiarySettings(settings: DiarySettings): void {
  const store = readStore();
  writeStore({ ...store, settings });
}

export function listDiaryEntries(): DiaryEntry[] {
  return readStore().entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getDiaryEntry(id: string): DiaryEntry | undefined {
  return readStore().entries.find((entry) => entry.id === id);
}

export function upsertDiaryEntry(draft: DiaryEntryDraft, existingId?: string): DiaryEntry {
  const store = readStore();
  const now = new Date().toISOString();
  const title = draft.title?.trim() || deriveTitle(draft.whatHappened);

  if (existingId) {
    const index = store.entries.findIndex((entry) => entry.id === existingId);
    if (index >= 0) {
      const updated: DiaryEntry = {
        ...store.entries[index],
        ...draft,
        title,
        updatedAt: now
      };
      store.entries[index] = updated;
      writeStore(store);
      return updated;
    }
  }

  const created: DiaryEntry = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    publishedAt: draft.status === "published" ? now : null,
    title,
    ...draft
  };
  store.entries = [created, ...store.entries];
  writeStore(store);
  return created;
}

export function loadDiarySettings(): DiarySettings {
  return readStore().settings;
}
