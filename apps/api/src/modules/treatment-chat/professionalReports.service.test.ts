import { describe, expect, it } from "vitest";
import type { TreatmentChatProfessionalSummary } from "./treatmentChat.prompts.js";
import { __internals } from "./professionalReports.service.js";

const { parseAndValidateSummaryJson, validateSummarySection, isCacheFresh, REGEN_MESSAGE_DELTA, SUMMARY_TTL_MS } = __internals;

describe("validateSummarySection", () => {
  it("acepta un objeto bien formado", () => {
    const ok = validateSummarySection({
      moodSummary: "estable",
      topics: ["trabajo", "familia"],
      signalsToWatch: ["menciona insomnio"],
      narrative: "La paciente refiere semana intensa pero manejable."
    });
    expect(ok).toEqual({
      moodSummary: "estable",
      topics: ["trabajo", "familia"],
      signalsToWatch: ["menciona insomnio"],
      narrative: "La paciente refiere semana intensa pero manejable."
    });
  });

  it("rechaza si falta moodSummary", () => {
    const result = validateSummarySection({
      topics: [],
      signalsToWatch: [],
      narrative: "x"
    });
    expect(result).toBeNull();
  });

  it("filtra entradas no-string en arrays", () => {
    const result = validateSummarySection({
      moodSummary: "ok",
      topics: ["valido", 42, null, "otro"],
      signalsToWatch: [],
      narrative: "x"
    });
    expect(result?.topics).toEqual(["valido", "otro"]);
  });

  it("trunca campos largos a cotas razonables", () => {
    const result = validateSummarySection({
      moodSummary: "x".repeat(200),
      topics: Array.from({ length: 20 }, (_, i) => `t${i}`),
      signalsToWatch: [],
      narrative: "x".repeat(3000)
    });
    expect(result?.moodSummary.length).toBe(80);
    expect(result?.topics.length).toBeLessThanOrEqual(8);
    expect(result?.narrative.length).toBe(1500);
  });
});

describe("parseAndValidateSummaryJson", () => {
  it("acepta JSON con weekly = null y overall válido", () => {
    const input = JSON.stringify({
      weekly: null,
      overall: {
        moodSummary: "estable",
        topics: [],
        signalsToWatch: [],
        narrative: "ok"
      }
    });
    const out = parseAndValidateSummaryJson(input);
    expect(out?.weekly).toBeNull();
    expect(out?.overall.moodSummary).toBe("estable");
  });

  it("rechaza si falta overall", () => {
    const input = JSON.stringify({ weekly: null });
    expect(parseAndValidateSummaryJson(input)).toBeNull();
  });

  it("rechaza JSON inválido", () => {
    expect(parseAndValidateSummaryJson("not-json")).toBeNull();
  });
});

describe("isCacheFresh", () => {
  const baseSummary: TreatmentChatProfessionalSummary = {
    generatedAt: "2026-01-01T00:00:00.000Z",
    model: "test",
    messageCountAtGeneration: 10,
    weekly: null,
    overall: { moodSummary: "ok", topics: [], signalsToWatch: [], narrative: "x" }
  };

  it("devuelve false si no hay cache", () => {
    expect(isCacheFresh(null, null, null, 0)).toBe(false);
  });

  it("devuelve false cuando expiró TTL", () => {
    const old = new Date(Date.now() - SUMMARY_TTL_MS - 1000);
    expect(isCacheFresh(baseSummary, old, 10, 11)).toBe(false);
  });

  it("devuelve false cuando cruzó el delta de mensajes", () => {
    const fresh = new Date(Date.now() - 60_000);
    expect(isCacheFresh(baseSummary, fresh, 10, 10 + REGEN_MESSAGE_DELTA)).toBe(false);
  });

  it("devuelve true cuando está fresca y con pocos mensajes nuevos", () => {
    const fresh = new Date(Date.now() - 60_000);
    expect(isCacheFresh(baseSummary, fresh, 10, 12)).toBe(true);
  });
});
