import { describe, expect, it } from "vitest";
import type { EmotionalDiaryEntry } from "@therapy/types";
import { __internals } from "./emotionalDiary.service.js";

const { deriveEntryTitle, buildSessionSummaryMarkdown, computeConsecutiveDays } = __internals;

function buildEntry(overrides: Partial<EmotionalDiaryEntry> = {}): EmotionalDiaryEntry {
  const now = "2026-06-04T12:00:00.000Z";
  return {
    id: "entry-1",
    status: "published",
    mood: "regular",
    title: "Test",
    whatHappened: "Algo pasó hoy",
    feelings: ["Ansiedad"],
    recurringThought: "",
    needsNow: ["talk"],
    isPrivate: false,
    shareWithPsychologist: true,
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

describe("emotional-diary service internals", () => {
  describe("deriveEntryTitle", () => {
    it("usa las primeras ~80 chars de whatHappened", () => {
      const long = "a".repeat(90);
      expect(deriveEntryTitle(long)).toBe(`${"a".repeat(77)}…`);
    });

    it("usa fallback con fecha si whatHappened está vacío", () => {
      const title = deriveEntryTitle("", new Date("2026-06-04T12:00:00.000Z"));
      expect(title).toContain("Entrada del");
      expect(title).toContain("2026");
    });
  });

  describe("buildSessionSummaryMarkdown", () => {
    it("incluye título y mood de entradas compartidas", () => {
      const md = buildSessionSummaryMarkdown([buildEntry({ title: "Día intenso" })]);
      expect(md).toContain("# Resumen del diario emocional");
      expect(md).toContain("Día intenso");
      expect(md).toContain("Regular");
    });

    it("devuelve mensaje vacío si no hay entradas", () => {
      expect(buildSessionSummaryMarkdown([])).toContain("No hay entradas compartidas");
    });
  });

  describe("computeConsecutiveDays", () => {
    it("cuenta días consecutivos desde hoy hacia atrás", () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const entries = [
        buildEntry({ createdAt: today.toISOString() }),
        buildEntry({ id: "e2", createdAt: yesterday.toISOString() })
      ];
      expect(computeConsecutiveDays(entries)).toBeGreaterThanOrEqual(2);
    });
  });
});
