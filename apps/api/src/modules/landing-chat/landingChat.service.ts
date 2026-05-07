import { env } from "../../config/env.js";
import { evaluateSafety } from "../intake-chat/llm/safetyClassifier.js";
import {
  LANDING_MACA_CRISIS_MESSAGE,
  LANDING_MACA_CAP_REACHED_MESSAGE,
  buildLandingMacaSystemPrompt
} from "./landingChat.prompts.js";
import {
  MockLandingChatProvider,
  OpenAILandingChatProvider,
  type LandingChatMessage,
  type LandingChatProvider
} from "./landingChat.provider.js";

/**
 * Errores de dominio del landing-chat. El router los mapea a respuestas HTTP.
 */
export class LandingChatError extends Error {
  readonly code:
    | "FEATURE_DISABLED"
    | "MESSAGE_INVALID"
    | "SESSION_CAP_REACHED"
    | "PROVIDER_ERROR";
  readonly details?: Record<string, unknown>;

  constructor(
    code: LandingChatError["code"],
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "LandingChatError";
    this.code = code;
    this.details = details;
  }
}

/** Provider singleton perezoso: respeta env (mock vs openai) y reusa cliente OpenAI. */
let cachedProvider: LandingChatProvider | null = null;

export function getLandingChatProvider(): LandingChatProvider {
  if (cachedProvider) {
    return cachedProvider;
  }
  if (env.LANDING_MACA_PROVIDER === "mock") {
    cachedProvider = new MockLandingChatProvider();
    return cachedProvider;
  }
  if (!env.OPENAI_API_KEY) {
    console.warn(
      "[landing-chat] OPENAI_API_KEY no configurada → usando MockLandingChatProvider. " +
        "Configurá OPENAI_API_KEY en .env para usar OpenAI real."
    );
    cachedProvider = new MockLandingChatProvider();
    return cachedProvider;
  }
  cachedProvider = new OpenAILandingChatProvider({
    apiKey: env.OPENAI_API_KEY,
    modelName: env.LANDING_MACA_OPENAI_MODEL,
    safetyModelName: env.OPENAI_SAFETY_MODEL
  });
  return cachedProvider;
}

/** Hook de tests: reemplazar el provider y resetear el cache. */
export function __setLandingChatProviderForTests(provider: LandingChatProvider | null): void {
  cachedProvider = provider;
}

/**
 * Counter por sessionId en memoria. No persistimos PII (sólo `${sessionId}` y un
 * contador con TTL). Una instancia única de API alcanza para cap razonable;
 * si escalamos horizontalmente, el rate-limit por IP sigue siendo barrera y
 * podemos mover este counter a Redis en una iteración futura.
 */
interface SessionCounterEntry {
  count: number;
  resetAt: number;
}
const sessionCounters = new Map<string, SessionCounterEntry>();
let sessionSweepStarted = false;

function ensureSweepLoop(): void {
  if (sessionSweepStarted) return;
  sessionSweepStarted = true;
  const intervalMs = Math.max(60_000, Math.floor(env.LANDING_MACA_SESSION_TTL_MS / 4));
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of sessionCounters.entries()) {
      if (entry.resetAt <= now) {
        sessionCounters.delete(key);
      }
    }
  }, intervalMs).unref();
}

export function __resetSessionCountersForTests(): void {
  sessionCounters.clear();
}

interface SessionConsumeResult {
  allowed: boolean;
  /** Cuántos turnos del usuario quedan (sin contar el que se está consumiendo). */
  remaining: number;
  /** Si este consumo alcanzó/superó el cap, indica que es el último turno servible. */
  willReachCap: boolean;
}

function consumeSessionTurn(sessionId: string): SessionConsumeResult {
  ensureSweepLoop();
  const limit = env.LANDING_MACA_MAX_TURNS_PER_SESSION;
  const ttl = env.LANDING_MACA_SESSION_TTL_MS;
  const now = Date.now();
  const existing = sessionCounters.get(sessionId);
  const entry =
    !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + ttl }
      : existing;

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, willReachCap: true };
  }
  entry.count += 1;
  sessionCounters.set(sessionId, entry);
  const remaining = Math.max(0, limit - entry.count);
  return { allowed: true, remaining, willReachCap: entry.count >= limit };
}

