import type {
  EmotionalDiaryEntry as PrismaEntry,
  EmotionalDiaryEntryStatus as PrismaStatus,
  EmotionalDiaryMood as PrismaMood
} from "@prisma/client";
import type {
  EmotionalDiaryEntry,
  EmotionalDiaryInsight,
  EmotionalDiaryMood,
  EmotionalDiaryMoodTrendPoint,
  EmotionalDiarySessionSummary,
  EmotionalDiarySettings,
  EmotionalDiaryStats
} from "@therapy/types";
import { prisma } from "../../lib/prisma.js";

export class EmotionalDiaryError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "FORBIDDEN",
    message: string
  ) {
    super(message);
    this.name = "EmotionalDiaryError";
  }
}

const MOOD_TO_API: Record<PrismaMood, EmotionalDiaryMood> = {
  VERY_BAD: "very_bad",
  BAD: "bad",
  REGULAR: "regular",
  GOOD: "good",
  VERY_GOOD: "very_good"
};

const MOOD_FROM_API: Record<EmotionalDiaryMood, PrismaMood> = {
  very_bad: "VERY_BAD",
  bad: "BAD",
  regular: "REGULAR",
  good: "GOOD",
  very_good: "VERY_GOOD"
};

const STATUS_TO_API: Record<PrismaStatus, EmotionalDiaryEntry["status"]> = {
  DRAFT: "draft",
  PUBLISHED: "published"
};

const STATUS_FROM_API: Record<EmotionalDiaryEntry["status"], PrismaStatus> = {
  draft: "DRAFT",
  published: "PUBLISHED"
};

const MOOD_SCORE: Record<EmotionalDiaryMood, number> = {
  very_bad: 1,
  bad: 2,
  regular: 3,
  good: 4,
  very_good: 5
};

const MOOD_LABEL_ES: Record<EmotionalDiaryMood, string> = {
  very_bad: "Muy mal",
  bad: "Mal",
  regular: "Regular",
  good: "Bien",
  very_good: "Muy bien"
};

function parseJsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function deriveEntryTitle(whatHappened: string, createdAt?: Date): string {
  const line = whatHappened.trim().split(/\n/)[0]?.trim() ?? "";
  if (line) {
    return line.length > 80 ? `${line.slice(0, 77)}…` : line;
  }
  const date = createdAt ?? new Date();
  return `Entrada del ${date.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}`;
}

