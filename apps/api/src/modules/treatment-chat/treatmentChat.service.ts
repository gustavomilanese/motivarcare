import type { PatientTreatmentChat, PatientTreatmentChatMessage } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { evaluateSafety } from "../intake-chat/llm/safetyClassifier.js";
import { getTreatmentChatProvider } from "./llm/providerFactory.js";
import {
  TREATMENT_CHAT_INITIAL_GREETING,
  TREATMENT_CHAT_SAFETY_ALERT_MESSAGE,
  buildTreatmentChatSystemPrompt
} from "./treatmentChat.prompts.js";

export type TreatmentChatStatus = "active" | "archived";

export type TreatmentChatSafetySeverity = "none" | "low" | "high";

export interface TreatmentChatMessageDto {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
  /** Solo informativo (no se muestra al paciente como tal); usado por la UI para resaltar avisos. */
  safetySeverity?: TreatmentChatSafetySeverity | null;
}

export interface TreatmentChatDto {
  chatId: string;
  status: TreatmentChatStatus;
  messages: TreatmentChatMessageDto[];
  /** True si en algún turno previo se detectó riesgo alto. */
  safetyFlagged: boolean;
  /** Mensaje de banner si en este turno se detectó crisis. */
  safetyAlertMessage?: string;
  /** Estado de cuotas para informar al cliente. */
  quota: {
    dailyTurnsUsed: number;
    dailyTurnsRemaining: number;
    estimatedCostUsdCents: number;
  };
}

export interface SendMessageResult extends TreatmentChatDto {
  /** Mensaje del assistant generado en este turno (lo último). */
  lastAssistantMessage: string;
  safetyTriggeredThisTurn: boolean;
}

export class TreatmentChatError extends Error {
  constructor(
    public readonly code:
      | "FEATURE_DISABLED"
      | "CHAT_NOT_FOUND"
      | "CHAT_ARCHIVED"
      | "DAILY_LIMIT_REACHED"
      | "MESSAGE_INVALID"
      | "PROVIDER_ERROR",
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "TreatmentChatError";
  }
}

const USER_MESSAGE_MAX_LENGTH = 4000;

/* ========================================================================== */
/* Public API                                                                  */
/* ========================================================================== */

/**
 * Devuelve el chat activo del paciente. Si no existe, lo crea con un greeting
 * inicial. Idempotente: dos llamadas seguidas devuelven la misma fila.
 */
export async function getOrCreateChat(patientId: string): Promise<TreatmentChatDto> {
  ensureFeatureEnabled();

  const existing = await prisma.patientTreatmentChat.findUnique({
    where: { patientId }
  });

  if (existing) {
    if (existing.status === "archived") {
      /**
       * Si estaba archivado por moderación previa, NO lo reactivamos automáticamente:
       * el paciente verá un estado "archived" y la UI puede ofrecerle volver a abrir
       * (PR-T2) o derivar al profesional. Mantenemos los mensajes.
       */
      return chatToDto(existing, await loadVisibleMessages(existing.id));
    }
    return chatToDto(existing, await loadVisibleMessages(existing.id));
  }

  const provider = getTreatmentChatProvider();
  const created = await prisma.patientTreatmentChat.create({
    data: {
      patientId,
      status: "active",
      llmProvider: provider.providerName,
      llmModel: provider.modelName,
      messageCount: 1,
      messages: {
        create: {
          role: "assistant",
          content: TREATMENT_CHAT_INITIAL_GREETING
        }
      }
    }
  });
  const messages = await loadVisibleMessages(created.id);
  return chatToDto(created, messages);
}

/**
 * El paciente envía un mensaje. Flujo:
 * 1. Valida cuotas (cap diario).
 * 2. Persiste el mensaje del paciente.
 * 3. Corre safety classifier; si dispara crisis, NO llama al provider conversacional
 *    y devuelve un assistant fijo de derivación.
 * 4. Si no hay crisis, llama al provider con la ventana de contexto reciente.
 * 5. Persiste la respuesta del assistant + actualiza contadores.
 */
