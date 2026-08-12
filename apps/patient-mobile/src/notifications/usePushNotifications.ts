import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { registerPushToken } from "../api/client";
import type { BookingItem } from "../api/types";

const TOKEN_KEY = "mc:expo-push-token:v1";
const SCHEDULED_PREFIX = "mc:local-notif:booking:";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

function projectId(): string | undefined {
  const eas = Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined;
  const id = eas?.projectId?.trim();
  if (!id || id.startsWith("REPLACE_")) return undefined;
  return id;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("motivarcare-default", {
    name: "MotivarCare",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250]
  });
}

async function notificationPermissionGranted(): Promise<boolean> {
  const current = (await Notifications.getPermissionsAsync()) as {
    granted?: boolean;
    status?: string;
  };
  if (current.granted === true || current.status === "granted") {
    return true;
  }
  const asked = (await Notifications.requestPermissionsAsync()) as {
    granted?: boolean;
    status?: string;
  };
  return asked.granted === true || asked.status === "granted";
}

/**
 * Pide permiso, registra Expo push token (si hay EAS projectId) y agenda
 * recordatorios locales ~1h antes de sesiones confirmadas.
 */
export function usePushNotifications(params: {
  token: string | null;
  bookings: BookingItem[];
  remindersEnabled: boolean;
}) {
  const registeredRef = useRef(false);

  const registerRemote = useCallback(async () => {
    if (!params.token || registeredRef.current) return;
    if (!Device.isDevice) return;

    await ensureAndroidChannel();
    const granted = await notificationPermissionGranted();
    if (!granted) {
      return;
    }

    const pid = projectId();
    try {
      const push = await Notifications.getExpoPushTokenAsync(
        pid ? { projectId: pid } : undefined
      );
      const expoToken = push.data?.trim();
      if (!expoToken) return;
      await AsyncStorage.setItem(TOKEN_KEY, expoToken);
      await registerPushToken({
        token: params.token,
        expoPushToken: expoToken,
        platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "unknown"
      });
      registeredRef.current = true;
    } catch (error) {
      // Expo Go / sin projectId: igual sirven notificaciones locales.
      console.warn("[push] register skipped:", error instanceof Error ? error.message : error);
    }
  }, [params.token]);

  useEffect(() => {
    void registerRemote();
  }, [registerRemote]);

  useEffect(() => {
    if (!params.remindersEnabled) {
      return;
    }

    let cancelled = false;
    void (async () => {
      await ensureAndroidChannel();
      const granted = await notificationPermissionGranted();
      if (!granted || cancelled) return;

      const upcoming = params.bookings.filter((b) => {
        if (b.status !== "confirmed") return false;
        const start = Date.parse(b.startsAt);
        return Number.isFinite(start) && start > Date.now();
      });

      for (const booking of upcoming.slice(0, 12)) {
        const startMs = Date.parse(booking.startsAt);
        const fireAt = startMs - 60 * 60 * 1000;
        if (fireAt <= Date.now() + 30_000) continue;

        const storageKey = `${SCHEDULED_PREFIX}${booking.id}`;
        const prevId = await AsyncStorage.getItem(storageKey);
        if (prevId) {
          try {
            await Notifications.cancelScheduledNotificationAsync(prevId);
          } catch {
            // ignore
          }
        }

        try {
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: "Sesión en 1 hora",
              body: booking.counterpartName
                ? `Con ${booking.counterpartName}. Abrí MotivarCare para entrar.`
                : "Tenés una sesión próxima. Abrí MotivarCare para entrar.",
              data: { bookingId: booking.id, kind: "session-soon" }
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: new Date(fireAt),
              channelId: "motivarcare-default"
            }
          });
          await AsyncStorage.setItem(storageKey, id);
        } catch (error) {
          console.warn("[push] schedule failed", error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params.bookings, params.remindersEnabled]);
}
