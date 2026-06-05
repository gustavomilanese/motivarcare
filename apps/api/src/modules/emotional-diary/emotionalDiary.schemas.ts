import { EMOTIONAL_DIARY_WHAT_HAPPENED_MAX_LENGTH } from "@therapy/types";
import { z } from "zod";

export const emotionalDiaryMoodSchema = z.enum(["very_bad", "bad", "regular", "good", "very_good"]);

export const emotionalDiaryStatusSchema = z.enum(["draft", "published"]);

export const patchSettingsSchema = z
  .object({
    shareWithPsychologistDefault: z.boolean()
  })
  .strict();

export const listEntriesQuerySchema = z.object({
  status: emotionalDiaryStatusSchema.optional()
});

export const createEntrySchema = z
  .object({
    status: emotionalDiaryStatusSchema.default("draft"),
    mood: emotionalDiaryMoodSchema,
    whatHappened: z.string().max(EMOTIONAL_DIARY_WHAT_HAPPENED_MAX_LENGTH).default(""),
    feelings: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
    recurringThought: z.string().max(800).default(""),
    needsNow: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
    isPrivate: z.boolean().default(false),
    shareWithPsychologist: z.boolean().optional(),
    title: z.string().trim().max(200).optional()
  })
  .strict();

export const patchEntrySchema = z
  .object({
    status: emotionalDiaryStatusSchema.optional(),
    mood: emotionalDiaryMoodSchema.optional(),
    whatHappened: z.string().max(EMOTIONAL_DIARY_WHAT_HAPPENED_MAX_LENGTH).optional(),
    feelings: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
    recurringThought: z.string().max(800).optional(),
    needsNow: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
    isPrivate: z.boolean().optional(),
    shareWithPsychologist: z.boolean().optional(),
    title: z.string().trim().max(200).optional()
  })
  .strict();