export async function sendMessage(params: {
  patientId: string;
  userMessage: string;
}): Promise<SendMessageResult> {
  ensureFeatureEnabled();
  const trimmed = params.userMessage.trim();
  if (trimmed.length === 0) {
    throw new TreatmentChatError("MESSAGE_INVALID", "El mensaje no puede estar vacío");
  }
  if (trimmed.length > USER_MESSAGE_MAX_LENGTH) {
    throw new TreatmentChatError(
      "MESSAGE_INVALID",
      `El mensaje supera el largo máximo (${USER_MESSAGE_MAX_LENGTH} caracteres)`
    );
  }

  const chat = await prisma.patientTreatmentChat.findUnique({
    where: { patientId: params.patientId }
  });
  if (!chat) {
    throw new TreatmentChatError("CHAT_NOT_FOUND", "El chat no fue inicializado todavía");
  }
  if (chat.status === "archived") {
    throw new TreatmentChatError("CHAT_ARCHIVED", "El chat está archivado");
  }

  const today = startOfUtcDay(new Date());
  const dailyUsed = computeDailyUsed(chat, today);
  if (dailyUsed >= env.TREATMENT_CHAT_DAILY_TURN_LIMIT) {
    throw new TreatmentChatError(
      "DAILY_LIMIT_REACHED",
      `Llegaste al límite diario de mensajes (${env.TREATMENT_CHAT_DAILY_TURN_LIMIT}). Probá mañana o agendá una sesión con tu profesional.`
    );
  }

  /**
   * Persistimos el mensaje del paciente ANTES del LLM. Si el LLM falla, el
   * mensaje queda guardado y el paciente puede reintentar.
   */
  const userMsg = await prisma.patientTreatmentChatMessage.create({
    data: {
      chatId: chat.id,
      role: "user",
      content: trimmed
    }
  });

  const recent = await loadRecentMessagesForContext(chat.id);

  const provider = getTreatmentChatProvider();

  const safetyResult = await evaluateSafety(provider, {
    userMessage: trimmed,
    recentMessages: recent.map((m) => ({ role: m.role, content: m.content }))
  });

  let assistantText: string;
  let promptTokens = 0;
  let completionTokens = 0;
  let costUsdCents = 0;
  let safetyTriggeredThisTurn = false;

  if (safetyResult.triggered && safetyResult.severity === "high") {
    /**
     * En crisis: NO llamamos al provider conversacional para evitar que el modelo
     * intente "ayudar" con interpretaciones o consejos riesgosos. Forzamos un
     * mensaje fijo de derivación + mantenemos el flag a nivel chat.
     */
    safetyTriggeredThisTurn = true;
    assistantText = TREATMENT_CHAT_SAFETY_ALERT_MESSAGE;

    /** Marcamos el mensaje del paciente con severidad alta (auditoría / panel del profesional). */
    await prisma.patientTreatmentChatMessage.update({
      where: { id: userMsg.id },
      data: {
        safetySeverity: "high",
        safetyReasoning: safetyResult.reasoning?.slice(0, 1000)
      }
    });
  } else {
    /** Reusamos el contexto que cargamos antes + sumamos el mensaje recién persistido. */
    const conversationForLlm = [
      ...recent.map((m) => ({ role: m.role as "system" | "assistant" | "user", content: m.content })),
      { role: "user" as const, content: trimmed }
    ];

    try {
      const result = await provider.generateAssistantResponse({
        systemPrompt: buildTreatmentChatSystemPrompt(),
        conversationHistory: conversationForLlm,
        maxOutputTokens: env.TREATMENT_CHAT_MAX_OUTPUT_TOKENS
      });
      assistantText = result.assistantMessage;
      promptTokens = result.usage.promptTokens;
      completionTokens = result.usage.completionTokens;
      costUsdCents = result.usage.costUsdCents;

      /** Persistimos también la severidad ligera detectada por LLM (informativa). */
      if (safetyResult.severity !== "none") {
        await prisma.patientTreatmentChatMessage.update({
          where: { id: userMsg.id },
          data: {
            safetySeverity: safetyResult.severity,
            safetyReasoning: safetyResult.reasoning?.slice(0, 1000)
          }
        });
      }
    } catch (err) {
      console.error("[treatment-chat] provider error:", err instanceof Error ? err.message : err);
      throw new TreatmentChatError(
        "PROVIDER_ERROR",
        "El asistente tuvo un problema. Probá de nuevo en un momento.",
        { cause: err instanceof Error ? err.message : String(err) }
      );
    }
  }

  await prisma.patientTreatmentChatMessage.create({
    data: {
      chatId: chat.id,
      role: "assistant",
      content: assistantText,
      promptTokens: promptTokens || null,
      completionTokens: completionTokens || null,
      costUsdCents: costUsdCents || null
    }
  });

  /**
   * Actualizamos el chat (contadores, último timestamp del usuario, daily counter,
   * highest safety, costo). Hacemos un update único para no introducir race conditions.
   */
  const newHighestSeverity = pickHigherSeverity(
    chat.highestSafetySeverity as TreatmentChatSafetySeverity | null,
    safetyTriggeredThisTurn ? "high" : safetyResult.severity
  );
  const updatedChat = await prisma.patientTreatmentChat.update({
    where: { id: chat.id },
    data: {
      messageCount: { increment: 2 },
      estimatedCostUsdCents: { increment: costUsdCents },
      lastUserMessageAt: new Date(),
      dailyCounterDate: today,
      dailyCounterValue: dailyUsed + 1,
      highestSafetySeverity: newHighestSeverity,
      lastSafetyEventAt: safetyTriggeredThisTurn ? new Date() : chat.lastSafetyEventAt
    }
  });

  const visible = await loadVisibleMessages(chat.id);
  const dto = chatToDto(updatedChat, visible);

  return {
    ...dto,
    lastAssistantMessage: assistantText,
    safetyTriggeredThisTurn,
    safetyAlertMessage: safetyTriggeredThisTurn ? TREATMENT_CHAT_SAFETY_ALERT_MESSAGE : dto.safetyAlertMessage
  };
}

