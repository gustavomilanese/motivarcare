import type { PatientTreatmentChat } from "@prisma/client";
import { env } from "../../config/env.js";

export type ConversationSessionState = {
  /** Inicio de la conversación activa (nueva si hubo pausa larga). */
  startedAt: Date;
  /** True si este turno abre una conversación nueva. */
  isNew: boolean;
  /** True si ya se agotaron los minutos de la conversación. */
  expired: boolean;
};

export function sessionIdleMs(): number {
  return env.TREATMENT_CHAT_SESSION_IDLE_MINUTES * 60 * 1000;
}

export function sessionMaxMs(): number {
  return env.TREATMENT_CHAT_SESSION_MAX_MINUTES * 60 * 1000;
}

/**
 * Resuelve la conversación activa:
 * - Sin inicio previo o pausa > idle → nueva sesión.
 * - Misma sesión pero > max minutos → expired (no se aceptan más mensajes hasta pausa).
 */
export function resolveConversationSession(
  chat: Pick<PatientTreatmentChat, "conversationSessionStartedAt" | "lastUserMessageAt">,
  now: Date
): ConversationSessionState {
  const idleMs = sessionIdleMs();
  const maxMs = sessionMaxMs();
  const lastUser = chat.lastUserMessageAt;
  const previousStart = chat.conversationSessionStartedAt;

  const idleSinceLastUser =
    lastUser != null && now.getTime() - lastUser.getTime() > idleMs;
  const needsNewSession = previousStart == null || idleSinceLastUser;

  if (needsNewSession) {
    return { startedAt: now, isNew: true, expired: false };
  }

  const elapsedMs = now.getTime() - previousStart.getTime();
  if (elapsedMs >= maxMs) {
    return { startedAt: previousStart, isNew: false, expired: true };
  }

  return { startedAt: previousStart, isNew: false, expired: false };
}

export function computeSessionQuota(
  chat: Pick<PatientTreatmentChat, "conversationSessionStartedAt" | "lastUserMessageAt">,
  now: Date
): {
  maxMinutes: number;
  minutesRemaining: number;
  sessionActive: boolean;
} {
  const maxMinutes = env.TREATMENT_CHAT_SESSION_MAX_MINUTES;
  const state = resolveConversationSession(chat, now);

  if (state.isNew) {
    return { maxMinutes, minutesRemaining: maxMinutes, sessionActive: true };
  }
  if (state.expired) {
    return { maxMinutes, minutesRemaining: 0, sessionActive: false };
  }

  const remainingMs = Math.max(0, sessionMaxMs() - (now.getTime() - state.startedAt.getTime()));
  const minutesRemaining = Math.max(0, Math.ceil(remainingMs / 60_000));
  return {
    maxMinutes,
    minutesRemaining,
    sessionActive: minutesRemaining > 0
  };
}
