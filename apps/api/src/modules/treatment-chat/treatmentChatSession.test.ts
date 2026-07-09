import { describe, expect, it } from "vitest";
import {
  computeSessionQuota,
  resolveConversationSession,
  sessionMaxMs
} from "./treatmentChatSession.js";

describe("treatmentChatSession", () => {
  it("inicia conversación nueva si no hay sesión previa", () => {
    const now = new Date("2026-04-26T15:00:00.000Z");
    const state = resolveConversationSession(
      { conversationSessionStartedAt: null, lastUserMessageAt: null },
      now
    );
    expect(state.isNew).toBe(true);
    expect(state.expired).toBe(false);
  });

  it("marca expirada después del máximo de minutos", () => {
    const started = new Date("2026-04-26T15:00:00.000Z");
    const now = new Date(started.getTime() + sessionMaxMs() + 1);
    const state = resolveConversationSession(
      {
        conversationSessionStartedAt: started,
        lastUserMessageAt: new Date("2026-04-26T15:05:00.000Z")
      },
      now
    );
    expect(state.expired).toBe(true);
    expect(state.isNew).toBe(false);
  });

  it("reinicia conversación tras pausa larga", () => {
    const started = new Date("2026-04-26T14:00:00.000Z");
    const lastUser = new Date("2026-04-26T14:05:00.000Z");
    const now = new Date("2026-04-26T15:30:00.000Z");
    const state = resolveConversationSession(
      { conversationSessionStartedAt: started, lastUserMessageAt: lastUser },
      now
    );
    expect(state.isNew).toBe(true);
    expect(state.expired).toBe(false);
  });

  it("computeSessionQuota devuelve minutos restantes", () => {
    const started = new Date("2026-04-26T15:00:00.000Z");
    const now = new Date("2026-04-26T15:04:00.000Z");
    const quota = computeSessionQuota(
      { conversationSessionStartedAt: started, lastUserMessageAt: started },
      now
    );
    expect(quota.sessionActive).toBe(true);
    expect(quota.minutesRemaining).toBeGreaterThan(0);
    expect(quota.minutesRemaining).toBeLessThanOrEqual(quota.maxMinutes);
  });
});
