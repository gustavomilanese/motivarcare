import type { AppLanguage } from "@therapy/i18n-config";
import type { EmotionalDiaryMood } from "@therapy/types";
import { isSameZonedDay, weekdayLabels } from "./calmHomeFormat";

export const WEEK_MOOD_X = [20, 63, 106, 149, 192, 235, 278] as const;

export const WEEK_MOOD_Y: Record<EmotionalDiaryMood, number> = {
  very_bad: 86,
  bad: 72,
  regular: 55,
  good: 40,
  very_good: 28
};

export type WeekMoodEntry = {
  createdAt: string;
  status: "draft" | "published";
  mood: EmotionalDiaryMood | null;
};

export type WeekMoodPoint = {
  x: number;
  y: number | null;
  mood: EmotionalDiaryMood | null;
  label: string;
};

/** Últimos 7 días (incluye hoy): un punto por día con el mood más reciente publicado. */
export function buildWeekMoodPoints(
  entries: WeekMoodEntry[],
  now: Date,
  timeZone: string,
  language: AppLanguage
): WeekMoodPoint[] {
  const labels = weekdayLabels(now, timeZone, language);
  const published = entries.filter((entry) => entry.status === "published" && entry.mood);

  return WEEK_MOOD_X.map((x, index) => {
    const day = new Date(now.getTime() - (6 - index) * 24 * 60 * 60 * 1000);
    const match = published
      .filter((entry) => isSameZonedDay(new Date(entry.createdAt), day, timeZone))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return {
      x,
      y: match?.mood ? WEEK_MOOD_Y[match.mood] : null,
      mood: match?.mood ?? null,
      label: labels[index] ?? ""
    };
  });
}
