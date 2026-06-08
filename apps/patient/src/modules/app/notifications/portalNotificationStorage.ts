import { createNotificationStore, type PaymentFailureNotice } from "@therapy/patient-core";

export type { PaymentFailureNotice };

export const portalNotificationStore = createNotificationStore({
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key)
});

export function isNotificationDismissed(id: string): boolean {
  return portalNotificationStore.isDismissed(id);
}

export function markNotificationDismissed(id: string): void {
  portalNotificationStore.dismiss(id);
}

export function readSeenAssignedProfessionalId(): string | null {
  return portalNotificationStore.readSeenAssignedProfessionalId();
}

export function markAssignedProfessionalSeen(professionalId: string): void {
  portalNotificationStore.markAssignedProfessionalSeen(professionalId);
}

export function readSeenExercisesPublishedAt(): string | null {
  return portalNotificationStore.readSeenExercisesPublishedAt();
}

export function markExercisesPublishedAtSeen(isoDate: string): void {
  portalNotificationStore.markExercisesPublishedAtSeen(isoDate);
}

export function readPaymentFailureNotice(): PaymentFailureNotice | null {
  return portalNotificationStore.readPaymentFailureNotice();
}

export function recordPaymentFailureNotice(message: string): void {
  portalNotificationStore.recordPaymentFailureNotice(message);
}

export function clearPaymentFailureNotice(): void {
  portalNotificationStore.clearPaymentFailureNotice();
}
