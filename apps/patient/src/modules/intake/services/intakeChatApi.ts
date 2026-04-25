import { apiRequest } from "../../app/services/api";
import type { SubmitIntakeApiResponse } from "../../app/types";

export type IntakeChatRole = "assistant" | "user";

export interface IntakeChatMessageDto {
  role: IntakeChatRole;
  content: string;
  ts: string;
}

export type IntakeChatSessionStatus = "active" | "completed" | "abandoned" | "safety_blocked" | "error";

export interface IntakeChatSessionDto {
  sessionId: string;
  status: IntakeChatSessionStatus;
  messages: IntakeChatMessageDto[];
  extractedAnswers: Record<string, string>;
  residencyCountry: string | null;
  isResume: boolean;
  readyToSubmit: boolean;
  safetyFlagged: boolean;
  safetyAlertMessage?: string;
  quota: {
    turnsUsed: number;
    turnsRemaining: number;
    estimatedCostUsdCents: number;
  };
}

export interface SendMessageSessionDto extends IntakeChatSessionDto {
  lastAssistantMessage: string;
  safetyTriggeredThisTurn: boolean;
}

interface IntakeChatSessionEnvelope {
  session: IntakeChatSessionDto;
}

interface IntakeChatSendEnvelope {
  session: SendMessageSessionDto;
}

/** POST /api/intake-chat/sessions — start or resume. */
export async function startOrResumeIntakeChat(token: string): Promise<IntakeChatSessionDto> {
  const result = await apiRequest<IntakeChatSessionEnvelope>(
    "/api/intake-chat/sessions",
    { method: "POST", body: JSON.stringify({}) },
    token
  );
  return result.session;
}

/** GET /api/intake-chat/sessions/active — devuelve la sesión activa actual o null si no hay. */
export async function fetchActiveIntakeChatSession(token: string): Promise<IntakeChatSessionDto | null> {
  try {
    const result = await apiRequest<IntakeChatSessionEnvelope>(
      "/api/intake-chat/sessions/active",
      { method: "GET" },
      token
    );
    return result.session;
  } catch (err) {
    if (err instanceof Error && /Not\s*Found|404|No hay sesi/i.test(err.message)) {
      return null;
    }
    throw err;
  }
}

/** POST /api/intake-chat/sessions/:id/messages — enviar mensaje del paciente. */
export async function sendIntakeChatMessage(
  sessionId: string,
  message: string,
  token: string
): Promise<SendMessageSessionDto> {
  const result = await apiRequest<IntakeChatSendEnvelope>(
    `/api/intake-chat/sessions/${encodeURIComponent(sessionId)}/messages`,
    { method: "POST", body: JSON.stringify({ message }) },
    token
  );
  return result.session;
}

/**
 * POST /api/intake-chat/sessions/:id/submit — finaliza el chat y crea PatientIntake.
 * Respuesta alineada con `SubmitIntakeApiResponse` para reusar el handler post-intake del wizard.
 */
export async function submitIntakeChatSession(
  sessionId: string,
  token: string
): Promise<SubmitIntakeApiResponse> {
  return apiRequest<SubmitIntakeApiResponse>(
    `/api/intake-chat/sessions/${encodeURIComponent(sessionId)}/submit`,
    { method: "POST", body: JSON.stringify({}) },
    token
  );
}
