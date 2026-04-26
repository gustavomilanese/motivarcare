import type {
  SafetyClassifierInput,
  SafetyClassifierResult
} from "../../intake-chat/llm/IntakeChatProvider.js";
import type {
  TreatmentChatCallInput,
  TreatmentChatCallResult,
  TreatmentChatProvider
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
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}