/* ========================================================================== */
/* Helpers                                                                     */
/* ========================================================================== */

function ensureFeatureEnabled(): void {
  if (!env.TREATMENT_CHAT_ENABLED) {
    throw new TreatmentChatError("FEATURE_DISABLED", "El chat de tratamiento no está disponible");
  }
}

async function loadVisibleMessages(chatId: string): Promise<PatientTreatmentChatMessage[]> {
  return prisma.patientTreatmentChatMessage.findMany({
    where: { chatId, hidden: false, role: { in: ["user", "assistant"] } },
    orderBy: { createdAt: "asc" }
  });
}

/**
 * Carga la ventana reciente para pasarle al LLM. Recorta a `TREATMENT_CHAT_CONTEXT_WINDOW`.
 * Excluye mensajes ocultos y mensajes "system" (el system prompt va aparte).
 */
async function loadRecentMessagesForContext(
  chatId: string
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const window = env.TREATMENT_CHAT_CONTEXT_WINDOW;
  const rows = await prisma.patientTreatmentChatMessage.findMany({
    where: { chatId, hidden: false, role: { in: ["user", "assistant"] } },
    orderBy: { createdAt: "desc" },
    take: window
  });
  return rows
    .reverse()
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
}

function startOfUtcDay(date: Date): Date {
  const copy = new Date(date.getTime());
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function computeDailyUsed(chat: PatientTreatmentChat, today: Date): number {
  if (!chat.dailyCounterDate) return 0;
  const sameDay = startOfUtcDay(chat.dailyCounterDate).getTime() === today.getTime();
  return sameDay ? chat.dailyCounterValue : 0;
}

function pickHigherSeverity(
  current: TreatmentChatSafetySeverity | null,
  next: TreatmentChatSafetySeverity
): TreatmentChatSafetySeverity {
  const order: Record<TreatmentChatSafetySeverity, number> = { none: 0, low: 1, high: 2 };
  const c = current ?? "none";
  return order[next] > order[c] ? next : c;
}

/**
 * Exportado solo para tests. Centraliza acceso a helpers puros sin tener que
 * stubbear toda la infra de prisma + LLM.
 */
export const __internals = {
  startOfUtcDay,
  computeDailyUsed,
  pickHigherSeverity
};

function chatToDto(chat: PatientTreatmentChat, messages: PatientTreatmentChatMessage[]): TreatmentChatDto {
  const today = startOfUtcDay(new Date());
  const dailyUsed = computeDailyUsed(chat, today);
  const remaining = Math.max(0, env.TREATMENT_CHAT_DAILY_TURN_LIMIT - dailyUsed);

  return {
    chatId: chat.id,
    status: chat.status as TreatmentChatStatus,
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      safetySeverity: (m.safetySeverity as TreatmentChatSafetySeverity | null) ?? null
    })),
    safetyFlagged: chat.highestSafetySeverity === "high",
    quota: {
      dailyTurnsUsed: dailyUsed,
      dailyTurnsRemaining: remaining,
      estimatedCostUsdCents: chat.estimatedCostUsdCents
    }
  };
}
