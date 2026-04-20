import { subscribeDocumentVisibleInterval } from "@therapy/auth";
import { useEffect, useMemo, useRef, useState } from "react";
import { replaceTemplate, textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { fetchSharedPatientChatThreads } from "../lib/fetchPatientChatThreadsShared";
import type { ApiChatThread, Message } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatNotificationMeta(params: { isoDate: string; language: AppLanguage }): string {
  return new Intl.DateTimeFormat(params.language === "es" ? "es-AR" : params.language === "pt" ? "pt-BR" : "en-US", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(params.isoDate));
}

function parseNotificationContent(params: { rawBody: string; language: AppLanguage }): {
  title: string;
  body: string;
  detail: string;
} {
  const text = params.rawBody.replace(/\s+/g, " ").trim();
  const reasonMatch = text.match(/(?:Motivo|Reason)[:：]\s*(.+)$/i);
  const reason = reasonMatch?.[1]?.trim() ?? "";
  const coreText = reasonMatch ? text.slice(0, reasonMatch.index).trim().replace(/[.\s]+$/, "") : text;
  const cancelledMatch = coreText.match(/^Tu profesional\s+(.+?)\s+cancel[oó]\s+tu sesi[oó]n(?:\s+de\s+(.+))?$/i);

  if (cancelledMatch) {
    const professionalName = cancelledMatch[1]?.trim() ?? "";
    const when = cancelledMatch[2]?.trim() ?? "";
    const title = t(params.language, {
      es: "Sesión cancelada",
      en: "Session cancelled",
      pt: "Sessão cancelada"
    });
    const body = when
      ? replaceTemplate(
          t(params.language, {
            es: "{professional} canceló tu sesión del {when}.",
            en: "{professional} cancelled your session scheduled for {when}.",
            pt: "{professional} cancelou sua sessão de {when}."
          }),
          { professional: professionalName, when }
        )
      : replaceTemplate(
          t(params.language, {
            es: "{professional} canceló tu sesión.",
            en: "{professional} cancelled your session.",
            pt: "{professional} cancelou sua sessão."
          }),
          { professional: professionalName }
        );
    return {
      title,
      body,
      detail: reason
        ? replaceTemplate(
            t(params.language, {
              es: "Motivo: {reason}",
              en: "Reason: {reason}",
              pt: "Motivo: {reason}"
            }),
            { reason }
          )
        : ""
    };
  }

  const rescheduledMatch = coreText.match(/^Tu profesional\s+(.+?)\s+reprogram[oó]\s+tu sesi[oó]n(?:\s+de\s+(.+?)\s+a\s+(.+))?$/i);
  if (rescheduledMatch) {
    const professionalName = rescheduledMatch[1]?.trim() ?? "";
    const previousWhen = rescheduledMatch[2]?.trim() ?? "";
    const nextWhen = rescheduledMatch[3]?.trim() ?? "";
    const title = t(params.language, {
      es: "Sesión reprogramada",
      en: "Session rescheduled",
      pt: "Sessão reagendada"
    });
    const body = previousWhen && nextWhen
      ? replaceTemplate(
          t(params.language, {
            es: "{professional} reprogramó tu sesión de {from} a {to}.",
            en: "{professional} moved your session from {from} to {to}.",
            pt: "{professional} reagendou sua sessão de {from} para {to}."
          }),
          { professional: professionalName, from: previousWhen, to: nextWhen }
        )
      : replaceTemplate(
          t(params.language, {
            es: "{professional} reprogramó tu sesión.",
            en: "{professional} rescheduled your session.",
            pt: "{professional} reagendou sua sessão."
          }),
          { professional: professionalName }
        );
    return {
      title,
      body,
      detail: reason
        ? replaceTemplate(
            t(params.language, {
              es: "Motivo: {reason}",
              en: "Reason: {reason}",
              pt: "Motivo: {reason}"
            }),
            { reason }
          )
        : ""
    };
  }

  return {
    title: t(params.language, {
      es: "Mensaje del profesional",
      en: "Message from your professional",
      pt: "Mensagem do profissional"
    }),
    body: coreText || text,
    detail: reason
      ? replaceTemplate(
          t(params.language, {
            es: "Motivo: {reason}",
            en: "Reason: {reason}",
            pt: "Motivo: {reason}"
          }),
          { reason }
        )
      : ""
  };
}

export function usePortalNotifications(params: {
  authToken: string | null;
  language: AppLanguage;
  messages: Message[];
}) {
  const [remoteUnreadMessagesCount, setRemoteUnreadMessagesCount] = useState<number | null>(null);
  const [remoteNotificationThreads, setRemoteNotificationThreads] = useState<ApiChatThread[]>([]);
  const threadsPollInFlight = useRef(false);

  useEffect(() => {
    const authToken = params.authToken ?? undefined;
    if (!authToken) {
      setRemoteUnreadMessagesCount(null);
      setRemoteNotificationThreads([]);
      return;
    }

    let active = true;
    const POLL_MS = 20_000;

    const syncThreadsOnce = async () => {
      if (threadsPollInFlight.current) {
        return;
      }
      threadsPollInFlight.current = true;
      try {
        const response = await fetchSharedPatientChatThreads(authToken);
        if (!active) {
          return;
        }
        const threads = response.threads ?? [];
        setRemoteNotificationThreads(threads);
        const unread = threads.reduce((total, thread) => total + Math.max(0, thread.unreadCount || 0), 0);
        setRemoteUnreadMessagesCount(unread);
      } catch {
        // keep previous counts / threads
      } finally {
        threadsPollInFlight.current = false;
      }
    };

    void syncThreadsOnce();
    const unsubscribe = subscribeDocumentVisibleInterval(() => {
      void syncThreadsOnce();
    }, POLL_MS);

    return () => {
      active = false;
      threadsPollInFlight.current = false;
      unsubscribe();
    };
  }, [params.authToken]);

  const localNotificationItems = useMemo(() => {
    const byProfessional = new Map<string, Message>();
    params.messages
      .filter((message) => message.sender === "professional")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .forEach((message) => {
        if (!byProfessional.has(message.professionalId)) {
          byProfessional.set(message.professionalId, message);
        }
      });

    return Array.from(byProfessional.entries()).map(([professionalId, message]) => ({
      ...parseNotificationContent({ rawBody: message.text, language: params.language }),
      id: message.id,
      professionalId,
      meta: formatNotificationMeta({ isoDate: message.createdAt, language: params.language }),
      unread: !message.read
    }));
  }, [params.language, params.messages]);

  const remoteNotificationItems = useMemo(() => {
    return remoteNotificationThreads
      .filter((thread) => thread.lastMessage && thread.lastMessage.senderUserId === thread.counterpartUserId)
      .sort((a, b) => new Date(b.lastMessage?.createdAt ?? 0).getTime() - new Date(a.lastMessage?.createdAt ?? 0).getTime())
      .map((thread) => ({
        ...parseNotificationContent({
          rawBody: thread.lastMessage?.body ?? "",
          language: params.language
        }),
        id: thread.lastMessage?.id ?? thread.id,
        professionalId: thread.professionalId,
        meta: thread.lastMessage?.createdAt
          ? formatNotificationMeta({ isoDate: thread.lastMessage.createdAt, language: params.language })
          : "",
        unread: (thread.unreadCount ?? 0) > 0
      }));
  }, [params.language, remoteNotificationThreads]);

  const notificationItems = params.authToken ? remoteNotificationItems : localNotificationItems;
  const notificationsUnreadCount = params.authToken
    ? remoteNotificationThreads.reduce((total, thread) => total + Math.max(0, thread.unreadCount || 0), 0)
    : localNotificationItems.filter((item) => item.unread).length;

  return {
    remoteUnreadMessagesCount,
    notificationItems,
    notificationsUnreadCount
  };
}
