export type PatientProfileTab = "data" | "cards" | "subscription" | "settings" | "support";

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
  | { type: "profile"; tab: PatientProfileTab };

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

export interface PaymentFailureNotice {
  id: string;
  message: string;
  createdAt: string;
}

export interface PatientNotificationMessage {
  id: string;
  professionalId: string;
  sender: "patient" | "professional";
  text: string;
  read: boolean;
  createdAt: string;
}

export interface PatientNotificationBooking {
  id: string;
  professionalId: string;
  startsAt: string;
  status: string;
}

export interface PatientNotificationChatThread {
  id: string;
  professionalId: string;
  counterpartUserId: string;
  unreadCount?: number;
  lastMessage?: {
    id: string;
    body: string;
    senderUserId: string;
    createdAt: string;
  } | null;
}

export interface PatientNotificationExercise {
  id: string;
  slug: string;
  title: string;
  summary: string;
  status: string;
  publishedAt: string;
}

export interface PatientNotificationStateSlice {
  authToken: string | null;
  messages: PatientNotificationMessage[];
  bookings: PatientNotificationBooking[];
  assignedProfessionalId: string | null;
  assignedProfessionalName: string | null;
  emailVerificationRequired?: boolean;
  session?: { emailVerified?: boolean } | null;
  subscription: { creditsRemaining: number };
  profile: { notificationsReminder?: boolean };
}

export interface BuildPortalNotificationsParams {
  language: import("@therapy/i18n-config").AppLanguage;
  state: PatientNotificationStateSlice;
  remoteThreads: PatientNotificationChatThread[];
  timeZone: string;
  showCalendarReconnectCta: boolean;
  professionalNameById: Map<string, string>;
  exercises: PatientNotificationExercise[];
  lastDiaryEntryAt: string | null;
}
