import { describe, expect, it } from "vitest";
import { MockIntakeChatProvider } from "./mockProvider.js";

describe("MockIntakeChatProvider", () => {
  const provider = new MockIntakeChatProvider();

  it("pregunta por la primera pregunta cuando no hay nada extraído", async () => {
    const result = await provider.generateInterviewerResponse({
      systemPrompt: "irrelevante",
      conversationHistory: [{ role: "assistant", content: "saludo" }],
      alreadyExtracted: {},
      residencyCountryAlreadyCaptured: null
    });
    expect(result.assistantMessage).toContain("Motivos principales de consulta");
    expect(result.isComplete).toBe(false);
  });

  it("captura la respuesta del último user message en la pregunta pendiente", async () => {
    const result = await provider.generateInterviewerResponse({
      systemPrompt: "irrelevante",
      conversationHistory: [
        { role: "assistant", content: "¿Cuáles son tus motivos?" },
        { role: "user", content: "Ansiedad" }
      ],
      alreadyExtracted: {},
      residencyCountryAlreadyCaptured: null
    });
    expect(result.extractedAnswers.mainReason).toBe("Ansiedad");
    expect(result.assistantMessage).toContain("Objetivos de la terapia");
  });

  it("detecta país en texto libre (heurística naive del mock)", async () => {
    const result = await provider.generateInterviewerResponse({
      systemPrompt: "irrelevante",
      conversationHistory: [
        { role: "assistant", content: "¿En qué país vivís?" },
        { role: "user", content: "Vivo en Argentina hace años" }
      ],
      alreadyExtracted: {
        mainReason: "Ansiedad",
        therapyGoal: "Sentirme mejor emocionalmente"
      },
      residencyCountryAlreadyCaptured: null
    });
    expect(result.residencyCountry).toBe("AR");
  });

  it("clasificador de seguridad mock detecta keywords", async () => {
    const high = await provider.classifySafety({
      userMessage: "estoy pensando en suicidarme",
      conversationContext: ""
    });
    expect(high.severity).toBe("high");

    const none = await provider.classifySafety({
      userMessage: "tuve un mal día",
      conversationContext: ""
    });
    expect(none.severity).toBe("none");
  });
});
