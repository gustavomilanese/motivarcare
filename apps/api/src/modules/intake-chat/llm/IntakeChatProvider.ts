/**
 * Contrato del proveedor LLM usado por el intake-chat.
 * El service no conoce a OpenAI/Anthropic/etc directamente: depende solo de esta
 * interfaz. Esto nos permite tests con `mockProvider` y, eventualmente, swap a
 * Anthropic/Vertex/local sin tocar el dominio.
 */

export type IntakeChatRole = "system" | "assistant" | "user";

export interface IntakeChatMessage {
  role: IntakeChatRole;
  content: string;
}

/**
 * Respuestas extraídas hasta el momento (incrementales).
 * Las claves coinciden con `intakeQuestions` del cliente.
 *
 * Convención: el LLM SOLO devuelve los campos que extrajo o actualizó en este turno
 * (nunca borra). El service mergea con lo que ya tenía guardado.
 */
export type ExtractedIntakeAnswers = Partial<Record<string, string>>;

export interface InterviewerCallInput {
  systemPrompt: string;
  /**
   * Historia de la conversación SIN el system prompt (ese va aparte).
   * Incluye el último user message ya appendeado.
   */
  conversationHistory: IntakeChatMessage[];
  /** Snapshot de respuestas ya extraídas (lo que el LLM "ya sabe"). */
  alreadyExtracted: ExtractedIntakeAnswers;
  /** País de residencia ya capturado (si lo hay). */
  residencyCountryAlreadyCaptured: string | null;
  /** Cap por seguridad de tokens de salida. */
  maxOutputTokens?: number;
  /**
   * Si se aborta (p. ej. crisis en `evaluateSafety` mientras el LLM corre en paralelo),
   * no consumimos el resto de la respuesta.
   */
  abortSignal?: AbortSignal;
}

export interface InterviewerCallResult {
  /** Mensaje conversacional para mostrar al paciente. */
  assistantMessage: string;
  /** Respuestas extraídas o actualizadas en este turno (parcial). */
  extractedAnswers: ExtractedIntakeAnswers;
  /** Si el LLM detectó residencia en este turno (ISO-3166 alpha-2 mayúscula). */
  residencyCountry?: string | null;
  /** El LLM cree que ya tiene todo lo necesario y propone enviar el intake. */
  isComplete: boolean;
  /** Observabilidad: tokens usados y costo estimado. */
  usage: ProviderUsage;
}

export interface ProviderUsage {
  promptTokens: number;
  completionTokens: number;
  /** Estimado (puede ser 0 en mock). Calculado con tarifas configuradas en el provider. */
  costUsdCents: number;
}

export type SafetySeverity = "none" | "low" | "high";

export interface SafetyClassifierInput {
  userMessage: string;
  /**
   * Snippet corto de los últimos turnos (sin PII identificable de terceros) para que el
   * clasificador tenga algo de contexto. El service decide cuánto pasar.
   */
  conversationContext: string;
}

export interface SafetyClassifierResult {
  triggered: boolean;
  severity: SafetySeverity;
  /** Razonamiento breve del clasificador (solo para auditoría, no se muestra al paciente). */
  reasoning?: string;
  usage?: ProviderUsage;
}

/**
 * Provider LLM principal usado por el intake-chat.
 * Implementaciones actuales: `OpenAIIntakeChatProvider`, `MockIntakeChatProvider`.
 */
export interface IntakeChatProvider {
  /** Identificador del provider para logging/auditoría (ej. "openai", "mock"). */
  readonly providerName: string;
  /** Modelo concreto en uso (ej. "gpt-5-mini"). */
  readonly modelName: string;

  generateInterviewerResponse(input: InterviewerCallInput): Promise<InterviewerCallResult>;

  classifySafety(input: SafetyClassifierInput): Promise<SafetyClassifierResult>;
}
