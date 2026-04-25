import { describe, expect, it } from "vitest";
import { __internals } from "./intakeChat.service.js";
import { evaluateIntakeRiskLevel } from "../profiles/intake.shared.js";
import { INTAKE_CHAT_CRISIS_EMOTIONAL_OPTION, INTAKE_CHAT_REQUIRED_QUESTION_IDS } from "./intakeChat.questions.js";

describe("intake-chat service internals", () => {
  describe("sanitizeExtractedAnswers", () => {
    it("descarta keys que no están en el catálogo", () => {
      const result = __internals.sanitizeExtractedAnswers({
        mainReason: "Ansiedad",
        bogusKey: "valor que no debe pasar",
        therapyGoal: "Sentirme mejor emocionalmente"
      });
      expect(result).toEqual({
        mainReason: "Ansiedad",
        therapyGoal: "Sentirme mejor emocionalmente"
      });
    });

    it("descarta valores vacíos o no-string", () => {
      const result = __internals.sanitizeExtractedAnswers({
        mainReason: "   ",
        therapyGoal: "",
        previousTherapy: "Sí, y me ayudó",
        // @ts-expect-error testing runtime safety against bad input
        emotionalState: 123
      });
      expect(result).toEqual({ previousTherapy: "Sí, y me ayudó" });
    });

    it("trimea valores válidos", () => {
      const result = __internals.sanitizeExtractedAnswers({
        previousTherapy: "  No, nunca fui a terapia  "
      });
      expect(result.previousTherapy).toBe("No, nunca fui a terapia");
    });
  });

  describe("hasAllRequired", () => {
    it("false si falta alguna requerida", () => {
      expect(__internals.hasAllRequired({ mainReason: "Ansiedad" })).toBe(false);
    });

    it("true si están todas las requeridas (incluso safetyRisk)", () => {
      const allAnswers: Record<string, string> = {};
      for (const id of INTAKE_CHAT_REQUIRED_QUESTION_IDS) {
        allAnswers[id] = "respuesta";
      }
      expect(__internals.hasAllRequired(allAnswers)).toBe(true);
    });

    it("availability y language son opcionales (no bloquean el submit)", () => {
      // Keys nuevas para alimentar el matcher (PR3.5). Si no se contestan,
      // el chat sigue siendo completable mientras las requeridas estén.
      expect(INTAKE_CHAT_REQUIRED_QUESTION_IDS).not.toContain("availability");
      expect(INTAKE_CHAT_REQUIRED_QUESTION_IDS).not.toContain("language");
    });
  });

  describe("normalizeCountryCode", () => {
    it("acepta y normaliza códigos válidos", () => {
      expect(__internals.normalizeCountryCode("ar")).toBe("AR");
      expect(__internals.normalizeCountryCode("US")).toBe("US");
      expect(__internals.normalizeCountryCode("  uy  ")).toBe("UY");
    });

    it("rechaza códigos inválidos", () => {
      expect(__internals.normalizeCountryCode("ARG")).toBeNull();
      expect(__internals.normalizeCountryCode("")).toBeNull();
      expect(__internals.normalizeCountryCode(null)).toBeNull();
      expect(__internals.normalizeCountryCode("argentina")).toBeNull();
      expect(__internals.normalizeCountryCode("a1")).toBeNull();
    });
  });

  describe("parseStoredMessages", () => {
    it("filtra entries sin role o content válidos", () => {
      const raw = [
        { role: "assistant", content: "hola", ts: "2026-01-01T00:00:00.000Z" },
        { role: "user", content: "qué tal", ts: "2026-01-01T00:00:01.000Z" },
        { role: "user", content: 123, ts: "2026-01-01T00:00:02.000Z" }, // content no-string
        { role: "robot", content: "x", ts: "2026-01-01T00:00:03.000Z" }, // role inválido
        null,
        "string suelta",
        { role: "assistant", content: "ok", ts: "2026-01-01T00:00:04.000Z", hidden: true }
      ];
      const result = __internals.parseStoredMessages(raw);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ role: "assistant", content: "hola", ts: "2026-01-01T00:00:00.000Z" });
      expect(result[2]).toEqual({
        role: "assistant",
        content: "ok",
        ts: "2026-01-01T00:00:04.000Z",
        hidden: true
      });
    });

    it("devuelve array vacío si raw no es array", () => {
      expect(__internals.parseStoredMessages(null)).toEqual([]);
      expect(__internals.parseStoredMessages({ foo: "bar" })).toEqual([]);
      expect(__internals.parseStoredMessages("string")).toEqual([]);
    });
  });

  describe("isExpired", () => {
    it("false si updatedAt es reciente", () => {
      const session = { updatedAt: new Date() } as Parameters<typeof __internals.isExpired>[0];
      expect(__internals.isExpired(session)).toBe(false);
    });

    it("true si updatedAt es viejo (>7d default)", () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      const session = { updatedAt: eightDaysAgo } as Parameters<typeof __internals.isExpired>[0];
      expect(__internals.isExpired(session)).toBe(true);
    });
  });
});

describe("evaluateIntakeRiskLevel (compartido entre wizard y chat)", () => {
  it("high si emotionalState menciona daño/vivir", () => {
    expect(evaluateIntakeRiskLevel({ emotionalState: INTAKE_CHAT_CRISIS_EMOTIONAL_OPTION })).toBe("high");
    expect(evaluateIntakeRiskLevel({ emotionalState: "tengo pensamientos de no querer vivir" })).toBe("high");
  });

  it("high si safetyRisk = Frecuentemente (cualquier idioma)", () => {
    expect(evaluateIntakeRiskLevel({ safetyRisk: "Frecuentemente" })).toBe("high");
    expect(evaluateIntakeRiskLevel({ safetyRisk: "frequently" })).toBe("high");
  });

  it("medium si safetyRisk = A veces", () => {
    expect(evaluateIntakeRiskLevel({ safetyRisk: "A veces" })).toBe("medium");
    expect(evaluateIntakeRiskLevel({ safetyRisk: "sometimes" })).toBe("medium");
  });

  it("low en caso default", () => {
    expect(evaluateIntakeRiskLevel({})).toBe("low");
    expect(evaluateIntakeRiskLevel({ safetyRisk: "No", emotionalState: "Bastante bien" })).toBe("low");
  });
});
