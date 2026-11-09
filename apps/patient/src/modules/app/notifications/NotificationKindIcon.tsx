import type { PortalNotificationKind } from "@therapy/patient-core";
import {
  IconCampana,
  IconCandado,
  IconChat,
  IconCerrar,
  IconDiario,
  IconEnviar,
  IconProfesional,
  IconReloj,
  IconRespira,
  IconSesiones
} from "../../home/calm/calmIcons";

/** Íconos de línea del sprite app-usuario (DS 0.1). Sin emojis. */
export function NotificationKindIcon(props: { kind: PortalNotificationKind; size?: number }) {
  const size = props.size ?? 22;
  switch (props.kind) {
    case "chat":
      return <IconChat size={size} />;
    case "session-soon":
      return <IconReloj size={size} />;
    case "session-upcoming":
    case "calendar-connect":
      return <IconSesiones size={size} />;
    case "session-cancelled":
      return <IconCerrar size={size} />;
    case "credits-low":
    case "credits-empty":
    case "payment-failed":
      return <IconCandado size={size} />;
    case "professional-assigned":
    case "professional-review":
      return <IconProfesional size={size} />;
    case "exercise-new":
      return <IconRespira size={size} />;
    case "diary-checkin":
      return <IconDiario size={size} />;
    case "email-verify":
      return <IconEnviar size={size} />;
    default:
      return <IconCampana size={size} />;
  }
}
