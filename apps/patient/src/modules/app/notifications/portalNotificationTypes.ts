import type { ProfileTab } from "../types";

export type PortalNotificationKind =
  | "chat"
  | "session-soon"
  | "session-upcoming"
  | "session-cancelled"
  | "credits-low"
  | "credits-empty"
  | "payment-failed"
  | "professional-assigned"
  | "exercise-new"
  | "diary-checkin"
  | "email-verify"
  | "calendar-connect";

export type PortalNotificationAction =
  | { type: "chat"; professionalId: string }
  | { type: "navigate"; path: string }
  | { type: "booking"; bookingId: string }
  | { type: "exercise"; slug: string }
  | { type: "profile"; tab: ProfileTab };

export interface PortalNotificationItem {
  id: string;
  kind: PortalNotificationKind;
  title: string;
  body: string;
  detail: string;
  meta: string;
  unread: boolean;
  action: PortalNotificationAction;
  /** ISO date for sorting (newest first). */
  sortAt: string;
}
