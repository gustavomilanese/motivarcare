import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import type { ThreadSummary } from "../types";

const POLL_MS = 5000;

export function usePortalChatThreads(token: string): {
  threads: ThreadSummary[];
  unreadMessagesCount: number;
} {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await apiRequest<{ threads: ThreadSummary[] }>("/api/chat/threads", token);
        if (!active) {
          return;
        }
        setThreads(response.threads ?? []);
      } catch {
        if (!active) {
          return;
        }
      }
    };

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, POLL_MS);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [token]);

  const unreadMessagesCount = threads.reduce(
    (total, thread) => total + Math.max(0, thread.unreadCount || 0),
    0
  );

  return { threads, unreadMessagesCount };
}
