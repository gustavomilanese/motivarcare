import type { NotificationStore } from "./storage.js";
import type { PortalNotificationItem } from "./types.js";

export function applyNotificationDismissSideEffects(item: PortalNotificationItem, store: NotificationStore): void {
  store.dismiss(item.id);

  if (item.kind === "payment-failed") {
    store.clearPaymentFailureNotice();
  }

  if (item.kind === "professional-assigned" && item.action.type === "chat") {
    store.markAssignedProfessionalSeen(item.action.professionalId);
  }

  if (item.kind === "exercise-new") {
    store.markExercisesPublishedAtSeen(item.sortAt);
  }
}
