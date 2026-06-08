import AsyncStorage from "@react-native-async-storage/async-storage";
import { createNotificationStore, type NotificationStore } from "@therapy/patient-core";

const STORAGE_KEYS = [
  "motivarcare-portal-notification-dismissals",
  "motivarcare-portal-notification-badge-seen-ids",
  "motivarcare-portal-seen-assigned-professional",
  "motivarcare-portal-seen-exercises-published-at",
  "motivarcare-portal-payment-failure-notice"
] as const;

const memory = new Map<string, string>();
let store: NotificationStore | null = null;
let hydratePromise: Promise<NotificationStore> | null = null;

export async function getPortalNotificationStore(): Promise<NotificationStore> {
  if (store) {
    return store;
  }

  if (!hydratePromise) {
    hydratePromise = (async () => {
      const pairs = await AsyncStorage.multiGet(STORAGE_KEYS);
      pairs.forEach(([key, value]) => {
        if (value != null) {
          memory.set(key, value);
        }
      });

      store = createNotificationStore({
        getItem: (key) => memory.get(key) ?? null,
        setItem: (key, value) => {
          memory.set(key, value);
          void AsyncStorage.setItem(key, value);
        },
        removeItem: (key) => {
          memory.delete(key);
          void AsyncStorage.removeItem(key);
        }
      });
      return store;
    })();
  }

  return hydratePromise;
}

export function getPortalNotificationStoreSync(): NotificationStore | null {
  return store;
}
