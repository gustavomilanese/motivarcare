import type { PortalNotificationItem, PortalNotificationKind } from "./types.js";

/** Kinds that may trigger OS push / banner preview when implemented. In-app only for the rest. */
const PUSH_ELIGIBLE_KINDS = new Set<PortalNotificationKind>([
  "chat",
  "session-soon",
  "session-cancelled",
  "payment-failed"
]);

export function isPushEligibleKind(kind: PortalNotificationKind): boolean {
  return PUSH_ELIGIBLE_KINDS.has(kind);
}

export function filterPushEligibleNotifications(items: PortalNotificationItem[]): PortalNotificationItem[] {
  return items.filter((item) => item.unread && isPushEligibleKind(item.kind));
}
