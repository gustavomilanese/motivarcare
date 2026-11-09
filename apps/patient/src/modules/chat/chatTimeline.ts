import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { DIARY_SESSION_REPORT_CHAT_PREFIX, type EmotionalDiaryMood } from "@therapy/types";
import { formatShortDate, isSameZonedDay } from "../home/calm/calmHomeFormat";

export const DIARY_ENTRY_SHARE_PREFIX = "[Entrada del diario:";

export type ChatTimelineMessage = {
  id: string;
  body: string;
  createdAt: string;
  outgoing: boolean;
  read: boolean;
};

export type ChatSharedEntry = {
  id: string;
  title: string;
  mood: EmotionalDiaryMood;
  createdAt: string;
  publishedAt: string | null;
};

export type ChatTimelineItem =
  | { kind: "day"; id: string; label: string }
  | {
      kind: "text";
      id: string;
      outgoing: boolean;
      body: string;
      timeLabel: string;
      seen: boolean;
      at: string;
    }
  | {
      kind: "diary";
      id: string;
      entryId: string;
      title: string;
      meta: string;
      mood: EmotionalDiaryMood | null;
      timeLabel: string;
      at: string;
    }
  | { kind: "report"; id: string; title: string; timeLabel: string; at: string };

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function localeTag(language: AppLanguage): string {
  if (language === "en") return "en-US";
  if (language === "pt") return "pt-BR";
  return "es-AR";
}

export function diaryEntryShareBody(entry: {
  id: string;
  dateLabel: string;
  moodLabel: string;
  title: string;
}): string {
  return `${DIARY_ENTRY_SHARE_PREFIX}${entry.id}] ${entry.dateLabel} · ${entry.moodLabel}\n${entry.title}`;
}

export function parseDiaryEntryShare(body: string): { entryId: string; rest: string } | null {
  if (!body.startsWith(DIARY_ENTRY_SHARE_PREFIX)) return null;
  const end = body.indexOf("]");
  if (end < DIARY_ENTRY_SHARE_PREFIX.length) return null;
  const entryId = body.slice(DIARY_ENTRY_SHARE_PREFIX.length, end).trim();
  if (!entryId) return null;
  return { entryId, rest: body.slice(end + 1).trim() };
}

function clockLabel(iso: string, timeZone: string, language: AppLanguage): string {
  return new Intl.DateTimeFormat(localeTag(language), {
    hour: "numeric",
    minute: "2-digit",
    timeZone
  }).format(new Date(iso));
}

function dayLabel(iso: string, timeZone: string, language: AppLanguage, now: Date): string {
  const date = new Date(iso);
  if (isSameZonedDay(date, now, timeZone)) {
    return t(language, { es: "Hoy", en: "Today", pt: "Hoje" });
  }
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (isSameZonedDay(date, yesterday, timeZone)) {
    return t(language, { es: "Ayer", en: "Yesterday", pt: "Ontem" });
  }
  const formatted = formatShortDate(iso, timeZone, language);
  return formatted.charAt(0).toLocaleUpperCase(localeTag(language)) + formatted.slice(1);
}

function diaryMetaFromRest(rest: string, entry: ChatSharedEntry | undefined, timeZone: string, language: AppLanguage): {
  title: string;
  meta: string;
  mood: EmotionalDiaryMood | null;
} {
  const lines = rest.split("\n").map((line) => line.trim()).filter(Boolean);
  const title = entry?.title?.trim() || lines[1] || lines[0] || rest;
  const meta = lines[0] && lines[1] ? lines[0] : formatShortDate(entry?.publishedAt || entry?.createdAt || new Date().toISOString(), timeZone, language);
  return { title, meta, mood: entry?.mood ?? null };
}

export function buildChatTimeline(params: {
  messages: ChatTimelineMessage[];
  sharedEntries: ChatSharedEntry[];
  timeZone: string;
  language: AppLanguage;
  now?: Date;
}): ChatTimelineItem[] {
  const now = params.now ?? new Date();
  const entriesById = new Map(params.sharedEntries.map((entry) => [entry.id, entry]));
  const dated: Array<{ at: string; item: ChatTimelineItem }> = [];

  for (const message of params.messages) {
    const timeLabel = clockLabel(message.createdAt, params.timeZone, params.language);
    const diaryShare = message.outgoing ? parseDiaryEntryShare(message.body) : null;
    if (diaryShare) {
      const parsed = diaryMetaFromRest(diaryShare.rest, entriesById.get(diaryShare.entryId), params.timeZone, params.language);
      dated.push({
        at: message.createdAt,
        item: {
          kind: "diary",
          id: message.id,
          entryId: diaryShare.entryId,
          title: parsed.title,
          meta: parsed.meta,
          mood: parsed.mood,
          timeLabel,
          at: message.createdAt
        }
      });
      continue;
    }
    if (message.body.startsWith(DIARY_SESSION_REPORT_CHAT_PREFIX)) {
      dated.push({
        at: message.createdAt,
        item: {
          kind: "report",
          id: message.id,
          title: t(params.language, {
            es: "Informe del diario",
            en: "Diary report",
            pt: "Relatório do diário"
          }),
          timeLabel,
          at: message.createdAt
        }
      });
      continue;
    }
    dated.push({
      at: message.createdAt,
      item: {
        kind: "text",
        id: message.id,
        outgoing: message.outgoing,
        body: message.body,
        timeLabel,
        seen: message.outgoing && message.read,
        at: message.createdAt
      }
    });
  }

  dated.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const timeline: ChatTimelineItem[] = [];
  let lastDay = "";
  for (const row of dated) {
    const label = dayLabel(row.at, params.timeZone, params.language, now);
    if (label !== lastDay) {
      timeline.push({ kind: "day", id: `day-${row.at}-${label}`, label });
      lastDay = label;
    }
    timeline.push(row.item);
  }
  return timeline;
}
