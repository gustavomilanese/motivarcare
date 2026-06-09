import type { NotificationStore } from "./storage.js";
import type { PortalNotificationItem } from "./types.js";

export function filterVisibleNotifications(
  items: PortalNotificationItem[],
  store: NotificationStore
): PortalNotificationItem[] {
  return items.filter((item) => !store.isDismissed(item.id) && !store.isKindMuted(item.kind));
}

export function countNotificationBadge(
  items: PortalNotificationItem[],
  store: NotificationStore
): number {
  const badgeSeenIds = store.readBadgeSeenIds();
  return items.filter(
    (item) => item.unread && !store.isDismissed(item.id) && !store.isKindMuted(item.kind) && !badgeSeenIds.has(item.id)
  ).length;
}

export function markNotificationsBadgeSeen(
  items: PortalNotificationItem[],
  store: NotificationStore
): void {
  store.markBadgeSeen(items.map((item) => item.id));
}
