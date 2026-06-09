import { useEffect, useId, useRef } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { PortalNotificationItem } from "../notifications/portalNotificationTypes";
import { isSessionReminderNotificationKind } from "../notifications/notificationKindActions";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function NotificationItemActionsMenu(props: {
  language: AppLanguage;
  item: PortalNotificationItem;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onDismiss: () => void;
  onMuteKind: () => void;
  onDisableSessionReminders?: () => void;
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!props.open) {
      return;
    }

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || !rootRef.current?.contains(target)) {
        props.onClose();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        props.onClose();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    window.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [props.onClose, props.open]);

  const showDisableReminders =
    isSessionReminderNotificationKind(props.item.kind) && Boolean(props.onDisableSessionReminders);

  return (
    <div className="notification-actions-menu-wrap" ref={rootRef}>
      <button
        type="button"
        className="notification-actions-trigger"
        aria-label={t(props.language, {
          es: "Opciones de notificación",
          en: "Notification options",
          pt: "Opcoes de notificacao"
        })}
        aria-expanded={props.open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={(event) => {
          event.stopPropagation();
          props.onToggle();
        }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="12" cy="6" r="1.6" fill="currentColor" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          <circle cx="12" cy="18" r="1.6" fill="currentColor" />
        </svg>
      </button>
      {props.open ? (
        <div className="notification-actions-menu" id={menuId} role="menu">
          <button
            type="button"
            className="notification-actions-menu-item"
            role="menuitem"
            onClick={(event) => {
              event.stopPropagation();
              props.onDismiss();
              props.onClose();
            }}
          >
            {t(props.language, { es: "Quitar de la lista", en: "Remove from list", pt: "Remover da lista" })}
          </button>
          <button
            type="button"
            className="notification-actions-menu-item"
            role="menuitem"
            onClick={(event) => {
              event.stopPropagation();
              props.onMuteKind();
              props.onClose();
            }}
          >
            {t(props.language, {
              es: "No mostrar más avisos de este tipo",
              en: "Stop showing this notification type",
              pt: "Nao mostrar mais avisos deste tipo"
            })}
          </button>
          {showDisableReminders ? (
            <button
              type="button"
              className="notification-actions-menu-item"
              role="menuitem"
              onClick={(event) => {
                event.stopPropagation();
                props.onDisableSessionReminders?.();
                props.onClose();
              }}
            >
              {t(props.language, {
                es: "Desactivar recordatorios de sesión",
                en: "Turn off session reminders",
                pt: "Desativar lembretes de sessao"
              })}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
