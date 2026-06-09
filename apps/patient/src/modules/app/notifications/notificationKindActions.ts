import type { PortalNotificationKind } from "./portalNotificationTypes";

const SESSION_REMINDER_KINDS = new Set<PortalNotificationKind>([
  "session-soon",
  "session-upcoming",
  "session-cancelled"
]);

export function isSessionReminderNotificationKind(kind: PortalNotificationKind): boolean {
  return SESSION_REMINDER_KINDS.has(kind);
}
