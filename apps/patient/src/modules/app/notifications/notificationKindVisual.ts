import type { PortalNotificationKind } from "@therapy/patient-core";

/** Soft de chip DS para el fondo del ícono. */
export function notificationKindSoft(kind: PortalNotificationKind): string {
  switch (kind) {
    case "session-soon":
    case "professional-review":
      return "#fbe9b0";
    case "credits-low":
    case "credits-empty":
    case "diary-checkin":
      return "#e6edc4";
    case "session-upcoming":
    case "exercise-new":
    case "calendar-connect":
      return "#d6e7dc";
    case "session-cancelled":
    case "payment-failed":
      return "#f5f3eb";
    default:
      return "#e7f1ea";
  }
}

/** Acentos DS 0.1 para filas de notificación. Sin violeta ni emojis. */
export function notificationKindVisual(kind: PortalNotificationKind): {
  accent: string;
  accentSoft: string;
} {
  return {
    accent: "#1e4033",
    accentSoft: notificationKindSoft(kind)
  };
}
