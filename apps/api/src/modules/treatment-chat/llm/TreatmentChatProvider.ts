import type {
  ProviderUsage,
  SafetyClassifierInput,
  SafetyClassifierResult
} from "../../intake-chat/llm/IntakeChatProvider.js";

/**
 * Contrato del proveedor LLM usado por el chat de acompañamiento del tratamiento.
 *
 * Diferente del `IntakeChatProvider`:
 * - No extrae campos a un schema rígido (es conversación abierta).
 * - El system prompt incorpora contexto del paciente (PR-T3).
 * - Reusa `classifySafety` con la misma forma del intake para que el clasificador
 *   sea intercambiable y el helper `evaluateSafety` se pueda compartir.
 */

export type TreatmentChatRole = "system" | "assistant" | "user";

export interface TreatmentChatMessage {
  role: TreatmentChatRole;
  content: string;
}

export interface TreatmentChatCallInput {
  systemPrompt: string;
  /**
   * Historia conversacional reciente (rol user/assistant). El service se encarga
   * de cortar al `TREATMENT_CHAT_CONTEXT_WINDOW` antes de pasarla.
   */
  conversationHistory: TreatmentChatMessage[];
  /** Cap de tokens de salida (default lo decide el provider). */
  maxOutputTokens?: number;
  /** Si se aborta (p. ej. crisis en safety en paralelo), deja de consumir el stream. */
  abortSignal?: AbortSignal;
}

export interface TreatmentChatCallResult {
  assistantMessage: string;
  usage: ProviderUsage;
}

/**
 * Input para generar el resumen profesional del chat. El service le pasa el
 * system prompt de summarization (estricto, JSON-only) y un user message con
 * la conversación serializada y el corte semanal.
 */
export interface TreatmentChatSummarizationInput {
  systemPrompt: string;
  userMessage: string;
  /** Cap de tokens de salida; default razonable lo decide el provider. */
  maxOutputTokens?: number;
}

export interface TreatmentChatSummarizationResult {
  /** JSON crudo devuelto por el LLM (parseable). El service hace el parse + validación. */
  rawJson: string;
  usage: ProviderUsage;
}

export interface TreatmentChatProvider {
  readonly providerName: string;
  readonly modelName: string;

  generateAssistantResponse(input: TreatmentChatCallInput): Promise<TreatmentChatCallResult>;

  /**
   * Respuesta token a token (SSE en el route). El valor final del iterador es `ProviderUsage`.
   */
  streamAssistantResponse(input: TreatmentChatCallInput): AsyncGenerator<string, ProviderUsage, void>;

  classifySafety(input: SafetyClassifierInput): Promise<SafetyClassifierResult>;

  /**
   * Genera el resumen profesional. El provider DEBE devolver JSON parseable
   * (response_format json para OpenAI; mock devuelve JSON deterministic).
   */
  summarizeChat(input: TreatmentChatSummarizationInput): Promise<TreatmentChatSummarizationResult>;
}