function entryToDto(row: PrismaEntry): EmotionalDiaryEntry {
  return {
    id: row.id,
    status: STATUS_TO_API[row.status],
    mood: MOOD_TO_API[row.mood],
    title: row.title,
    whatHappened: row.whatHappened,
    feelings: parseJsonStringArray(row.feelings),
    recurringThought: row.recurringThought,
    needsNow: parseJsonStringArray(row.needsNow),
    isPrivate: row.isPrivate,
    shareWithPsychologist: row.shareWithPsychologist,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export async function getOrCreateSettings(patientId: string): Promise<EmotionalDiarySettings> {
  const row = await prisma.emotionalDiarySettings.upsert({
    where: { patientId },
    create: { patientId },
    update: {}
  });
  return {
    shareWithPsychologistDefault: row.shareWithPsychologistDefault,
    updatedAt: row.updatedAt.toISOString()
  };
}

export async function updateSettings(
  patientId: string,
  patch: { shareWithPsychologistDefault: boolean }
): Promise<EmotionalDiarySettings> {
  const row = await prisma.emotionalDiarySettings.upsert({
    where: { patientId },
    create: {
      patientId,
      shareWithPsychologistDefault: patch.shareWithPsychologistDefault
    },
    update: {
      shareWithPsychologistDefault: patch.shareWithPsychologistDefault
    }
  });
  return {
    shareWithPsychologistDefault: row.shareWithPsychologistDefault,
    updatedAt: row.updatedAt.toISOString()
  };
}

export async function listEntries(
  patientId: string,
  status?: EmotionalDiaryEntry["status"]
): Promise<EmotionalDiaryEntry[]> {
  const rows = await prisma.emotionalDiaryEntry.findMany({
    where: {
      patientId,
      ...(status ? { status: STATUS_FROM_API[status] } : {})
    },
    orderBy: { updatedAt: "desc" }
  });
  return rows.map(entryToDto);
}

export async function getEntry(patientId: string, entryId: string): Promise<EmotionalDiaryEntry> {
  const row = await prisma.emotionalDiaryEntry.findFirst({
    where: { id: entryId, patientId }
  });
  if (!row) {
    throw new EmotionalDiaryError("NOT_FOUND", "Entrada no encontrada");
  }
  return entryToDto(row);
}

export interface CreateEntryInput {
  status: EmotionalDiaryEntry["status"];
  mood: EmotionalDiaryMood;
  whatHappened: string;
  feelings: string[];
  recurringThought: string;
  needsNow: string[];
  isPrivate: boolean;
  shareWithPsychologist?: boolean;
  title?: string;
}

export async function createEntry(patientId: string, input: CreateEntryInput): Promise<EmotionalDiaryEntry> {
  const settings = await getOrCreateSettings(patientId);
  const now = new Date();
  const title = input.title?.trim() || deriveEntryTitle(input.whatHappened, now);
  const published = input.status === "published";

  const row = await prisma.emotionalDiaryEntry.create({
    data: {
      patientId,
      status: STATUS_FROM_API[input.status],
      mood: MOOD_FROM_API[input.mood],
      title,
      whatHappened: input.whatHappened,
      feelings: input.feelings,
      recurringThought: input.recurringThought,
      needsNow: input.needsNow,
      isPrivate: input.isPrivate,
      shareWithPsychologist: input.shareWithPsychologist ?? settings.shareWithPsychologistDefault,
      publishedAt: published ? now : null
    }
  });
  return entryToDto(row);
}

export interface PatchEntryInput {
  status?: EmotionalDiaryEntry["status"];
  mood?: EmotionalDiaryMood;
  whatHappened?: string;
  feelings?: string[];
  recurringThought?: string;
  needsNow?: string[];
  isPrivate?: boolean;
  shareWithPsychologist?: boolean;
  title?: string;
}

export async function patchEntry(
  patientId: string,
  entryId: string,
  input: PatchEntryInput
): Promise<EmotionalDiaryEntry> {
  const existing = await prisma.emotionalDiaryEntry.findFirst({
    where: { id: entryId, patientId }
  });
  if (!existing) {
    throw new EmotionalDiaryError("NOT_FOUND", "Entrada no encontrada");
  }

  const nextWhatHappened = input.whatHappened ?? existing.whatHappened;
  const nextStatus = input.status ?? STATUS_TO_API[existing.status];
  const wasPublished = existing.status === "PUBLISHED";
  const willPublish = nextStatus === "published";
  const title =
    input.title?.trim() ||
    (input.whatHappened !== undefined ? deriveEntryTitle(nextWhatHappened, existing.createdAt) : existing.title);

  let publishedAt = existing.publishedAt;
  if (willPublish && !wasPublished) {
    publishedAt = new Date();
  } else if (!willPublish) {
    publishedAt = null;
  }

  const row = await prisma.emotionalDiaryEntry.update({
    where: { id: entryId },
    data: {
      ...(input.status !== undefined ? { status: STATUS_FROM_API[input.status] } : {}),
      ...(input.mood !== undefined ? { mood: MOOD_FROM_API[input.mood] } : {}),
      ...(input.whatHappened !== undefined ? { whatHappened: input.whatHappened } : {}),
      ...(input.feelings !== undefined ? { feelings: input.feelings } : {}),
      ...(input.recurringThought !== undefined ? { recurringThought: input.recurringThought } : {}),
      ...(input.needsNow !== undefined ? { needsNow: input.needsNow } : {}),
      ...(input.isPrivate !== undefined ? { isPrivate: input.isPrivate } : {}),
      ...(input.shareWithPsychologist !== undefined
        ? { shareWithPsychologist: input.shareWithPsychologist }
        : {}),
      title,
      publishedAt
    }
  });
  return entryToDto(row);
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function computeConsecutiveDays(published: EmotionalDiaryEntry[]): number {
  const dayKeys = new Set(
    published.map((entry) => new Date(entry.createdAt).toISOString().slice(0, 10))
  );
  let consecutiveDays = 0;
  const cursor = new Date();
  while (dayKeys.has(cursor.toISOString().slice(0, 10))) {
    consecutiveDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return consecutiveDays;
}

function computeMoodTrend(published: EmotionalDiaryEntry[], weeks = 4): EmotionalDiaryMoodTrendPoint[] {
  const cutoff = Date.now() - weeks * 7 * 86400000;
  return published
    .filter((entry) => new Date(entry.createdAt).getTime() >= cutoff)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((entry) => ({
      label: new Date(entry.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short" }),
      score: MOOD_SCORE[entry.mood],
      mood: entry.mood
    }));
}

function computeInsights(published: EmotionalDiaryEntry[], stats: Omit<EmotionalDiaryStats, "insights">): EmotionalDiaryInsight[] {
  const insights: EmotionalDiaryInsight[] = [];
  const monthDelta = stats.entriesThisMonth - stats.entriesPrevMonth;

  if (monthDelta > 0) {
    insights.push({
      id: "month-growth",
      icon: "📈",
      textEs: `Registraste ${monthDelta} entrada(s) más que el mes anterior. Mantener el hábito ayuda a ver patrones.`,
      textEn: `You logged ${monthDelta} more entry(ies) than last month. Keeping the habit helps spot patterns.`,
      textPt: `Registrou ${monthDelta} entrada(s) a mais que no mês anterior. Manter o hábito ajuda a ver padrões.`
    });
  }

  if (stats.mostFrequentMood === "bad" || stats.mostFrequentMood === "very_bad") {
    insights.push({
      id: "difficult-mood",
      icon: "💛",
      textEs: `Tu estado más frecuente fue "${MOOD_LABEL_ES[stats.mostFrequentMood]}". No estás solo/a: podés usar recursos de la plataforma o hablarlo en sesión.`,
      textEn: `Your most frequent mood was "${stats.mostFrequentMood.replace("_", " ")}". You're not alone — use platform resources or discuss it in session.`,
      textPt: `Seu humor mais frequente foi desafiador. Você não está sozinho/a — use recursos da plataforma ou converse na sessão.`
    });
  }

  if (stats.consecutiveDays >= 3) {
    insights.push({
      id: "streak",
      icon: "🔥",
      textEs: `Llevás ${stats.consecutiveDays} días seguidos registrando. ¡Seguí así!`,
      textEn: `You've logged ${stats.consecutiveDays} days in a row. Keep it up!`,
      textPt: `Você registra há ${stats.consecutiveDays} dias seguidos. Continue assim!`
    });
  }

  const feelingCounts = new Map<string, number>();
  for (const entry of published) {
    for (const feeling of entry.feelings) {
      feelingCounts.set(feeling, (feelingCounts.get(feeling) ?? 0) + 1);
    }
  }
  let topFeeling = "";
  let topFeelingCount = 0;
  for (const [feeling, count] of feelingCounts) {
    if (count > topFeelingCount) {
      topFeeling = feeling;
      topFeelingCount = count;
    }
  }
  if (topFeeling && topFeelingCount >= 2) {
    insights.push({
      id: "feeling-pattern",
      icon: "💭",
      textEs: `"${topFeeling}" apareció en varias entradas. Puede ser un tema útil para explorar con tu psicólogo/a.`,
      textEn: `"${topFeeling}" showed up in several entries. It may be worth exploring with your therapist.`,
      textPt: `"${topFeeling}" apareceu em várias entradas. Pode valer a pena explorar com seu psicólogo/a.`
    });
  }

  if (stats.sharedWithPsychologist > 0) {
    insights.push({
      id: "shared",
      icon: "👥",
      textEs: `Tenés ${stats.sharedWithPsychologist} entrada(s) compartidas con tu psicólogo/a para la próxima sesión.`,
      textEn: `You have ${stats.sharedWithPsychologist} entry(ies) shared with your therapist for the next session.`,
      textPt: `Você tem ${stats.sharedWithPsychologist} entrada(s) compartilhadas com seu psicólogo/a para a próxima sessão.`
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "start",
      icon: "✨",
      textEs: "Seguí registrando para descubrir patrones emocionales a lo largo del tiempo.",
      textEn: "Keep logging to discover emotional patterns over time.",
      textPt: "Continue registrando para descobrir padrões emocionais ao longo do tempo."
    });
  }

  return insights.slice(0, 4);
}

export async function getStats(patientId: string): Promise<EmotionalDiaryStats> {
  const rows = await listEntries(patientId, "published");
  const now = new Date();
  const prevMonthAnchor = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonth = rows.filter((entry) => isSameMonth(new Date(entry.createdAt), now));
  const prevMonth = rows.filter((entry) => isSameMonth(new Date(entry.createdAt), prevMonthAnchor));

  const moodCounts = new Map<EmotionalDiaryMood, number>();
  for (const entry of rows) {
    moodCounts.set(entry.mood, (moodCounts.get(entry.mood) ?? 0) + 1);
  }
  let mostFrequentMood: EmotionalDiaryMood = "regular";
  let maxCount = 0;
  for (const [mood, count] of moodCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostFrequentMood = mood;
    }
  }
  const mostFrequentMoodPct = rows.length ? Math.round((maxCount / rows.length) * 100) : 0;

  const shared = rows.filter((entry) => entry.shareWithPsychologist && !entry.isPrivate);
  const lastSharedAt = shared[0]?.publishedAt ?? shared[0]?.createdAt ?? null;

  const baseStats = {
    entriesThisMonth: thisMonth.length,
    entriesPrevMonth: prevMonth.length,
    mostFrequentMood,
    mostFrequentMoodPct,
    consecutiveDays: computeConsecutiveDays(rows),
    sharedWithPsychologist: shared.length,
    lastSharedAt,
    moodTrend: computeMoodTrend(rows)
  };

  return {
    ...baseStats,
    insights: computeInsights(rows, baseStats)
  };
}

function sharedEntriesWhere(patientId: string) {
  return {
    patientId,
    status: "PUBLISHED" as const,
    shareWithPsychologist: true,
    isPrivate: false
  };
}

export function buildSessionSummaryMarkdown(entries: EmotionalDiaryEntry[]): string {
  if (entries.length === 0) {
    return "No hay entradas compartidas para la próxima sesión.";
  }

  const lines: string[] = [
    "# Resumen del diario emocional",
    "",
    `Entradas compartidas: ${entries.length}`,
    ""
  ];

  for (const entry of entries) {
    const dateLabel = new Date(entry.publishedAt ?? entry.createdAt).toLocaleDateString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
    lines.push(`## ${entry.title} (${dateLabel})`);
    lines.push(`**Estado de ánimo:** ${MOOD_LABEL_ES[entry.mood]}`);
    if (entry.whatHappened.trim()) {
      lines.push("");
      lines.push("**Qué pasó:**");
      lines.push(entry.whatHappened.trim());
    }
    if (entry.feelings.length > 0) {
      lines.push("");
      lines.push(`**Sentimientos:** ${entry.feelings.join(", ")}`);
    }
    if (entry.recurringThought.trim()) {
      lines.push("");
      lines.push(`**Pensamiento recurrente:** ${entry.recurringThought.trim()}`);
    }
    if (entry.needsNow.length > 0) {
      lines.push("");
      lines.push(`**Necesidades ahora:** ${entry.needsNow.join(", ")}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

export async function getSessionSummary(patientId: string): Promise<EmotionalDiarySessionSummary> {
  const rows = await prisma.emotionalDiaryEntry.findMany({
    where: sharedEntriesWhere(patientId),
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }]
  });
  const entries = rows.map(entryToDto);
  return {
    summary: buildSessionSummaryMarkdown(entries),
    entryCount: entries.length,
    generatedAt: new Date().toISOString()
  };
}

export async function assertProfessionalPatientRelation(
  professionalId: string,
  patientId: string
): Promise<void> {
  const relation = await prisma.booking.findFirst({
    where: { professionalId, patientId },
    select: { id: true }
  });
  if (!relation) {
    throw new EmotionalDiaryError("FORBIDDEN", "Patient is not under your care");
  }
}

export async function listSharedEntriesForProfessional(
  professionalId: string,
  patientId: string
): Promise<EmotionalDiaryEntry[]> {
  await assertProfessionalPatientRelation(professionalId, patientId);
  const rows = await prisma.emotionalDiaryEntry.findMany({
    where: sharedEntriesWhere(patientId),
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }]
  });
  return rows.map(entryToDto);
}

export async function getSessionSummaryForProfessional(
  professionalId: string,
  patientId: string
): Promise<EmotionalDiarySessionSummary> {
  await assertProfessionalPatientRelation(professionalId, patientId);
  return getSessionSummary(patientId);
}

export async function listPatientsWithSharedEntries(professionalId: string) {
  const bookings = await prisma.booking.findMany({
    where: { professionalId },
    select: { patientId: true },
    distinct: ["patientId"]
  });
  const patientIds = bookings.map((b) => b.patientId);
  if (patientIds.length === 0) {
    return [];
  }

  const grouped = await prisma.emotionalDiaryEntry.groupBy({
    by: ["patientId"],
    where: {
      patientId: { in: patientIds },
      status: "PUBLISHED",
      shareWithPsychologist: true,
      isPrivate: false
    },
    _count: { _all: true },
    _max: { publishedAt: true, createdAt: true }
  });

  if (grouped.length === 0) {
    return [];
  }

  const patients = await prisma.patientProfile.findMany({
    where: { id: { in: grouped.map((g) => g.patientId) } },
    include: { user: { select: { fullName: true, avatarUrl: true } } }
  });
  const patientMap = new Map(patients.map((p) => [p.id, p]));

  return grouped
    .map((row) => {
      const patient = patientMap.get(row.patientId);
      if (!patient) return null;
      const lastSharedAt = row._max.publishedAt ?? row._max.createdAt;
      return {
        patientId: row.patientId,
        patientName: patient.user.fullName,
        patientAvatarUrl: patient.user.avatarUrl ?? null,
        sharedEntryCount: row._count._all,
        lastSharedAt: lastSharedAt?.toISOString() ?? null
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => (b.lastSharedAt ?? "").localeCompare(a.lastSharedAt ?? ""));
}

export const __internals = {
  deriveEntryTitle,
  computeConsecutiveDays,
  computeMoodTrend,
  computeInsights,
  buildSessionSummaryMarkdown,
  MOOD_SCORE
};
