import type { PortalNotificationKind } from "@therapy/patient-core";

export function notificationKindVisual(kind: PortalNotificationKind): {
  icon: string;
  accent: string;
  accentSoft: string;
} {
  switch (kind) {
    case "chat":
      return { icon: "💬", accent: "#5f44eb", accentSoft: "rgba(95, 68, 235, 0.12)" };
    case "session-soon":
      return { icon: "⏰", accent: "#ea580c", accentSoft: "rgba(234, 88, 12, 0.12)" };
    case "session-upcoming":
      return { icon: "📅", accent: "#2563eb", accentSoft: "rgba(37, 99, 235, 0.12)" };
    case "session-cancelled":
      return { icon: "✕", accent: "#dc2626", accentSoft: "rgba(220, 38, 38, 0.1)" };
    case "credits-low":
    case "credits-empty":
      return { icon: "🎟️", accent: "#7c3aed", accentSoft: "rgba(124, 58, 237, 0.12)" };
    case "payment-failed":
      return { icon: "💳", accent: "#dc2626", accentSoft: "rgba(220, 38, 38, 0.1)" };
    case "professional-assigned":
      return { icon: "🤝", accent: "#0891b2", accentSoft: "rgba(8, 145, 178, 0.12)" };
    case "exercise-new":
      return { icon: "🧘", accent: "#16a34a", accentSoft: "rgba(22, 163, 74, 0.12)" };
    case "diary-checkin":
      return { icon: "📝", accent: "#db2777", accentSoft: "rgba(219, 39, 119, 0.12)" };
    case "email-verify":
      return { icon: "✉️", accent: "#4f46e5", accentSoft: "rgba(79, 70, 229, 0.12)" };
    case "calendar-connect":
      return { icon: "📆", accent: "#0d9488", accentSoft: "rgba(13, 148, 136, 0.12)" };
    default:
      return { icon: "🔔", accent: "#5f44eb", accentSoft: "rgba(95, 68, 235, 0.12)" };
  }
}
