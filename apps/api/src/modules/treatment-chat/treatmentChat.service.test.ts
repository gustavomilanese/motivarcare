import type { PatientTreatmentChat } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { __internals } from "./treatmentChat.service.js";

const { startOfUtcDay, computeDailyUsed, pickHigherSeverity } = __internals;

function buildChat(overrides: Partial<PatientTreatmentChat> = {}): PatientTreatmentChat {
  const now = new Date("2026-04-26T15:30:00.000Z");
  return {
    id: "chat-1",
    patientId: "pat-1",
    status: "active",
    messageCount: 0,
    estimatedCostUsdCents: 0,
    lastUserMessageAt: null,
    dailyCounterDate: null,
    dailyCounterValue: 0,
    highestSafetySeverity: null,
    lastSafetyEventAt: null,
    llmProvider: "mock",
    llmModel: "mock-treatment",
    professionalSummaryJson: null,
    professionalSummaryAt: null,
    professionalSummaryMessageCount: null,
    professionalShareConsent: false,
    professionalShareConsentAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  } as PatientTreatmentChat;
}

describe("treatment-chat service internals", () => {
  describe("startOfUtcDay", () => {
    it("normaliza una hora arbitraria al 00:00 UTC del mismo día", () => {
      const result = startOfUtcDay(new Date("2026-04-26T15:30:00.000Z"));
      expect(result.toISOString()).toBe("2026-04-26T00:00:00.000Z");
    });
  });

  describe("computeDailyUsed", () => {
    it("devuelve 0 si nunca se contó nada", () => {
      const chat = buildChat({ dailyCounterDate: null, dailyCounterValue: 0 });
      const today = startOfUtcDay(new Date("2026-04-26T15:30:00.000Z"));
      expect(computeDailyUsed(chat, today)).toBe(0);
    });

    it("devuelve el contador si la fecha es la misma", () => {
      const today = startOfUtcDay(new Date("2026-04-26T15:30:00.000Z"));
      const chat = buildChat({ dailyCounterDate: today, dailyCounterValue: 7 });
      expect(computeDailyUsed(chat, today)).toBe(7);
    });

    it("devuelve 0 si la fecha es distinta (reset diario)", () => {
      const ayer = startOfUtcDay(new Date("2026-04-25T15:30:00.000Z"));
      const today = startOfUtcDay(new Date("2026-04-26T15:30:00.000Z"));
      const chat = buildChat({ dailyCounterDate: ayer, dailyCounterValue: 30 });
      expect(computeDailyUsed(chat, today)).toBe(0);
    });
  });

  describe("pickHigherSeverity", () => {
    it("none + low = low", () => {
      expect(pickHigherSeverity(null, "low")).toBe("low");
      expect(pickHigherSeverity("none", "low")).toBe("low");
    });

    it("low + high = high", () => {
      expect(pickHigherSeverity("low", "high")).toBe("high");
    });

    it("high + low se queda en high (nunca baja)", () => {
      expect(pickHigherSeverity("high", "low")).toBe("high");
      expect(pickHigherSeverity("high", "none")).toBe("high");
    });
  });
});
