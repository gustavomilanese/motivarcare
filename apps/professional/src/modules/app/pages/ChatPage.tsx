import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type AppLanguage, type LocalizedText, formatDateWithLocale, textByLanguage } from "@therapy/i18n-config";
import { useSearchParams } from "react-router-dom";
import { professionalSurfaceMessage } from "../lib/friendlyProfessionalSurfaceMessages";
import { apiRequest } from "../services/api";
import type { AuthUser, ThreadMessage, ThreadSummary } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatDateTime(value: string, language: AppLanguage): string {
  return formatDateWithLocale({
    value,
    language,
    options: {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  });
}

function mergeThreadsByCounterpart(threads: ThreadSummary[]): ThreadSummary[] {
  const grouped = new Map<string, ThreadSummary>();

  for (const thread of threads) {
    const key = thread.counterpartUserId || `${thread.patientId}:${thread.professionalId}`;
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, { ...thread });
      continue;
    }

    const currentActivityAt = current.lastMessage?.createdAt ?? current.createdAt;
    const nextActivityAt = thread.lastMessage?.createdAt ?? thread.createdAt;

    current.unreadCount += thread.unreadCount;
    if (new Date(nextActivityAt).getTime() > new Date(currentActivityAt).getTime()) {
      current.id = thread.id;
      current.lastMessage = thread.lastMessage;
      current.createdAt = thread.createdAt;
    }
  }

  return Array.from(grouped.values()).sort((a, b) => {
    const aTime = new Date(a.lastMessage?.createdAt ?? a.createdAt).getTime();
    const bTime = new Date(b.lastMessage?.createdAt ?? b.createdAt).getTime();
    return bTime - aTime;
  });
}

export function ChatPage(props: { token: string; user: AuthUser; language: AppLanguage }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPatientId = searchParams.get("patientId")?.trim() ?? "";
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string>("");
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const selectedThreadRef = useRef<string>("");

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? threads[0] ?? null,
    [threads, selectedThreadId]
  );

  useEffect(() => {
    selectedThreadRef.current = selectedThreadId;
  }, [selectedThreadId]);

  useEffect(() => {
    if (!requestedPatientId || threads.length === 0) {
      return;
    }
    const requestedThread = threads.find((thread) => thread.patientId === requestedPatientId);
    if (!requestedThread) {
      return;
    }

    setSelectedThreadId(requestedThread.id);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("patientId");
    setSearchParams(nextParams, { replace: true });
  }, [requestedPatientId, searchParams, setSearchParams, threads]);

  const loadThreads = useCallback(async () => {
    try {
      const response = await apiRequest<{ threads: ThreadSummary[] }>("/api/chat/threads", props.token);
      const mergedThreads = mergeThreadsByCounterpart(response.threads);
      setThreads(mergedThreads);
      setSelectedThreadId((current) => {
        if (current && mergedThreads.some((thread) => thread.id === current)) {
          return current;
        }
        return mergedThreads[0]?.id ?? "";
      });
      setError("");
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(professionalSurfaceMessage("chat-threads", props.language, raw));
    }
  }, [props.token, props.language]);

  const loadMessages = useCallback(async (threadId: string) => {
    try {
      const response = await apiRequest<{ messages: ThreadMessage[] }>(`/api/chat/threads/${threadId}/messages`, props.token);
      if (selectedThreadRef.current === threadId) {
        setMessages(response.messages);
      }
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(professionalSurfaceMessage("chat-messages", props.language, raw));
    }
  }, [props.token, props.language]);

  useEffect(() => {
    void loadThreads();
    const timer = window.setInterval(loadThreads, 3000);
    return () => window.clearInterval(timer);
  }, [loadThreads]);

  useEffect(() => {
    if (!selectedThread) {
      setMessages([]);
      return;
    }

    let active = true;
    const threadId = selectedThread.id;

    const readAndLoad = async () => {
      if (!active) {
        return;
      }
      await apiRequest<{ markedAsRead: number }>(`/api/chat/threads/${threadId}/read`, props.token, {
        method: "POST"
      }).catch(() => undefined);
      await loadMessages(threadId);
    };

    void readAndLoad();
    const timer = window.setInterval(() => {
      void readAndLoad();
    }, 2500);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [selectedThread?.id, props.token, loadMessages]);

  const handleSend = async () => {
    if (!draft.trim() || !selectedThread) {
      return;
    }

    try {
      await apiRequest<{ message: ThreadMessage }>(`/api/chat/threads/${selectedThread.id}/messages`, props.token, {
        method: "POST",
        body: JSON.stringify({ body: draft.trim() })
      });
      setDraft("");
      await loadMessages(selectedThread.id);
      await loadThreads();
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(professionalSurfaceMessage("chat-send", props.language, raw));
    }
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  return (
    <section className="pro-chat-shell">
      <aside className="pro-chat-sidebar">
        <header>
          <h2>{t(props.language, { es: "Conversaciones", en: "Conversations", pt: "Conversas" })}</h2>
        </header>
        <div className="pro-chat-thread-list">
          {threads.length === 0 ? (
            <p className="pro-muted pro-chat-thread-list-empty">
              {t(props.language, { es: "No hay conversaciones activas.", en: "No active conversations.", pt: "Nao ha conversas ativas." })}
            </p>
          ) : null}
          {threads.map((thread) => (
            <button
              key={thread.id}
              className={thread.id === selectedThread?.id ? "pro-thread active" : "pro-thread"}
              type="button"
              onClick={() => setSelectedThreadId(thread.id)}
            >
              <div title={thread.counterpartName}>
                <strong>{thread.counterpartName}</strong>
                <p>{thread.lastMessage?.body ?? t(props.language, { es: "Sin mensajes", en: "No messages", pt: "Sem mensagens" })}</p>
              </div>
              {thread.unreadCount > 0 ? <span className="pro-badge">{thread.unreadCount}</span> : null}
            </button>
          ))}
        </div>
      </aside>

      <div className="pro-chat-main">
        <header className="pro-chat-main-header">
          <h3>{selectedThread?.counterpartName ?? t(props.language, { es: "Selecciona un chat", en: "Select a chat", pt: "Selecione um chat" })}</h3>
        </header>

        <div className="pro-chat-messages">
          {messages.length === 0 ? <p className="pro-muted">{t(props.language, { es: "Todavía no hay mensajes.", en: "There are no messages yet.", pt: "Ainda nao ha mensagens." })}</p> : null}
          {messages.map((message) => (
            <article
              className={message.senderUserId === props.user.id ? "pro-message outgoing" : "pro-message incoming"}
              key={message.id}
            >
              <p>{message.body}</p>
              <time>{formatDateTime(message.createdAt, props.language)}</time>
            </article>
          ))}
        </div>

        <footer className="pro-chat-composer">
          <textarea
            value={draft}
            placeholder={t(props.language, { es: "Escribe un mensaje", en: "Write a message", pt: "Escreva uma mensagem" })}
            rows={2}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleComposerKeyDown}
          />
          <button
            className="wa-send"
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || !selectedThread}
            aria-label={t(props.language, { es: "Enviar mensaje", en: "Send message", pt: "Enviar mensagem" })}
            title={t(props.language, { es: "Enviar", en: "Send", pt: "Enviar" })}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m4.2 20.3 15.8-8.3L4.2 3.7l.2 6.1 9.1 2.2-9.1 2.2-.2 6.1Z" />
            </svg>
          </button>
        </footer>
      </div>

      {error ? <p className="pro-error chat-error">{error}</p> : null}
    </section>
  );
}