export interface SendLandingMessageInput {
  sessionId: string;
  /** Historia conversacional reciente que el cliente recuerda (sin el system). */
  history: LandingChatMessage[];
  /** Mensaje recién escrito por el visitante. */
  message: string;
}

export interface SendLandingMessageResult {
  assistantMessage: string;
  remainingTurns: number;
  capReached: boolean;
  /** Solo para observabilidad interna; el cliente lo ignora. */
  source: "llm" | "crisis" | "cap";
}

/**
 * Conversación pública (anónima). El service:
 *   1. Valida feature flag y entrada.
 *   2. Aplica cap por `sessionId` (counter en memoria con TTL).
 *   3. Corre `evaluateSafety` (heurística + LLM safety) — si dispara crisis,
 *      devolvemos el mensaje fijo y NO llamamos al LLM principal.
 *   4. Llama al LLM con system prompt + history recortada al context window.
 */
export async function sendLandingMessage(
  input: SendLandingMessageInput
): Promise<SendLandingMessageResult> {
  if (!env.LANDING_MACA_ENABLED) {
    throw new LandingChatError("FEATURE_DISABLED", "Maca pública no está disponible");
  }

  const trimmed = input.message.trim();
  if (trimmed.length === 0) {
    throw new LandingChatError("MESSAGE_INVALID", "El mensaje no puede estar vacío");
  }
  if (trimmed.length > env.LANDING_MACA_MAX_INPUT_CHARS) {
    throw new LandingChatError("MESSAGE_INVALID", "El mensaje es demasiado largo", {
      maxChars: env.LANDING_MACA_MAX_INPUT_CHARS
    });
  }

  const consume = consumeSessionTurn(input.sessionId);
  if (!consume.allowed) {
    throw new LandingChatError("SESSION_CAP_REACHED", LANDING_MACA_CAP_REACHED_MESSAGE);
  }

  const provider = getLandingChatProvider();

  /** History recortada para acotar costo y latencia. */
  const recentHistory = input.history
    .filter((m) => typeof m.content === "string" && m.content.trim().length > 0)
    .slice(-env.LANDING_MACA_CONTEXT_WINDOW)
    .map<LandingChatMessage>((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content.slice(0, env.LANDING_MACA_MAX_INPUT_CHARS)
    }));

  const safety = await evaluateSafety(provider, {
    userMessage: trimmed,
    recentMessages: recentHistory
  });

  if (safety.triggered && safety.severity === "high") {
    return {
      assistantMessage: LANDING_MACA_CRISIS_MESSAGE,
      remainingTurns: consume.remaining,
      capReached: consume.willReachCap,
      source: "crisis"
    };
  }

  const conversationHistory: LandingChatMessage[] = [
    ...recentHistory,
    { role: "user", content: trimmed }
  ];

  const systemPrompt = buildLandingMacaSystemPrompt({
    patientPortalUrl: env.PATIENT_APP_URL
  });

  try {
    const result = await provider.generateAssistantMessage({
      systemPrompt,
      conversationHistory,
      maxOutputTokens: env.LANDING_MACA_MAX_OUTPUT_TOKENS
    });
    return {
      assistantMessage: result.assistantMessage,
      remainingTurns: consume.remaining,
      capReached: consume.willReachCap,
      source: "llm"
    };
  } catch (error) {
    /**
     * Si el LLM falla, no consumimos el turno: revertimos el contador para no
     * "robarle" un mensaje al visitante por un problema nuestro. Mantiene la
     * UX justa y evita falsos `cap reached`.
     */
    const entry = sessionCounters.get(input.sessionId);
    if (entry && entry.count > 0) {
      entry.count -= 1;
      sessionCounters.set(input.sessionId, entry);
    }
    const message = error instanceof Error ? error.message : "Provider error";
    throw new LandingChatError("PROVIDER_ERROR", message);
  }
}
