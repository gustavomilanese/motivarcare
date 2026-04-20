import { subscribeDocumentVisibleInterval } from "@therapy/auth";
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import type { ThreadSummary } from "../types";

const POLL_MS = 20_000;

const inFlightByToken = new Map<string, Promise<{ threads: ThreadSummary[] }>>();

function fetchThreadsCoalesced(token: string): Promise<{ threads: ThreadSummary[] }> {
  const existing = inFlightByToken.get(token);
  if (existing) {
    return existing;
  }
  const pending = apiRequest<{ threads: ThreadSummary[] }>("/api/chat/threads", token).finally(() => {
    inFlightByToken.delete(token);
  });
  inFlightByToken.set(token, pending);
  return pending;
}

export function usePortalChatThreads(token: string): {
  threads: ThreadSummary[];
  unreadMessagesCount: number;
  reloadThreads: () => Promise<void>;
} {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);

  const reloadThreads = useCallback(async () => {
    try {
      const response = await fetchThreadsCoalesced(token);
      setThreads(response.threads ?? []);
    } catch {
      // conservar lista anterior
    }
  }, [token]);

  useEffect(() => {
    void reloadThreads();
    return subscribeDocumentVisibleInterval(() => {
      void reloadThreads();
    }, POLL_MS);
  }, [token, reloadThreads]);

  const unreadMessagesCount = threads.reduce(
    (total, thread) => total + Math.max(0, thread.unreadCount || 0),
    0
  );

  return { threads, unreadMessagesCount, reloadThreads };
}
