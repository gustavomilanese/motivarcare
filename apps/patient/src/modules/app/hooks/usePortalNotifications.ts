import { subscribeDocumentVisibleInterval } from "@therapy/auth";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppLanguage } from "@therapy/i18n-config";
import { fetchPublishedExercises, type ExercisePost } from "../../exercises/services/exercisesApi";
import { fetchDiaryEntries } from "../../emotional-diary/services/emotionalDiaryApi";
import { fetchSharedPatientChatThreads } from "../lib/fetchPatientChatThreadsShared";
import type { ApiChatThread, PatientAppState, Professional } from "../types";
import {
  buildPortalNotifications,
  countUnreadNotifications
} from "../notifications/buildPortalNotifications";
import type { PortalNotificationItem } from "../notifications/portalNotificationTypes";

export function usePortalNotifications(params: {
  authToken: string | null;
  language: AppLanguage;
  state: PatientAppState;
  professionals: Professional[];
  sessionTimezone: string;
  showCalendarReconnectCta: boolean;
}) {
  const [remoteUnreadMessagesCount, setRemoteUnreadMessagesCount] = useState<number | null>(null);
  const [remoteNotificationThreads, setRemoteNotificationThreads] = useState<ApiChatThread[]>([]);
  const [exercises, setExercises] = useState<ExercisePost[]>([]);
  const [lastDiaryEntryAt, setLastDiaryEntryAt] = useState<string | null>(null);
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

  useEffect(() => {
    let active = true;
    void fetchPublishedExercises()
      .then((items) => {
        if (active) {
          setExercises(items);
        }
      })
      .catch(() => {
        // keep previous list
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const authToken = params.authToken ?? undefined;
    if (!authToken) {
      setLastDiaryEntryAt(null);
      return;
    }

    let active = true;
    void fetchDiaryEntries(authToken, "published")
      .then((entries) => {
        if (!active) {
          return;
        }
        const latest = entries
          .map((entry) => entry.publishedAt ?? entry.updatedAt ?? entry.createdAt)
          .filter(Boolean)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
        setLastDiaryEntryAt(latest ?? null);
      })
      .catch(() => {
        if (active) {
          setLastDiaryEntryAt(null);
        }
      });

    return () => {
      active = false;
    };
  }, [params.authToken]);

  const professionalNameById = useMemo(() => {
    const map = new Map<string, string>();
    params.professionals.forEach((professional) => {
      map.set(professional.id, professional.fullName);
    });
    if (params.state.assignedProfessionalId && params.state.assignedProfessionalName) {
      map.set(params.state.assignedProfessionalId, params.state.assignedProfessionalName);
    }
    return map;
  }, [params.professionals, params.state.assignedProfessionalId, params.state.assignedProfessionalName]);

  const notificationItems = useMemo((): PortalNotificationItem[] => {
    return buildPortalNotifications({
      language: params.language,
      state: params.state,
      remoteThreads: remoteNotificationThreads,
      timeZone: params.sessionTimezone,
      showCalendarReconnectCta: params.showCalendarReconnectCta,
      professionalNameById,
      exercises,
      lastDiaryEntryAt
    });
  }, [
    exercises,
    lastDiaryEntryAt,
    params.language,
    params.sessionTimezone,
    params.showCalendarReconnectCta,
    params.state,
    professionalNameById,
    remoteNotificationThreads
  ]);

  const notificationsUnreadCount = useMemo(
    () => countUnreadNotifications(notificationItems),
    [notificationItems]
  );

  return {
    remoteUnreadMessagesCount,
    notificationItems,
    notificationsUnreadCount
  };
}
