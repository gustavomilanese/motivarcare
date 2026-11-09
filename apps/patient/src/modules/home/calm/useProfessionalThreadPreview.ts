import { useCallback, useEffect, useState } from "react";
import { subscribeDocumentVisibleInterval } from "@therapy/auth";
import { fetchSharedPatientChatThreads } from "../../app/lib/fetchPatientChatThreadsShared";
import { apiRequest } from "../../app/services/api";
import type { ApiChatMessage, Message } from "../../app/types";

function toCardMessage(message: ApiChatMessage, professionalId: string): Message {
  const fromProfessional = message.senderRole === "PROFESSIONAL";
  return {
    id: message.id,
    professionalId,
    sender: fromProfessional ? "professional" : "patient",
    text: message.body,
    read: Boolean(message.readAt) || !fromProfessional,
    createdAt: message.createdAt
  };
}

/** Mensajes reales del hilo. `null` si no hay sesión o falló la carga (la tarjeta usa el estado local). */
export function useProfessionalThreadPreview(authToken: string | null, professionalId: string | null) {
  const [messages, setMessages] = useState<Message[] | null>(null);

  const reload = useCallback(async () => {
    if (!authToken || !professionalId) {
      setMessages(null);
      return;
    }
    try {
      const threads = await fetchSharedPatientChatThreads(authToken);
      const thread = threads.threads.find((item) => item.professionalId === professionalId);
      if (!thread) {
        setMessages([]);
        return;
      }
      const response = await apiRequest<{ messages: ApiChatMessage[] }>(
        `/api/chat/threads/${thread.id}/messages`,
        {},
        authToken
      );
      setMessages(response.messages.map((message) => toCardMessage(message, professionalId)));
    } catch {
      setMessages(null);
    }
  }, [authToken, professionalId]);

  useEffect(() => {
    void reload();
    if (!authToken || !professionalId) return;
    return subscribeDocumentVisibleInterval(() => {
      void reload();
    }, 20_000);
  }, [authToken, professionalId, reload]);

  return { messages, reload };
}
