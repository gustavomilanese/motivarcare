import { INTAKE_CHAT_QUESTIONS } from "../intakeChat.questions.js";
import type {
  IntakeChatProvider,
  InterviewerCallInput,
  InterviewerCallResult,
  SafetyClassifierInput,
  SafetyClassifierResult
} from "./IntakeChatProvider.js";

/**
 * Provider determinístico para tests / demos sin costo de API.
 *
 * Comportamiento:
 * - Recorre las preguntas en orden. La primera pregunta sin respuesta capturada en
 *   `alreadyExtracted` (o residencyCountry si nada falta) es la que pregunta.
 * - Para "extraer" la respuesta, mira el último user message del historial:
 *   - si matchea exactamente alguna option de la pregunta anterior, la usa;
 *   - sino, guarda el texto crudo (útil para tests donde el caller pre-formatea las respuestas).
 * - Marca `isComplete: true` cuando todas las requeridas + residencyCountry están presentes.
 * - Detecta señal de crisis si el mensaje contiene palabras clave (palabras-suicide).
 *   Eso lo hace el safetyClassifier; este mock devuelve "high" si el texto incluye
 *   "suicid" o "hacerme daño".
 */
export class MockIntakeChatProvider implements IntakeChatProvider {
  readonly providerName = "mock";
  readonly modelName = "mock-deterministic-1";

  async generateInterviewerResponse(input: InterviewerCallInput): Promise<InterviewerCallResult> {
    if (input.abortSignal?.aborted) {
      const err = new Error("Aborted");
      err.name = "AbortError";
      throw err;
    }
    const lastUserMessage = [...input.conversationHistory].reverse().find((m) => m.role === "user");
    const newlyExtracted: Record<string, string> = {};
    let detectedCountry: string | null = null;

    /** Encontrá la próxima pregunta sin responder. */
    const previousUnansweredIdx = INTAKE_CHAT_QUESTIONS.findIndex((q) => !input.alreadyExtracted[q.id]);

    /** Si hay un user message reciente, asumimos que responde la pregunta anterior. */
    if (lastUserMessage && previousUnansweredIdx >= 0) {
      const previousQuestion = INTAKE_CHAT_QUESTIONS[previousUnansweredIdx];
      newlyExtracted[previousQuestion.id] = lastUserMessage.content.trim();
    }

    /** Detección naive de país (solo para tests). */
    if (!input.residencyCountryAlreadyCaptured && lastUserMessage) {
      const lower = lastUserMessage.content.toLowerCase();
      if (lower.includes("argentina") || lower.includes(" ar ") || lower.endsWith(" ar")) detectedCountry = "AR";
      else if (lower.includes("uruguay")) detectedCountry = "UY";
      else if (lower.includes("españa") || lower.includes("espana")) detectedCountry = "ES";
      else if (lower.includes("brasil") || lower.includes("brazil")) detectedCountry = "BR";
      else if (lower.includes("méxico") || lower.includes("mexico")) detectedCountry = "MX";
      else if (lower.includes("chile")) detectedCountry = "CL";
    }

    const mergedAnswers = { ...input.alreadyExtracted, ...newlyExtracted };
    const nextUnanswered = INTAKE_CHAT_QUESTIONS.find((q) => !mergedAnswers[q.id]);
    const residencyCaptured = input.residencyCountryAlreadyCaptured ?? detectedCountry;

    let assistantMessage: string;
    let quickReplies: string[] | undefined;
    let isComplete = false;
    if (nextUnanswered) {
      assistantMessage = `[mock] Pregunta: ${nextUnanswered.label}. ${nextUnanswered.intent}`;
      if (
        (nextUnanswered.type === "single" || nextUnanswered.type === "multi")
        && nextUnanswered.options
        && nextUnanswered.options.length > 0
      ) {
        quickReplies = [...nextUnanswered.options].slice(0, 12);
      }
    } else if (!residencyCaptured) {
      assistantMessage = "[mock] ¿En qué país vivís?";
    } else {
      assistantMessage = "[mock] Listo, tenemos todo lo necesario. Voy a marcar el intake como completo.";
      isComplete = true;
    }

    return {
      assistantMessage,
      extractedAnswers: newlyExtracted,
      residencyCountry: detectedCountry,
      isComplete,
      quickReplies,
      usage: { promptTokens: 0, completionTokens: 0, costUsdCents: 0 }
    };
  }

  async classifySafety(input: SafetyClassifierInput): Promise<SafetyClassifierResult> {
    const lower = input.userMessage.toLowerCase();
    const high =
      lower.includes("suicid")
      || lower.includes("hacerme daño")
      || lower.includes("hacerme dano")
      || lower.includes("no quiero vivir")
      || lower.includes("matarme");
    return {
      triggered: high,
      severity: high ? "high" : "none",
      reasoning: high ? "mock: matched crisis keyword" : "mock: no crisis signal",
      usage: { promptTokens: 0, completionTokens: 0, costUsdCents: 0 }
    };
  }
}
