import {
  applyNotificationDismissSideEffects,
  buildPortalNotifications,
  countNotificationBadge,
  filterVisibleNotifications,
  markNotificationsBadgeSeen,
  type PortalNotificationItem
} from "@therapy/patient-core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getChatThreads } from "../api/client";
import type { BookingItem, PatientProfilePayload } from "../api/types";
import { getPortalNotificationStore, getPortalNotificationStoreSync } from "./storage";

export function usePatientNotifications(params: {
  token: string | null;
  profile: PatientProfilePayload | null;
  bookings: BookingItem[];
  language?: "es" | "en" | "pt";
}) {
  const [storeReady, setStoreReady] = useState(false);
  const [storageRevision, setStorageRevision] = useState(0);
  const [remoteThreads, setRemoteThreads] = useState<Awaited<ReturnType<typeof getChatThreads>>["threads"]>([]);
  const language = params.language ?? "es";

  useEffect(() => {
    let alive = true;
    void getPortalNotificationStore().then(() => {
      if (alive) {
        setStoreReady(true);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    if (!params.token) {
      setRemoteThreads([]);
      return;
    }

    const sync = async () => {
      try {
        const response = await getChatThreads(params.token!);
        if (alive) {
          setRemoteThreads(response.threads ?? []);
        }
      } catch {
        // keep previous
      }
    };

    void sync();
    const interval = setInterval(() => {
      void sync();
    }, 20_000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [params.token]);

  const bumpStorageRevision = useCallback(() => {
    setStorageRevision((current) => current + 1);
  }, []);

  const builtNotifications = useMemo((): PortalNotificationItem[] => {
    if (!storeReady) {
      return [];
    }

    const notificationStore = getPortalNotificationStoreSync();
    if (!notificationStore) {
      return [];
    }

    const professionalNameById = new Map<string, string>();
    if (params.profile?.activeProfessional) {
      professionalNameById.set(params.profile.activeProfessional.id, params.profile.activeProfessional.fullName);
    }

    params.bookings.forEach((booking) => {
      if (booking.professionalId && booking.counterpartName) {
        professionalNameById.set(booking.professionalId, booking.counterpartName);
      }
    });

    return buildPortalNotifications({
      language,
      state: {
        authToken: params.token,
        messages: [],
        bookings: params.bookings.map((booking) => ({
          id: booking.id,
          professionalId: booking.professionalId ?? "",
          startsAt: booking.startsAt,
          status: booking.status
        })),
        assignedProfessionalId: params.profile?.activeProfessional?.id ?? null,
        assignedProfessionalName: params.profile?.activeProfessional?.fullName ?? null,
        subscription: {
          creditsRemaining: params.profile?.latestPackage?.remainingCredits ?? 0
        },
        profile: {
          notificationsReminder: true
        }
      },
      remoteThreads,
      timeZone: params.profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      showCalendarReconnectCta: false,
      professionalNameById,
      exercises: [],
      lastDiaryEntryAt: null,
      store: notificationStore
    });
  }, [language, params.bookings, params.profile, params.token, remoteThreads, storageRevision, storeReady]);

  const notificationItems = useMemo(() => {
    const notificationStore = getPortalNotificationStoreSync();
    if (!notificationStore) {
      return [];
    }
    return filterVisibleNotifications(builtNotifications, notificationStore);
  }, [builtNotifications, storageRevision]);

  const badgeCount = useMemo(() => {
    const notificationStore = getPortalNotificationStoreSync();
    if (!notificationStore) {
      return 0;
    }
    return countNotificationBadge(builtNotifications, notificationStore);
  }, [builtNotifications, storageRevision]);

  const acknowledgeBadge = useCallback(() => {
    const notificationStore = getPortalNotificationStoreSync();
    if (!notificationStore) {
      return;
    }
    markNotificationsBadgeSeen(builtNotifications, notificationStore);
    bumpStorageRevision();
  }, [builtNotifications, bumpStorageRevision]);

  const dismissNotification = useCallback(
    (item: PortalNotificationItem) => {
      const notificationStore = getPortalNotificationStoreSync();
      if (!notificationStore) {
        return;
      }
      applyNotificationDismissSideEffects(item, notificationStore);
      bumpStorageRevision();
    },
    [bumpStorageRevision]
  );

  return {
    notificationItems,
    badgeCount,
    acknowledgeBadge,
    dismissNotification,
    storeReady
  };
}
