import { apiRequest } from "../../app/services/api";

export type TreatmentChatRole = "assistant" | "user";

export type TreatmentChatStatus = "active" | "archived";

export type TreatmentChatSafetySeverity = "none" | "low" | "high";

export interface TreatmentChatMessageDto {
  id: string;
  role: TreatmentChatRole;
  content: string;
  createdAt: string;
  safetySeverity?: TreatmentChatSafetySeverity | null;
}

export interface TreatmentChatDto {
  chatId: string;
  status: TreatmentChatStatus;
  messages: TreatmentChatMessageDto[];
  safetyFlagged: boolean;
  safetyAlertMessage?: string;
  quota: {
    dailyTurnsUsed: number;
    dailyTurnsRemaining: number;
    estimatedCostUsdCents: number;
  };
}

export interface SendMessageResultDto extends TreatmentChatDto {
  lastAssistantMessage: string;
  safetyTriggeredThisTurn: boolean;
}

interface ConversationEnvelope {
  chat: TreatmentChatDto;
}

interface SendEnvelope {
  chat: SendMessageResultDto;
}

/**
 * Devuelve (o crea) el chat de tratamiento del paciente. Idempotente: dos llamadas
 * seguidas devuelven la misma fila. Pensado para llamarse cuando el panel se abre
 * por primera vez en la sesión del navegador.
 */
export async function fetchTreatmentChatConversation(token: string): Promise<TreatmentChatDto> {
  const result = await apiRequest<ConversationEnvelope>(
    "/api/treatment-chat/conversation",
    { method: "GET" },
    token
  );
  return result.chat;
}

/** POST /api/treatment-chat/messages — manda un mensaje del paciente al asistente. */
export async function sendTreatmentChatMessage(
  message: string,
  token: string
): Promise<SendMessageResultDto> {
  const result = await apiRequest<SendEnvelope>(
    "/api/treatment-chat/messages",
    { method: "POST", body: JSON.stringify({ message }) },
    token
  );
  return result.chat;
}
