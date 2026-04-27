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

  it("streamAssistantResponse reconstruye el mismo texto y devuelve usage cero al completar", async () => {
    const gen = provider.streamAssistantResponse({
      systemPrompt: "test",
      conversationHistory: [{ role: "user", content: "Hola" }]
    });
    let full = "";
    let result = await gen.next();
    while (!result.done) {
      full += result.value;
      result = await gen.next();
    }
    const usage = result.value;
    const ref = await provider.generateAssistantResponse({
      systemPrompt: "test",
      conversationHistory: [{ role: "user", content: "Hola" }]
    });
    expect(full).toBe(ref.assistantMessage);
    expect(usage.costUsdCents).toBe(0);
  });
});
