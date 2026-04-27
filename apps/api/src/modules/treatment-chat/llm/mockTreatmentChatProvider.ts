import type {
  ProviderUsage,
  SafetyClassifierInput,
  SafetyClassifierResult
} from "../../intake-chat/llm/IntakeChatProvider.js";
import type {
  TreatmentChatCallInput,
  TreatmentChatCallResult,
  TreatmentChatProvider,
  TreatmentChatSummarizationInput,
  TreatmentChatSummarizationResult
} from "./TreatmentChatProvider.js";

/**
 * Mock determinístico para tests / dev sin OPENAI_API_KEY.
 * El comportamiento es intencionalmente predecible (devuelve un eco corto) para
 * que los tests no dependan de la creatividad del LLM.
 *
 * Nota de safety: el mock NUNCA dispara crisis, así que los tests que validen
 * el flujo de safety pasan por la heurística determinística (`evaluateSafety`)
 * o sustituyen este provider con uno custom.
 */
export class MockTreatmentChatProvider implements TreatmentChatProvider {
  readonly providerName = "mock";
  readonly modelName = "mock-treatment";

  async generateAssistantResponse(input: TreatmentChatCallInput): Promise<TreatmentChatCallResult> {
    const { assistantMessage, usage } = this.buildMockReply(input);
    return { assistantMessage, usage };
  }

  async *streamAssistantResponse(
    input: TreatmentChatCallInput
  ): AsyncGenerator<string, ProviderUsage, void> {
    const { assistantMessage, usage } = this.buildMockReply(input);
    const chunk = Math.max(1, Math.ceil(assistantMessage.length / 6));
    for (let i = 0; i < assistantMessage.length; i += chunk) {
      yield assistantMessage.slice(i, i + chunk);
    }
    return usage;
  }

  private buildMockReply(input: TreatmentChatCallInput): TreatmentChatCallResult {
    const lastUserMessage = [...input.conversationHistory].reverse().find((m) => m.role === "user");
    const userText = lastUserMessage?.content?.trim() ?? "";
    const reply =
      userText.length > 0
        ? `Mock-treatment: te escuché que dijiste "${truncate(userText, 80)}". ¿Querés contarme un poco más?`
        : "Hola, soy tu compañero entre sesiones. ¿Cómo te sentís hoy?";

    return {
      assistantMessage: reply,
      usage: { promptTokens: 0, completionTokens: 0, costUsdCents: 0 }
    };
  }

  async classifySafety(_input: SafetyClassifierInput): Promise<SafetyClassifierResult> {
    return { triggered: false, severity: "none", reasoning: "mock" };
  }

  async summarizeChat(_input: TreatmentChatSummarizationInput): Promise<TreatmentChatSummarizationResult> {
    /**
     * Resumen determinístico para tests/dev. Es un JSON válido con la misma forma
     * que el real para que el parser del service no se queje y la UI muestre algo.
     */
    const json = {
      weekly: {
        moodSummary: "estable",
        topics: ["mock topic 1", "mock topic 2"],
        signalsToWatch: [],
        narrative: "Resumen mock generado sin LLM real. Útil para tests y demos."
      },
      overall: {
        moodSummary: "estable",
        topics: ["mock topic 1"],
        signalsToWatch: [],
        narrative: "Histórico mock. La conversación no se procesó por un LLM."
      }
    };
    return {
      rawJson: JSON.stringify(json),
      usage: { promptTokens: 0, completionTokens: 0, costUsdCents: 0 }
    };
  }
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}
