import type { AppLanguage } from "@therapy/i18n-config";
import type { DiaryEntry, MoodLevel } from "../types";
import { moodMeta } from "./moods";

export interface DiaryStats {
  entriesThisMonth: number;
  entriesPrevMonth: number;
  mostFrequentMood: MoodLevel;
  mostFrequentMoodPct: number;
  consecutiveDays: number;
  sharedWithPsychologist: number;
  lastSharedLabel: string;
}

export interface WeeklyInsight {
  id: string;
  icon: string;
  textEs: string;
  textEn: string;
  textPt: string;
}

const MOOD_SCORE: Record<MoodLevel, number> = {
  very_bad: 1,
  bad: 2,
  regular: 3,
  good: 4,
  very_good: 5
};

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function computeDiaryStats(entries: DiaryEntry[]): DiaryStats {
  const published = entries.filter((entry) => entry.status === "published");
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonth = published.filter((entry) => isSameMonth(new Date(entry.createdAt), now));
  const prevMonth = published.filter((entry) => isSameMonth(new Date(entry.createdAt), prev));

  const moodCounts = new Map<MoodLevel, number>();
  for (const entry of published) {
    moodCounts.set(entry.mood, (moodCounts.get(entry.mood) ?? 0) + 1);
  }
  let mostFrequentMood: MoodLevel = "regular";
  let maxCount = 0;
  for (const [mood, count] of moodCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostFrequentMood = mood;
    }
  }
  const mostFrequentMoodPct = published.length ? Math.round((maxCount / published.length) * 100) : 0;

  const dayKeys = new Set(
    published.map((entry) => new Date(entry.createdAt).toISOString().slice(0, 10))
  );
  let consecutiveDays = 0;
  const cursor = new Date();
  while (dayKeys.has(cursor.toISOString().slice(0, 10))) {
    consecutiveDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const shared = published.filter((entry) => entry.shareWithPsychologist);
  const lastShared = shared[0]?.createdAt;
  const lastSharedLabel = lastShared
    ? new Date(lastShared).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  return {
    entriesThisMonth: thisMonth.length,
    entriesPrevMonth: prevMonth.length,
    mostFrequentMood,
    mostFrequentMoodPct,
    consecutiveDays,
    sharedWithPsychologist: shared.length,
    lastSharedLabel
  };
}

export interface WeeklyMoodBucket {
  key: string;
  label: string;
  score: number | null;
  mood: MoodLevel | null;
  entryCount: number;
}

const SCORE_TO_MOOD: MoodLevel[] = ["very_bad", "bad", "regular", "good", "very_good"];

/** Agrupa entradas en semanas (promedio de ánimo) para el gráfico de registros. */
export function buildWeeklyMoodSeries(
  entries: DiaryEntry[],
  language: AppLanguage,
  weeks = 4
): WeeklyMoodBucket[] {
  const published = entries
    .filter((entry) => entry.status === "published")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const locale = language === "en" ? "en-US" : language === "pt" ? "pt-BR" : "es-AR";
  const buckets: WeeklyMoodBucket[] = [];

  for (let w = weeks - 1; w >= 0; w -= 1) {
    const weekEnd = new Date();
    weekEnd.setHours(23, 59, 59, 999);
    weekEnd.setDate(weekEnd.getDate() - w * 7);

    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const inWeek = published.filter((entry) => {
      const created = new Date(entry.createdAt);
      return created >= weekStart && created <= weekEnd;
    });

    let label: string;
    if (w === 0) {
      label = language === "en" ? "This week" : language === "pt" ? "Esta semana" : "Esta semana";
    } else if (w === 1) {
      label = language === "en" ? "Last week" : language === "pt" ? "Semana passada" : "Sem. pasada";
    } else {
      const fmt = (date: Date) => date.toLocaleDateString(locale, { day: "numeric", month: "short" });
      label = `${fmt(weekStart)} – ${fmt(weekEnd)}`;
    }

    if (inWeek.length === 0) {
      buckets.push({ key: `week-${w}`, label, score: null, mood: null, entryCount: 0 });
      continue;
    }

    const average =
      inWeek.reduce((sum, entry) => sum + MOOD_SCORE[entry.mood], 0) / inWeek.length;
    const score = Math.min(5, Math.max(1, Math.round(average)));

    buckets.push({
      key: `week-${w}`,
      label,
      score,
      mood: SCORE_TO_MOOD[score - 1],
      entryCount: inWeek.length
    });
  }

  return buckets;
}

export interface WeeklyMoodLineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Segmentos de línea entre semanas consecutivas que tienen promedio (viewBox 0–100). */
export function buildWeeklyMoodLineSegments(weeks: WeeklyMoodBucket[]): WeeklyMoodLineSegment[] {
  const segments: WeeklyMoodLineSegment[] = [];
  const total = weeks.length;
  if (total < 2) return segments;

  let previous: { x: number; y: number } | null = null;

  weeks.forEach((week, index) => {
    if (week.score === null) {
      previous = null;
      return;
    }

    const x = ((index + 0.5) / total) * 100;
    const y = ((5 - week.score) / 4) * 100;

    if (previous) {
      segments.push({ x1: previous.x, y1: previous.y, x2: x, y2: y });
    }
    previous = { x, y };
  });

  return segments;
}

export function moodTrendPoints(entries: DiaryEntry[], weeks = 4): { label: string; score: number; mood: MoodLevel }[] {
  const published = entries
    .filter((entry) => entry.status === "published")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const cutoff = Date.now() - weeks * 7 * 86400000;
  return published
    .filter((entry) => new Date(entry.createdAt).getTime() >= cutoff)
    .map((entry) => ({
      label: new Date(entry.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short" }),
      score: MOOD_SCORE[entry.mood],
      mood: entry.mood
    }));
}

export function defaultWeeklyInsights(): WeeklyInsight[] {
  return [
    {
      id: "1",
      icon: "📈",
      textEs: "Tus días con más ansiedad coincidieron con jornadas laborales intensas.",
      textEn: "Your highest-anxiety days matched intense workdays.",
      textPt: "Seus dias com mais ansiedade coincidiram com jornadas de trabalho intensas."
    },
    {
      id: "2",
      icon: "🍃",
      textEs: "Cuando hiciste ejercicios de respiración, tu ánimo mejoró al día siguiente.",
      textEn: "When you did breathing exercises, your mood improved the next day.",
      textPt: "Quando fez exercícios de respiração, seu humor melhorou no dia seguinte."
    },
    {
      id: "3",
      icon: "💛",
      textEs: "Registraste más días positivos cuando incluiste actividades que disfrutás.",
      textEn: "You logged more positive days when you included activities you enjoy.",
      textPt: "Registrou mais dias positivos quando incluiu atividades que gosta."
    }
  ];
}

export function moodLabelForStats(mood: MoodLevel, language: "es" | "en" | "pt"): string {
  const meta = moodMeta(mood);
  if (language === "en") return meta.labelEn;
  if (language === "pt") return meta.labelPt;
  return meta.labelEs;
}
