import { type KeyboardEvent, type SyntheticEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  type AppLanguage,
  type LocalizedText,
  formatDateWithLocale,
  textByLanguage
} from "@therapy/i18n-config";
import { apiRequest, professionalPhotoSrc, resolvePublicAssetUrl } from "../services/api";
import type {
  ApiChatMessage,
  ApiChatThread,
  ApiChatThreadsResponse,
  Message,
  PatientAppState,
  Professional
} from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function findProfessionalById(professionalId: string, professionals: Professional[]): Professional | null {
  return professionals.find((item) => item.id === professionalId) ?? null;
}

function getUnreadCount(messages: Message[], professionalId?: string): number {
  return messages.filter((message) => !message.read && (!professionalId || message.professionalId === professionalId)).length;
}

function formatDateTime(params: { isoDate: string; timezone: string; language: AppLanguage }): string {
  return formatDateWithLocale({
    value: params.isoDate,
    language: params.language,
    timeZone: params.timezone,
    options: {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  });
}

export function ChatPage(props: {
  state: PatientAppState;
  professionals: Professional[];
  professionalPhotoMap: Record<string, string>;
  language: AppLanguage;
  authToken: string | null;
  sessionUserId: string;
  onSetActiveProfessional: (professionalId: string) => void;
  onSendMessage: (professionalId: string, text: string) => void;
  onMarkRead: (professionalId: string) => void;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [draft, setDraft] = useState("");
  const [apiThreads, setApiThreads] = useState<ApiChatThread[]>([]);
  const [apiAvailableProfessionalIds, setApiAvailableProfessionalIds] = useState<string[]>([]);
  const [apiMessages, setApiMessages] = useState<ApiChatMessage[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [apiError, setApiError] = useState("");
  const [pendingUnreadFocus, setPendingUnreadFocus] = useState(searchParams.get("focus") === "first-unread");

  const remoteMode = Boolean(props.authToken);
  const availableProfessionals = useMemo(() => {
    const visibleIds = new Set<string>();
    const validIds = new Set(props.professionals.map((professional) => professional.id));

    if (props.state.assignedProfessionalId && validIds.has(props.state.assignedProfessionalId)) {
      visibleIds.add(props.state.assignedProfessionalId);
    }

    if (remoteMode) {
      apiThreads.forEach((thread) => {
        if (validIds.has(thread.professionalId)) {
          visibleIds.add(thread.professionalId);
        }
      });
      apiAvailableProfessionalIds.forEach((professionalId) => {
        if (validIds.has(professionalId)) {
          visibleIds.add(professionalId);
        }
      });
    } else {
      props.state.bookings.forEach((booking) => {
        if (validIds.has(booking.professionalId)) {
          visibleIds.add(booking.professionalId);
        }
      });
      props.state.messages.forEach((message) => {
        if (validIds.has(message.professionalId)) {
          visibleIds.add(message.professionalId);
        }
      });
    }

    return props.professionals.filter((professional) => visibleIds.has(professional.id));
  }, [
    apiAvailableProfessionalIds,
    apiThreads,
    props.professionals,
    props.state.assignedProfessionalId,
    props.state.bookings,
    props.state.messages,
    remoteMode
  ]);

  const activeProfessionalId = useMemo(() => {
    if (availableProfessionals.length === 0) {
      return null;
    }
    if (availableProfessionals.some((professional) => professional.id === props.state.activeChatProfessionalId)) {
      return props.state.activeChatProfessionalId;
    }
    return availableProfessionals[0].id;
  }, [availableProfessionals, props.state.activeChatProfessionalId]);

  const threadProfessional = activeProfessionalId ? findProfessionalById(activeProfessionalId, props.professionals) : null;
  const threadMessages = threadProfessional
    ? props.state.messages
        .filter((message) => message.professionalId === threadProfessional.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];

  const apiThreadByProfessional = useMemo(() => {
    const map = new Map<string, ApiChatThread>();
    for (const thread of apiThreads) {
      map.set(thread.professionalId, thread);
    }
    return map;
  }, [apiThreads]);

  useEffect(() => {
    if (searchParams.get("focus") === "first-unread") {
      setPendingUnreadFocus(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!activeProfessionalId || props.state.activeChatProfessionalId === activeProfessionalId) {
      return;
    }
    props.onSetActiveProfessional(activeProfessionalId);
  }, [activeProfessionalId, props.onSetActiveProfessional, props.state.activeChatProfessionalId]);

  useEffect(() => {
    if (activeProfessionalId) {
      return;
    }
    setActiveThreadId("");
    setApiMessages([]);
  }, [activeProfessionalId]);

  useEffect(() => {
    if (remoteMode || !threadProfessional) {
      return;
    }

    const unread = getUnreadCount(props.state.messages, threadProfessional.id);
    if (unread > 0) {
      if (pendingUnreadFocus) {
        const timer = window.setTimeout(() => {
          props.onMarkRead(threadProfessional.id);
        }, 650);
        return () => {
          window.clearTimeout(timer);
        };
      }
      props.onMarkRead(threadProfessional.id);
    }
  }, [remoteMode, threadProfessional, props.onMarkRead, props.state.messages, pendingUnreadFocus]);

  const loadThreads = async () => {
    if (!props.authToken) {
      return;
    }

    try {
      const response = await apiRequest<ApiChatThreadsResponse>(
        "/api/chat/threads",
        {},
        props.authToken ?? undefined
      );
      setApiThreads(
        response.threads.map((thread) => ({
          ...thread,
          counterpartPhotoUrl: resolvePublicAssetUrl(thread.counterpartPhotoUrl) ?? thread.counterpartPhotoUrl ?? null
        }))
      );
      setApiAvailableProfessionalIds(response.availableProfessionalIds ?? []);
      setApiError("");
    } catch (requestError) {
      setApiError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo cargar el chat.",
              en: "Could not load chat.",
              pt: "Nao foi possivel carregar o chat."
            })
      );
    }
  };

  const loadMessages = async (threadId: string) => {
    if (!props.authToken) {
      return;
    }

    try {
      const response = await apiRequest<{ messages: ApiChatMessage[] }>(
        `/api/chat/threads/${threadId}/messages`,
        {},
        props.authToken ?? undefined
      );
      setApiMessages(response.messages);
      setApiError("");
    } catch (requestError) {
      setApiError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudieron cargar mensajes.",
              en: "Could not load messages.",
              pt: "Nao foi possivel carregar mensagens."
            })
      );
    }
  };

  const ensureThreadForProfessional = async (professionalId: string): Promise<string | null> => {
    if (!props.authToken) {
      return null;
    }

    try {
      const response = await apiRequest<{ threadId: string }>(
        `/api/chat/threads/by-professional/${professionalId}`,
        { method: "POST" },
        props.authToken ?? undefined
      );
      setActiveThreadId(response.threadId);
      return response.threadId;
    } catch (requestError) {
      setApiError(
        requestError instanceof Error
          ? requestError.message
          : t(props.language, {
              es: "No se pudo abrir la conversacion.",
              en: "Could not open conversation.",
              pt: "Nao foi possivel abrir a conversa."
            })
      );
      return null;
    }
  };

  useEffect(() => {
    if (!remoteMode || !props.authToken) {
      return;
    }

    loadThreads();
    const timer = window.setInterval(() => {
      loadThreads();
    }, 3500);

    return () => {
      window.clearInterval(timer);
    };
  }, [remoteMode, props.authToken]);

  useEffect(() => {
    if (!remoteMode || !props.authToken || !activeProfessionalId) {
      return;
    }

    let active = true;

    const run = async () => {
      const threadId = await ensureThreadForProfessional(activeProfessionalId);
      if (!threadId || !active) {
        return;
      }

      await loadMessages(threadId);
      await apiRequest<{ markedAsRead: number }>(
        `/api/chat/threads/${threadId}/read`,
        { method: "POST" },
        props.authToken ?? undefined
      ).catch(() => undefined);
    };

    run();

    return () => {
      active = false;
    };
  }, [activeProfessionalId, remoteMode, props.authToken]);

  useEffect(() => {
    if (!remoteMode || !props.authToken || !activeThreadId) {
      return;
    }

    const timer = window.setInterval(() => {
      loadMessages(activeThreadId);
    }, 2500);

    return () => {
      window.clearInterval(timer);
    };
  }, [remoteMode, props.authToken, activeThreadId]);

  const handleSelectProfessional = async (professionalId: string) => {
    if (!availableProfessionals.some((professional) => professional.id === professionalId)) {
      return;
    }

    props.onSetActiveProfessional(professionalId);

    if (!remoteMode || !props.authToken) {
      return;
    }

    const threadId = await ensureThreadForProfessional(professionalId);
    if (threadId) {
      await loadMessages(threadId);
      await loadThreads();
    }
  };

  const handleSend = async () => {
    if (!draft.trim() || !threadProfessional) {
      return;
    }

    if (remoteMode && props.authToken) {
      const threadId = activeThreadId || (await ensureThreadForProfessional(threadProfessional.id));
      if (!threadId) {
        return;
      }

      try {
        await apiRequest(
          `/api/chat/threads/${threadId}/messages`,
          {
            method: "POST",
            body: JSON.stringify({ body: draft.trim() })
          },
          props.authToken ?? undefined
        );
        setDraft("");
        await loadMessages(threadId);
        await loadThreads();
      } catch (requestError) {
        setApiError(
          requestError instanceof Error
            ? requestError.message
            : t(props.language, {
                es: "No se pudo enviar el mensaje.",
                en: "Could not send message.",
                pt: "Nao foi possivel enviar a mensagem."
              })
        );
      }
      return;
    }

    props.onSendMessage(threadProfessional.id, draft.trim());
    setDraft("");
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (!pendingUnreadFocus) {
      return;
    }

    const firstUnreadMessageId = remoteMode
      ? apiMessages.find((message) => message.senderUserId !== props.sessionUserId && !message.readAt)?.id ?? null
      : threadMessages.find((message) => message.sender === "professional" && !message.read)?.id ?? null;

    if (firstUnreadMessageId) {
      const messageElement = document.getElementById(`chat-msg-${firstUnreadMessageId}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      setPendingUnreadFocus(false);
      setSearchParams({}, { replace: true });
      return;
    }

    if (!remoteMode || apiMessages.length > 0) {
      setPendingUnreadFocus(false);
      setSearchParams({}, { replace: true });
    }
  }, [
    pendingUnreadFocus,
    remoteMode,
    apiMessages,
    threadMessages,
    props.sessionUserId,
    setSearchParams
  ]);

  return (
    <div className="wa-shell">
      <aside className="wa-sidebar">
        <header className="wa-sidebar-header">
          <h2>{t(props.language, { es: "Mensajes", en: "Messages", pt: "Mensagens" })}</h2>
        </header>

        <div className="wa-thread-list">
          {availableProfessionals.map((professional) => {
            const remoteThread = apiThreadByProfessional.get(professional.id);
            const unread = remoteMode ? remoteThread?.unreadCount ?? 0 : getUnreadCount(props.state.messages, professional.id);
            const lastMessageText = remoteMode
              ? remoteThread?.lastMessage?.body
                ?? t(props.language, { es: "Todavía no hay mensajes", en: "No messages yet", pt: "Ainda nao ha mensagens" })
              : props.state.messages
                  .filter((message) => message.professionalId === professional.id)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.text
                ?? t(props.language, { es: "Todavía no hay mensajes", en: "No messages yet", pt: "Ainda nao ha mensagens" });

            const threadPhoto = remoteThread?.counterpartPhotoUrl?.trim();
            const photoSrc = professionalPhotoSrc(threadPhoto || props.professionalPhotoMap[professional.id] || null);
            return (
              <button
                className={professional.id === activeProfessionalId ? "wa-thread-item active" : "wa-thread-item"}
                key={professional.id}
                type="button"
                onClick={() => {
                  void handleSelectProfessional(professional.id);
                }}
              >
                <img
                  src={photoSrc}
                  alt={professional.fullName}
                  onError={props.onImageFallback}
                />
                <div>
                  <strong>{professional.fullName}</strong>
                  <p>{lastMessageText}</p>
                </div>
                {unread > 0 ? (
                  <div
                    className="wa-thread-unread"
                    aria-label={t(props.language, {
                      es: `${unread} mensajes nuevos`,
                      en: `${unread} new messages`,
                      pt: `${unread} novas mensagens`
                    })}
                  >
                    <span className="wa-thread-unread-dot" aria-hidden="true" />
                    <span className="badge">{unread}</span>
                  </div>
                ) : null}
              </button>
            );
          })}
          {availableProfessionals.length === 0 ? (
            <p className="wa-empty">
              {t(props.language, {
                es: "Tu chat se habilita cuando tengas un profesional asignado.",
                en: "Your chat will be enabled once you have an assigned professional.",
                pt: "Seu chat sera habilitado quando voce tiver um profissional atribuido."
              })}
            </p>
          ) : null}
        </div>
      </aside>

      <section className="wa-main">
        <header className="wa-main-header">
          <div className="wa-main-profile">
            {threadProfessional ? (
              <>
                <img
                  src={professionalPhotoSrc(
                    (remoteMode
                      ? apiThreadByProfessional.get(threadProfessional.id)?.counterpartPhotoUrl?.trim()
                      : undefined) ||
                      props.professionalPhotoMap[threadProfessional.id] ||
                      null
                  )}
                  alt={threadProfessional.fullName}
                  onError={props.onImageFallback}
                />
                <div>
                  <h3>{threadProfessional.fullName}</h3>
                  <span>{t(props.language, { es: "En linea", en: "Online", pt: "Online" })}</span>
                </div>
              </>
            ) : (
              <div>
                <h3>{t(props.language, { es: "Chat no disponible", en: "Chat unavailable", pt: "Chat indisponivel" })}</h3>
                <span>
                  {t(props.language, {
                    es: "No tienes profesionales asignados para mensajeria.",
                    en: "You have no assigned professionals for messaging.",
                    pt: "Voce nao tem profissionais atribuidos para mensagens."
                  })}
                </span>
              </div>
            )}
          </div>
        </header>

        <div className="wa-messages">
          {threadProfessional && remoteMode && apiMessages.length === 0 ? (
            <p className="wa-empty">
              {t(props.language, {
                es: "Todavía no hay mensajes en esta conversación.",
                en: "There are no messages in this conversation yet.",
                pt: "Ainda nao ha mensagens nesta conversa."
              })}
            </p>
          ) : null}

          {threadProfessional && remoteMode
            ? apiMessages.map((message) => (
                <article
                  id={`chat-msg-${message.id}`}
                  className={message.senderUserId === props.sessionUserId ? "wa-message outgoing" : "wa-message incoming"}
                  key={message.id}
                >
                  <p>{message.body}</p>
                  <time>
                    {formatDateTime({
                      isoDate: message.createdAt,
                      timezone: props.state.profile.timezone,
                      language: props.language
                    })}
                  </time>
                </article>
              ))
            : null}

          {!threadProfessional ? (
            <p className="wa-empty">
              {t(props.language, {
                es: "Cuando tengas un profesional asignado, podras escribirle desde aqui.",
                en: "Once you have an assigned professional, you can message from here.",
                pt: "Quando voce tiver um profissional atribuido, podera escrever por aqui."
              })}
            </p>
          ) : !remoteMode && threadMessages.length === 0 ? (
            <p className="wa-empty">
              {t(props.language, {
                es: "Todavía no hay mensajes en esta conversación.",
                en: "There are no messages in this conversation yet.",
                pt: "Ainda nao ha mensagens nesta conversa."
              })}
            </p>
          ) : (
            !remoteMode ? threadMessages.map((message) => (
              <article
                id={`chat-msg-${message.id}`}
                className={message.sender === "patient" ? "wa-message outgoing" : "wa-message incoming"}
                key={message.id}
              >
                <p>{message.text}</p>
                <time>
                  {formatDateTime({
                    isoDate: message.createdAt,
                    timezone: props.state.profile.timezone,
                    language: props.language
                  })}
                </time>
              </article>
            )) : null
          )}
        </div>

        <footer className="wa-composer">
          <textarea
            placeholder={threadProfessional
              ? t(props.language, { es: "Escribe un mensaje", en: "Write a message", pt: "Escreva uma mensagem" })
              : t(props.language, { es: "Chat deshabilitado hasta asignacion", en: "Chat disabled until assignment", pt: "Chat desativado ate atribuicao" })}
            rows={2}
            value={draft}
            disabled={!threadProfessional}
            onKeyDown={handleComposerKeyDown}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button
            className="wa-send"
            type="button"
            onClick={handleSend}
            disabled={!threadProfessional}
            aria-label={t(props.language, { es: "Enviar", en: "Send", pt: "Enviar" })}
            title={t(props.language, { es: "Enviar", en: "Send", pt: "Enviar" })}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3.8 11.4 19.6 4.6c.9-.4 1.8.5 1.4 1.4l-6.8 15.8c-.4 1-1.8.9-2.1-.1l-1.7-5.7-5.7-1.7c-1-.3-1.1-1.7-.1-2.1Zm7.6 2.2 1.2 4 4.8-11.1-11.1 4.8 4 1.2 5.7-5.7a.9.9 0 1 1 1.2 1.2l-5.8 5.6Z" />
            </svg>
          </button>
        </footer>
      </section>
      {apiError ? <p className="error-text">{apiError}</p> : null}
    </div>
  );
}
