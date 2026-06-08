import type { PaymentFailureNotice } from "./types.js";

const DISMISSALS_KEY = "motivarcare-portal-notification-dismissals";
const BADGE_SEEN_IDS_KEY = "motivarcare-portal-notification-badge-seen-ids";
const SEEN_PROFESSIONAL_KEY = "motivarcare-portal-seen-assigned-professional";
const SEEN_EXERCISES_KEY = "motivarcare-portal-seen-exercises-published-at";
const PAYMENT_FAILURE_KEY = "motivarcare-portal-payment-failure-notice";

export interface KeyValueStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

export interface NotificationStore {
  isDismissed(id: string): boolean;
  dismiss(id: string): void;
  readBadgeSeenIds(): Set<string>;
  markBadgeSeen(ids: string[]): void;
  readSeenAssignedProfessionalId(): string | null;
  markAssignedProfessionalSeen(professionalId: string): void;
  readSeenExercisesPublishedAt(): string | null;
  markExercisesPublishedAtSeen(isoDate: string): void;
  readPaymentFailureNotice(): PaymentFailureNotice | null;
  recordPaymentFailureNotice(message: string): void;
  clearPaymentFailureNotice(): void;
}

function readJsonStringArray(raw: string | null): string[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function createNotificationStore(storage: KeyValueStorage): NotificationStore {
  const syncStorage = {
    getItem(key: string): string | null {
      const value = storage.getItem(key);
      if (value instanceof Promise) {
        throw new Error("createNotificationStore requires synchronous storage");
      }
      return value;
    },
    setItem(key: string, value: string): void {
      const result = storage.setItem(key, value);
      if (result instanceof Promise) {
        throw new Error("createNotificationStore requires synchronous storage");
      }
    },
    removeItem(key: string): void {
      const result = storage.removeItem(key);
      if (result instanceof Promise) {
        throw new Error("createNotificationStore requires synchronous storage");
      }
    }
  };

  function readDismissals(): Set<string> {
    return new Set(readJsonStringArray(syncStorage.getItem(DISMISSALS_KEY)));
  }

  function writeDismissals(ids: Set<string>): void {
    try {
      syncStorage.setItem(DISMISSALS_KEY, JSON.stringify(Array.from(ids).slice(-200)));
    } catch {
      // ignore quota errors
    }
  }

  return {
    isDismissed(id: string): boolean {
      return readDismissals().has(id);
    },

    dismiss(id: string): void {
      const next = readDismissals();
      next.add(id);
      writeDismissals(next);
    },

    readBadgeSeenIds(): Set<string> {
      return new Set(readJsonStringArray(syncStorage.getItem(BADGE_SEEN_IDS_KEY)));
    },

    markBadgeSeen(ids: string[]): void {
      try {
        const merged = new Set([...readJsonStringArray(syncStorage.getItem(BADGE_SEEN_IDS_KEY)), ...ids]);
        syncStorage.setItem(BADGE_SEEN_IDS_KEY, JSON.stringify(Array.from(merged).slice(-200)));
      } catch {
        // ignore
      }
    },

    readSeenAssignedProfessionalId(): string | null {
      try {
        return syncStorage.getItem(SEEN_PROFESSIONAL_KEY);
      } catch {
        return null;
      }
    },

    markAssignedProfessionalSeen(professionalId: string): void {
      try {
        syncStorage.setItem(SEEN_PROFESSIONAL_KEY, professionalId);
      } catch {
        // ignore
      }
    },

    readSeenExercisesPublishedAt(): string | null {
      try {
        return syncStorage.getItem(SEEN_EXERCISES_KEY);
      } catch {
        return null;
      }
    },

    markExercisesPublishedAtSeen(isoDate: string): void {
      try {
        syncStorage.setItem(SEEN_EXERCISES_KEY, isoDate);
      } catch {
        // ignore
      }
    },

    readPaymentFailureNotice(): PaymentFailureNotice | null {
      try {
        const raw = syncStorage.getItem(PAYMENT_FAILURE_KEY);
        if (!raw) {
          return null;
        }
        const parsed = JSON.parse(raw) as PaymentFailureNotice;
        if (!parsed?.id || !parsed.createdAt) {
          return null;
        }
        return parsed;
      } catch {
        return null;
      }
    },

    recordPaymentFailureNotice(message: string): void {
      try {
        const notice: PaymentFailureNotice = {
          id: `payment-failed-${Date.now()}`,
          message: message.trim().slice(0, 280),
          createdAt: new Date().toISOString()
        };
        syncStorage.setItem(PAYMENT_FAILURE_KEY, JSON.stringify(notice));
      } catch {
        // ignore
      }
    },

    clearPaymentFailureNotice(): void {
      try {
        syncStorage.removeItem(PAYMENT_FAILURE_KEY);
      } catch {
        // ignore
      }
    }
  };
}
