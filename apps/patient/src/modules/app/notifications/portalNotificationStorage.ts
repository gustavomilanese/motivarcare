const DISMISSALS_KEY = "motivarcare-portal-notification-dismissals";
const SEEN_PROFESSIONAL_KEY = "motivarcare-portal-seen-assigned-professional";
const SEEN_EXERCISES_KEY = "motivarcare-portal-seen-exercises-published-at";
const PAYMENT_FAILURE_KEY = "motivarcare-portal-payment-failure-notice";

export interface PaymentFailureNotice {
  id: string;
  message: string;
  createdAt: string;
}

function readDismissals(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSALS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set();
  }
}

function writeDismissals(ids: Set<string>): void {
  try {
    localStorage.setItem(DISMISSALS_KEY, JSON.stringify(Array.from(ids).slice(-200)));
  } catch {
    // ignore quota errors
  }
}

export function isNotificationDismissed(id: string): boolean {
  return readDismissals().has(id);
}

export function markNotificationDismissed(id: string): void {
  const next = readDismissals();
  next.add(id);
  writeDismissals(next);
}

export function readSeenAssignedProfessionalId(): string | null {
  try {
    return localStorage.getItem(SEEN_PROFESSIONAL_KEY);
  } catch {
    return null;
  }
}

export function markAssignedProfessionalSeen(professionalId: string): void {
  try {
    localStorage.setItem(SEEN_PROFESSIONAL_KEY, professionalId);
  } catch {
    // ignore
  }
}

export function readSeenExercisesPublishedAt(): string | null {
  try {
    return localStorage.getItem(SEEN_EXERCISES_KEY);
  } catch {
    return null;
  }
}

export function markExercisesPublishedAtSeen(isoDate: string): void {
  try {
    localStorage.setItem(SEEN_EXERCISES_KEY, isoDate);
  } catch {
    // ignore
  }
}

export function readPaymentFailureNotice(): PaymentFailureNotice | null {
  try {
    const raw = localStorage.getItem(PAYMENT_FAILURE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PaymentFailureNotice;
    if (!parsed?.id || !parsed.createdAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function recordPaymentFailureNotice(message: string): void {
  try {
    const notice: PaymentFailureNotice = {
      id: `payment-failed-${Date.now()}`,
      message: message.trim().slice(0, 280),
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(PAYMENT_FAILURE_KEY, JSON.stringify(notice));
  } catch {
    // ignore
  }
}

export function clearPaymentFailureNotice(): void {
  try {
    localStorage.removeItem(PAYMENT_FAILURE_KEY);
  } catch {
    // ignore
  }
}
