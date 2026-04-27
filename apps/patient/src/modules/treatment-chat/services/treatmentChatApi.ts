import { API_BASE, apiRequest } from "../../app/services/api";

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
  /** Consent del paciente para compartir resumen IA con su profesional. */
  professionalShareConsent: boolean;
}

export interface TreatmentChatConsentResponse {
  consent: boolean;
  consentAt: string | null;
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

type StreamSseData =
  | { type: "token"; text: string }
  | { type: "done"; chat: SendMessageResultDto }
  | { type: "error"; message: string };

/**
 * POST /api/treatment-chat/messages con `stream: true` (SSE: deltas y evento `done` con el chat
 * persistido, mismo contrato final que el JSON 200 de antes).
 */
export async function sendTreatmentChatMessage(
  message: string,
  token: string,
  onToken: (text: string) => void
): Promise<SendMessageResultDto> {
  const res = await fetch(
    `${API_BASE.replace(/\/+$/, "")}/api/treatment-chat/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      credentials: "omit",
      body: JSON.stringify({ message, stream: true })
    }
  );

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    let errMsg = `HTTP ${res.status}`;
    try {
      const asJson = JSON.parse(raw) as { message?: string; error?: string };
      errMsg = (asJson.message || asJson.error || errMsg) as string;
    } catch {
      if (raw.trim().length > 0) {
        errMsg = raw;
      }
    }
    throw new Error(errMsg);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream") || !res.body) {
    const recovered = (await res.json().catch(() => null)) as SendEnvelope | null;
    if (recovered?.chat) {
      return recovered.chat;
    }
    throw new Error("Respuesta inesperada del servidor (no es SSE).");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: SendMessageResultDto | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    for (;;) {
      const sep = buffer.indexOf("\n\n");
      if (sep < 0) break;
      const rawLine = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const dataLine = rawLine.startsWith("data: ") ? rawLine.slice(6) : rawLine;
      if (dataLine.trim().length === 0) {
        break;
      }
      let data: StreamSseData;
      try {
        data = JSON.parse(dataLine) as StreamSseData;
      } catch {
        continue;
      }
      if (data.type === "token" && data.text) {
        onToken(data.text);
      } else if (data.type === "error") {
        throw new Error(data.message || "Error del asistente.");
      } else if (data.type === "done" && data.chat) {
        result = data.chat;
      }
    }
  }

  if (!result) {
    throw new Error("No recibimos la respuesta completa del asistente. Probá de nuevo.");
  }
  return result;
}

/**
 * POST /api/treatment-chat/consent — toggle del consentimiento del paciente para
 * que su profesional vea el resumen IA del chat (PR-T4).
 */
export async function setTreatmentChatConsent(
  consent: boolean,
  token: string
): Promise<TreatmentChatConsentResponse> {
  return apiRequest<TreatmentChatConsentResponse>(
    "/api/treatment-chat/consent",
    { method: "POST", body: JSON.stringify({ consent }) },
    token
  );
}
