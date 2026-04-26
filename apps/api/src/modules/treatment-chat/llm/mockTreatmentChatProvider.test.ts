import { describe, expect, it } from "vitest";
import { MockTreatmentChatProvider } from "./mockTreatmentChatProvider.js";

describe("MockTreatmentChatProvider", () => {
  const provider = new MockTreatmentChatProvider();

  it("greet inicial cuando no hay user message", async () => {
    const result = await provider.generateAssistantResponse({
      systemPrompt: "test",
      conversationHistory: []
    });
    expect(result.assistantMessage).toMatch(/Hola/);
    expect(result.usage.costUsdCents).toBe(0);
  });

  it("eco con prefijo cuando hay user message", async () => {
    const result = await provider.generateAssistantResponse({
      systemPrompt: "test",
      conversationHistory: [
        { role: "user", content: "Hoy estuve ansioso por el trabajo" }
      ]
    });
    expect(result.assistantMessage).toContain("Mock-treatment");
    expect(result.assistantMessage).toContain("Hoy estuve ansioso por el trabajo");
  });

  it("classifySafety nunca dispara crisis (la heurística cubre eso aparte)", async () => {
    const result = await provider.classifySafety({
      userMessage: "no quiero seguir vivo",
      conversationContext: ""
    });
    expect(result.severity).toBe("none");
    expect(result.triggered).toBe(false);
  });
});
