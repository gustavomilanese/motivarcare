import { describe, expect, it } from "vitest";
import { evaluateSafety } from "./safetyClassifier.js";
import type { IntakeChatProvider, SafetyClassifierResult } from "./IntakeChatProvider.js";

function makeProvider(stub: SafetyClassifierResult): IntakeChatProvider {
  return {
    providerName: "stub",
    modelName: "stub",
    async generateInterviewerResponse() {
      throw new Error("not used");
    },
    async classifySafety() {
      return stub;
    }
  };
}

describe("evaluateSafety", () => {
  const baseProvider = makeProvider({ triggered: false, severity: "none" });

  it("dispara high por heurística sin llamar al LLM (ES)", async () => {
    let llmCalled = false;
    const provider: IntakeChatProvider = {
      ...baseProvider,
      async classifySafety() {
        llmCalled = true;
        return { triggered: false, severity: "none" };
      }
    };
    const result = await evaluateSafety(provider, {
      userMessage: "estoy pensando en suicidarme la verdad",
      recentMessages: []
    });
    expect(result.triggered).toBe(true);
    expect(result.severity).toBe("high");
    expect(result.source).toBe("heuristic");
    expect(llmCalled).toBe(false);
  });

  it("dispara high por heurística (EN)", async () => {
    const result = await evaluateSafety(baseProvider, {
      userMessage: "I want to kill myself sometimes",
      recentMessages: []
    });
    expect(result.severity).toBe("high");
    expect(result.source).toBe("heuristic");
  });

  it("delega al LLM si no matchea heurística", async () => {
    const llmProvider = makeProvider({
      triggered: true,
      severity: "low",
      reasoning: "desesperanza sin ideación"
    });
    const result = await evaluateSafety(llmProvider, {
      userMessage: "me siento muy deprimido y sin ganas de nada",
      recentMessages: [{ role: "user", content: "hace meses así" }]
    });
    expect(result.severity).toBe("low");
    expect(result.source).toBe("llm");
  });

  it("devuelve none si LLM falla (fail-safe sin heurística)", async () => {
    const failingProvider: IntakeChatProvider = {
      ...baseProvider,
      async classifySafety() {
        throw new Error("API down");
      }
    };
    const result = await evaluateSafety(failingProvider, {
      userMessage: "tuve un día complicado en el trabajo",
      recentMessages: []
    });
    expect(result.severity).toBe("none");
    expect(result.source).toBe("llm");
  });
});
