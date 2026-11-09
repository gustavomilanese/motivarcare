import { useEffect, useMemo, useState } from "react";
import { subscribeDocumentVisibleInterval } from "@therapy/auth";
import { useSearchParams } from "react-router-dom";
import type { AppLanguage } from "@therapy/i18n-config";
import { fetchSharedPatientChatThreads } from "../../app/lib/fetchPatientChatThreadsShared";
import { notifyPatientChatThreadsChanged } from "../../app/lib/patientChatThreadsSync";
import { friendlyChatSurfaceMessage } from "../../app/lib/friendlyPatientMessages";
import { apiRequest, resolvePublicAssetUrl } from "../../app/services/api";
import type { ApiChatMessage, ApiChatThread, Message, PatientAppState, Professional } from "../../app/types";

function findProfessionalById(professionalId: string, professionals: Professional[]): Professional | null {
  return professionals.find((item) => item.id === professionalId) ?? null;
}

function unreadCount(messages: Message[], professionalId?: string): number {
  return messages.filter(
    (message) =>
      message.sender === "professional" &&
      !message.read &&
      (!professionalId || message.professionalId === professionalId)
  ).length;
}

export function usePatientChat(params: {
  state: PatientAppState;
  professionals: Professional[];
  language: AppLanguage;
  authToken: string | null;
  sessionUserId: string;
  onSetActiveProfessional: (professionalId: string) => void;
  onSendMessage: (professionalId: string, text: string) => void;
  onMarkRead: (professionalId: string) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [draft, setDraft] = useState("");
  const [mobileLayout, setMobileLayout] = useState(false);
  const [apiThreads, setApiThreads] = useState<ApiChatThread[]>([]);
  const [apiAvailableProfessionalIds, setApiAvailableProfessionalIds] = useState<string[]>([]);
  const [apiMessages, setApiMessages] = useState<ApiChatMessage[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [apiError, setApiError] = useState("");
  const [pendingUnreadFocus, setPendingUnreadFocus] = useState(searchParams.get("focus") === "first-unread");

  const remoteMode = Boolean(params.authToken);
  const availableProfessionals = useMemo(() => {
    const visibleIds = new Set<string>();
    const validIds = new Set(params.professionals.map((professional) => professional.id));
    if (params.state.assignedProfessionalId && validIds.has(params.state.assignedProfessionalId)) {
      visibleIds.add(params.state.assignedProfessionalId);
    }
    if (remoteMode) {
      apiThreads.forEach((thread) => {
        if (validIds.has(thread.professionalId)) visibleIds.add(thread.professionalId);
      });
      apiAvailableProfessionalIds.forEach((professionalId) => {
        if (validIds.has(professionalId)) visibleIds.add(professionalId);
      });
    } else {
      params.state.bookings.forEach((booking) => {
        if (validIds.has(booking.professionalId)) visibleIds.add(booking.professionalId);
      });
      params.state.messages.forEach((message) => {
        if (validIds.has(message.professionalId)) visibleIds.add(message.professionalId);
      });
    }
    return params.professionals.filter((professional) => visibleIds.has(professional.id));
  }, [
    apiAvailableProfessionalIds,
    apiThreads,
    params.professionals,
    params.state.assignedProfessionalId,
    params.state.bookings,
    params.state.messages,
    remoteMode
  ]);

  const activeProfessionalId = useMemo(() => {
    if (availableProfessionals.length === 0) return null;
    if (availableProfessionals.some((professional) => professional.id === params.state.activeChatProfessionalId)) {
      return params.state.activeChatProfessionalId;
    }
    return availableProfessionals[0].id;
  }, [availableProfessionals, params.state.activeChatProfessionalId]);

  const threadProfessional = activeProfessionalId ? findProfessionalById(activeProfessionalId, params.professionals) : null;
  const threadMessages = threadProfessional
    ? params.state.messages
        .filter((message) => message.professionalId === threadProfessional.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];

  const apiThreadByProfessional = useMemo(() => {
    const map = new Map<string, ApiChatThread>();
    for (const thread of apiThreads) map.set(thread.professionalId, thread);
    return map;
  }, [apiThreads]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1080px)");
    const syncLayout = () => setMobileLayout(media.matches);
    syncLayout();
    media.addEventListener("change", syncLayout);
    return () => media.removeEventListener("change", syncLayout);
  }, []);

  useEffect(() => {
    if (searchParams.get("focus") === "first-unread") setPendingUnreadFocus(true);
  }, [searchParams]);

  useEffect(() => {
    if (!activeProfessionalId || params.state.activeChatProfessionalId === activeProfessionalId) return;
    params.onSetActiveProfessional(activeProfessionalId);
  }, [activeProfessionalId, params.onSetActiveProfessional, params.state.activeChatProfessionalId]);

  useEffect(() => {
    if (activeProfessionalId) return;
    setActiveThreadId("");
    setApiMessages([]);
  }, [activeProfessionalId]);

  useEffect(() => {
    if (remoteMode || !threadProfessional) return;
    const unread = unreadCount(params.state.messages, threadProfessional.id);
    if (unread <= 0) return;
    if (pendingUnreadFocus) {
      const timer = window.setTimeout(() => params.onMarkRead(threadProfessional.id), 650);
      return () => window.clearTimeout(timer);
    }
    params.onMarkRead(threadProfessional.id);
  }, [remoteMode, threadProfessional, params.onMarkRead, params.state.messages, pendingUnreadFocus]);

  const loadThreads = async (force = false) => {
    if (!params.authToken) return;
    try {
      const response = await fetchSharedPatientChatThreads(params.authToken, { force });
      setApiThreads(
        response.threads.map((thread) => ({
          ...thread,
          counterpartPhotoUrl: resolvePublicAssetUrl(thread.counterpartPhotoUrl) ?? thread.counterpartPhotoUrl ?? null
        }))
      );
      setApiAvailableProfessionalIds(response.availableProfessionalIds ?? []);
      setApiError("");
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setApiError(friendlyChatSurfaceMessage("threads", raw, params.language));
    }
  };

  const markThreadRead = async (threadId: string) => {
    if (!params.authToken) return;
    try {
      await apiRequest<{ markedAsRead: number }>(
        `/api/chat/threads/${threadId}/read`,
        { method: "POST" },
        params.authToken
      );
      setApiThreads((current) =>
        current.map((thread) => {
          if (thread.id !== threadId && thread.professionalId !== params.state.activeChatProfessionalId) {
            return thread;
          }
          return { ...thread, unreadCount: 0 };
        })
      );
      await loadThreads(true);
      notifyPatientChatThreadsChanged();
    } catch {
      // El próximo poll de threads vuelve a intentar.
    }
  };

  const loadMessages = async (threadId: string) => {
    if (!params.authToken) return;
    try {
      const response = await apiRequest<{ messages: ApiChatMessage[] }>(
        `/api/chat/threads/${threadId}/messages`,
        {},
        params.authToken
      );
      setApiMessages(response.messages);
      setApiError("");
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setApiError(friendlyChatSurfaceMessage("messages", raw, params.language));
    }
  };

  const ensureThreadForProfessional = async (professionalId: string): Promise<string | null> => {
    if (!params.authToken) return null;
    try {
      const response = await apiRequest<{ threadId: string }>(
        `/api/chat/threads/by-professional/${professionalId}`,
        { method: "POST" },
        params.authToken
      );
      setActiveThreadId(response.threadId);
      return response.threadId;
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setApiError(friendlyChatSurfaceMessage("open", raw, params.language));
      return null;
    }
  };

  useEffect(() => {
    if (!remoteMode || !params.authToken) return;
    void loadThreads();
    return subscribeDocumentVisibleInterval(() => {
      void loadThreads();
    }, 20_000);
  }, [remoteMode, params.authToken]);

  useEffect(() => {
    if (!remoteMode || !params.authToken || !activeProfessionalId) return;
    let active = true;
    const run = async () => {
      const threadId = await ensureThreadForProfessional(activeProfessionalId);
      if (!threadId || !active) return;
      await loadMessages(threadId);
      if (!active) return;
      await markThreadRead(threadId);
    };
    void run();
    return () => {
      active = false;
    };
  }, [activeProfessionalId, remoteMode, params.authToken]);

  useEffect(() => {
    if (!remoteMode || !params.authToken || !activeThreadId) return;
    return subscribeDocumentVisibleInterval(() => {
      void loadMessages(activeThreadId);
    }, 15_000);
  }, [remoteMode, params.authToken, activeThreadId]);

  const selectProfessional = async (professionalId: string) => {
    if (!availableProfessionals.some((professional) => professional.id === professionalId)) return;
    params.onSetActiveProfessional(professionalId);
    if (!remoteMode || !params.authToken) return;
    const threadId = await ensureThreadForProfessional(professionalId);
    if (threadId) {
      await loadMessages(threadId);
      await markThreadRead(threadId);
    }
  };

  const sendBody = async (body: string, clearDraft: boolean) => {
    const text = body.trim();
    if (!text || !threadProfessional) return;
    if (remoteMode && params.authToken) {
      const threadId = activeThreadId || (await ensureThreadForProfessional(threadProfessional.id));
      if (!threadId) return;
      try {
        await apiRequest(
          `/api/chat/threads/${threadId}/messages`,
          { method: "POST", body: JSON.stringify({ body: text }) },
          params.authToken
        );
        if (clearDraft) setDraft("");
        await loadMessages(threadId);
        await loadThreads(true);
        notifyPatientChatThreadsChanged();
      } catch (requestError) {
        const raw = requestError instanceof Error ? requestError.message : "";
        setApiError(friendlyChatSurfaceMessage("send", raw, params.language));
      }
      return;
    }
    params.onSendMessage(threadProfessional.id, text);
    if (clearDraft) setDraft("");
  };

  useEffect(() => {
    if (!pendingUnreadFocus) return;
    const firstUnreadMessageId = remoteMode
      ? apiMessages.find((message) => message.senderUserId !== params.sessionUserId && !message.readAt)?.id ?? null
      : threadMessages.find((message) => message.sender === "professional" && !message.read)?.id ?? null;
    if (firstUnreadMessageId) {
      document.getElementById(`chat-msg-${firstUnreadMessageId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setPendingUnreadFocus(false);
      setSearchParams({}, { replace: true });
      return;
    }
    if (!remoteMode || apiMessages.length > 0) {
      setPendingUnreadFocus(false);
      setSearchParams({}, { replace: true });
    }
  }, [pendingUnreadFocus, remoteMode, apiMessages, threadMessages, params.sessionUserId, setSearchParams]);

  return {
    draft,
    setDraft,
    mobileLayout,
    apiError,
    remoteMode,
    availableProfessionals,
    activeProfessionalId,
    threadProfessional,
    threadMessages,
    apiMessages,
    apiThreadByProfessional,
    pendingUnreadFocus,
    selectProfessional,
    sendBody,
    unreadCount
  };
}
