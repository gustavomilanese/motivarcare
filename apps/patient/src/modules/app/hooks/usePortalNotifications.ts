import { subscribeDocumentVisibleInterval } from "@therapy/auth";
import {
  applyNotificationDismissSideEffects,
  buildPortalNotifications,
  countNotificationBadge,
  filterVisibleNotifications,
  markNotificationsBadgeSeen
} from "@therapy/patient-core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppLanguage } from "@therapy/i18n-config";
import { fetchPublishedExercises, type ExercisePost } from "../../exercises/services/exercisesApi";
import { fetchDiaryEntries } from "../../emotional-diary/services/emotionalDiaryApi";
import { fetchSharedPatientChatThreads } from "../lib/fetchPatientChatThreadsShared";
import type { ApiChatThread, PatientAppState, Professional } from "../types";
import type { PortalNotificationItem } from "../notifications/portalNotificationTypes";
import {
  muteNotificationKind as muteStoredNotificationKind,
  PORTAL_NOTIFICATION_PREFS_CHANGED_EVENT,
  portalNotificationStore
} from "../notifications/portalNotificationStorage";

export function usePortalNotifications(params: {
  authToken: string | null;
  language: AppLanguage;
  state: PatientAppState;
  professionals: Professional[];
  sessionTimezone: string;
  showCalendarReconnectCta: boolean;
  pendingProfessionalReview?: {
    professionalId: string;
    professionalName: string;
  } | null;
}) {
  const [remoteUnreadMessagesCount, setRemoteUnreadMessagesCount] = useState<number | null>(null);
  const [remoteNotificationThreads, setRemoteNotificationThreads] = useState<ApiChatThread[]>([]);
  const [exercises, setExercises] = useState<ExercisePost[]>([]);
  const [lastDiaryEntryAt, setLastDiaryEntryAt] = useState<string | null>(null);
  const [storageRevision, setStorageRevision] = useState(0);
  const threadsPollInFlight = useRef(false);

  const bumpStorageRevision = useCallback(() => {
    setStorageRevision((current) => current + 1);
  }, []);

  useEffect(() => {
    const onPrefsChanged = () => bumpStorageRevision();
    window.addEventListener(PORTAL_NOTIFICATION_PREFS_CHANGED_EVENT, onPrefsChanged);
    return () => window.removeEventListener(PORTAL_NOTIFICATION_PREFS_CHANGED_EVENT, onPrefsChanged);
  }, [bumpStorageRevision]);

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

  const builtNotifications = useMemo((): PortalNotificationItem[] => {
    return buildPortalNotifications({
      language: params.language,
      state: params.state,
      remoteThreads: remoteNotificationThreads,
      timeZone: params.sessionTimezone,
      showCalendarReconnectCta: params.showCalendarReconnectCta,
      professionalNameById,
      exercises,
      lastDiaryEntryAt,
      pendingProfessionalReview: params.pendingProfessionalReview ?? null,
      store: portalNotificationStore
    });
  }, [
    exercises,
    lastDiaryEntryAt,
    params.pendingProfessionalReview,
    params.language,
    params.sessionTimezone,
    params.showCalendarReconnectCta,
    params.state,
    professionalNameById,
    remoteNotificationThreads,
    storageRevision
  ]);

  const notificationItems = useMemo(
    () => filterVisibleNotifications(builtNotifications, portalNotificationStore),
    [builtNotifications, storageRevision]
  );

  const notificationsUnreadCount = useMemo(
    () => countNotificationBadge(builtNotifications, portalNotificationStore),
    [builtNotifications, storageRevision]
  );

  const acknowledgeNotificationBadge = useCallback(() => {
    markNotificationsBadgeSeen(builtNotifications, portalNotificationStore);
    bumpStorageRevision();
  }, [builtNotifications, bumpStorageRevision]);

  const dismissNotification = useCallback(
    (item: PortalNotificationItem) => {
      applyNotificationDismissSideEffects(item, portalNotificationStore);
      bumpStorageRevision();
    },
    [bumpStorageRevision]
  );

  const muteNotificationKind = useCallback(
    (item: PortalNotificationItem) => {
      muteStoredNotificationKind(item.kind);
      applyNotificationDismissSideEffects(item, portalNotificationStore);
      bumpStorageRevision();
    },
    [bumpStorageRevision]
  );

  return {
    remoteUnreadMessagesCount,
    notificationItems,
    notificationsUnreadCount,
    acknowledgeNotificationBadge,
    dismissNotification,
    muteNotificationKind
  };
}
