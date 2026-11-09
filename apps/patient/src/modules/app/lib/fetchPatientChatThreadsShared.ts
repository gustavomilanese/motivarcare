import { apiRequest } from "../services/api";
import type { ApiChatThreadsResponse } from "../types";

/**
 * Varias partes del portal (notificaciones, Chat) piden `/api/chat/threads` a la vez al montar o alineados
 * en el mismo intervalo. Compartir la promesa en vuelo evita ráfagas duplicadas al mismo token.
 * Usá `force: true` después de marcar leído / enviar, para no reutilizar una respuesta vieja.
 */
const inFlightByToken = new Map<string, Promise<ApiChatThreadsResponse>>();

export function fetchSharedPatientChatThreads(
  authToken: string,
  options?: { force?: boolean }
): Promise<ApiChatThreadsResponse> {
  if (options?.force) {
    inFlightByToken.delete(authToken);
  } else {
    const existing = inFlightByToken.get(authToken);
    if (existing) {
      return existing;
    }
  }
  const pending = apiRequest<ApiChatThreadsResponse>("/api/chat/threads", {}, authToken).finally(() => {
    inFlightByToken.delete(authToken);
  });
  inFlightByToken.set(authToken, pending);
  return pending;
}
