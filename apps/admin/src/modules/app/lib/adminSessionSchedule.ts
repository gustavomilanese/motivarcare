import type { AppLanguage, LocalizedText } from "@therapy/i18n-config";
import { textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const pad = (part: number) => String(part).padStart(2, "0");

/** Local `YYYY-MM-DDTHH:mm` for admin drafts / datetime-local compatible saves. */
export function toLocalDateTimeValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseLocalDateTimeValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    0,
    0
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

export function splitLocalDateTime(value: string): { date: string; time: string } {
  const parsed = parseLocalDateTimeValue(value);
  if (!parsed) {
    const now = toLocalDateTimeValue(new Date());
    return { date: now.slice(0, 10), time: now.slice(11, 16) };
  }
  return {
    date: `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`,
    time: `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
  };
}

export function combineLocalDateTime(date: string, time: string): string {
  return `${date}T${time}`;
}

export function durationMinutesBetween(startsAt: string, endsAt: string): number {
  const start = parseLocalDateTimeValue(startsAt);
  const end = parseLocalDateTimeValue(endsAt);
  if (!start || !end) {
    return 50;
  }
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  return minutes > 0 ? minutes : 50;
}

export function withDuration(startsAt: string, durationMinutes: number): { startsAt: string; endsAt: string } {
  const start = parseLocalDateTimeValue(startsAt) ?? new Date();
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return {
    startsAt: toLocalDateTimeValue(start),
    endsAt: toLocalDateTimeValue(end)
  };
}

export const SESSION_DURATION_OPTIONS = [30, 45, 50, 60, 75, 90] as const;

export type SessionSchedulePresetId = "past_2h" | "past_1h" | "now_minus_duration" | "today_same_time" | "tomorrow_same_time";

export function applySessionSchedulePreset(params: {
  preset: SessionSchedulePresetId;
  currentStartsAt: string;
  durationMinutes: number;
}): { startsAt: string; endsAt: string } {
  const duration = Math.max(15, params.durationMinutes);
  const current = parseLocalDateTimeValue(params.currentStartsAt);
  const hours = current?.getHours() ?? 10;
  const minutes = current?.getMinutes() ?? 0;
  const now = new Date();

  if (params.preset === "past_2h") {
    const end = new Date(now.getTime() - 5 * 60_000);
    const start = new Date(end.getTime() - duration * 60_000);
    return { startsAt: toLocalDateTimeValue(start), endsAt: toLocalDateTimeValue(end) };
  }
  if (params.preset === "past_1h") {
    const end = new Date(now.getTime() - 5 * 60_000);
    const start = new Date(end.getTime() - 60 * 60_000);
    return { startsAt: toLocalDateTimeValue(start), endsAt: toLocalDateTimeValue(end) };
  }
  if (params.preset === "now_minus_duration") {
    const end = new Date(now.getTime() - 60_000);
    const start = new Date(end.getTime() - duration * 60_000);
    return { startsAt: toLocalDateTimeValue(start), endsAt: toLocalDateTimeValue(end) };
  }
  if (params.preset === "tomorrow_same_time") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hours, minutes, 0, 0);
    return withDuration(toLocalDateTimeValue(start), duration);
  }
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
  return withDuration(toLocalDateTimeValue(start), duration);
}

export function sessionSchedulePresetLabel(language: AppLanguage, preset: SessionSchedulePresetId): string {
  switch (preset) {
    case "past_2h":
      return t(language, { es: "Hace ~2 h (QA)", en: "~2 h ago (QA)", pt: "Há ~2 h (QA)" });
    case "past_1h":
      return t(language, { es: "Última hora (QA)", en: "Past hour (QA)", pt: "Última hora (QA)" });
    case "now_minus_duration":
      return t(language, { es: "Recién terminó", en: "Just ended", pt: "Acabou agora" });
    case "today_same_time":
      return t(language, { es: "Hoy, misma hora", en: "Today, same time", pt: "Hoje, mesma hora" });
    case "tomorrow_same_time":
      return t(language, { es: "Mañana, misma hora", en: "Tomorrow, same time", pt: "Amanhã, mesma hora" });
  }
}

export function localDayKeyFromIso(isoOrLocal: string): string {
  const asIso = new Date(isoOrLocal);
  if (!Number.isNaN(asIso.getTime()) && /Z$|[+-]\d{2}:\d{2}$/.test(isoOrLocal)) {
    return `${asIso.getFullYear()}-${pad(asIso.getMonth() + 1)}-${pad(asIso.getDate())}`;
  }
  const local = parseLocalDateTimeValue(isoOrLocal) ?? asIso;
  return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`;
}
