import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { type CSSProperties, useState } from "react";
import { kindLabel } from "../notifications/buildPortalNotifications";
import { NotificationKindIcon } from "../notifications/NotificationKindIcon";
import { notificationKindVisual } from "../notifications/notificationKindVisual";
import type { PortalNotificationItem } from "../notifications/portalNotificationTypes";
import { IconCampana, IconCerrar } from "../../home/calm/calmIcons";
import { NotificationItemActionsMenu } from "./NotificationItemActionsMenu";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function NotificationsDropdown(props: {
  language: AppLanguage;
  isMobileSheet: boolean;
  notifications: PortalNotificationItem[];
  onClose: () => void;
  onOpenNotification: (item: PortalNotificationItem) => void;
  onDismissNotification: (item: PortalNotificationItem, event?: { stopPropagation: () => void }) => void;
  onMuteNotificationKind: (item: PortalNotificationItem) => void;
  onDisableSessionReminders?: () => void;
  onOpenNotificationSettings: () => void;
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const unreadInList = props.notifications.filter((item) => item.unread).length;

  return (
    <div
      className={`notifications-dropdown${props.isMobileSheet ? " notifications-dropdown--mobile-sheet" : " notifications-dropdown--portaled"}`}
      role="dialog"
      aria-modal={props.isMobileSheet ? "true" : undefined}
      aria-label={t(props.language, { es: "Notificaciones", en: "Notifications", pt: "Notificacoes" })}
    >
      <div className="notifications-head">
        <div className="notifications-head-text">
          <strong>{t(props.language, { es: "Notificaciones", en: "Notifications", pt: "Notificacoes" })}</strong>
          <span className="notifications-head-sub">
            {unreadInList > 0
              ? t(props.language, {
                  es: `${unreadInList} sin leer`,
                  en: `${unreadInList} unread`,
                  pt: `${unreadInList} não lidas`
                })
              : t(props.language, {
                  es: "Estás al día",
                  en: "You're all caught up",
                  pt: "Você está em dia"
                })}
          </span>
        </div>
        <div className="notifications-head-actions">
          <button
            type="button"
            className="notifications-head-settings"
            aria-label={t(props.language, {
              es: "Ajustes de notificaciones",
              en: "Notification settings",
              pt: "Configuracoes de notificacoes"
            })}
            onClick={props.onOpenNotificationSettings}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M19.4 13.5a7.4 7.4 0 0 0 .1-3l1.5-1.2-1.5-2.6-1.8.5a7.5 7.5 0 0 0-2.6-1.5l-.5-1.8H9.5l-.5 1.8a7.5 7.5 0 0 0-2.6 1.5l-1.8-.5L2.1 9.3l1.5 1.2a7.4 7.4 0 0 0 0 3L2.1 14.7l1.5 2.6 1.8-.5a7.5 7.5 0 0 0 2.6 1.5l.5 1.8h5l.5-1.8a7.5 7.5 0 0 0 2.6-1.5l1.8.5 1.5-2.6-1.5-1.2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="notifications-head-close"
            aria-label={t(props.language, { es: "Cerrar notificaciones", en: "Close notifications", pt: "Fechar notificacoes" })}
            onClick={props.onClose}
          >
            <IconCerrar size={18} />
          </button>
        </div>
      </div>

      <div className="notifications-body">
        {props.notifications.length === 0 ? (
          <div className="notifications-empty-box" role="status">
            <span className="notifications-empty-icon" aria-hidden="true">
              <IconCampana size={22} />
            </span>
            <p className="notifications-empty-title">
              {t(props.language, { es: "Sin novedades por ahora", en: "No updates for now", pt: "Sem novidades por agora" })}
            </p>
            <p className="notifications-empty">
              {t(props.language, {
                es: "Te avisamos acá cuando haya algo importante.",
                en: "We'll notify you here when something important happens.",
                pt: "Avisaremos aqui quando houver algo importante."
              })}
            </p>
          </div>
        ) : (
          <ul className="notifications-list">
            {props.notifications.slice(0, 12).map((item) => {
              const visual = notificationKindVisual(item.kind);
              return (
                <li key={item.id} className="notification-row">
                  <div className="notification-row-layout">
                    <span
                      className={`notification-unread-marker${item.unread ? " is-unread" : ""}`}
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      className={`notification-item${item.unread ? " unread" : ""}`}
                      onClick={() => props.onOpenNotification(item)}
                      style={
                        {
                          "--notification-kind": visual.accent,
                          "--notification-kind-soft": visual.accentSoft
                        } as CSSProperties
                      }
                    >
                      <span className="notification-item-icon" aria-hidden="true">
                        <NotificationKindIcon kind={item.kind} />
                      </span>
                      <span className="notification-item-content">
                        <span className="notification-item-top">
                          <span className="notification-item-kind">{kindLabel(props.language, item.kind)}</span>
                          {item.meta ? <small className="notification-item-meta">{item.meta}</small> : null}
                        </span>
                        <strong className="notification-item-title">{item.title}</strong>
                        {item.body ? <span className="notification-item-body">{item.body}</span> : null}
                        {item.detail ? <span className="notification-item-detail">{item.detail}</span> : null}
                      </span>
                    </button>
                    <NotificationItemActionsMenu
                      language={props.language}
                      item={item}
                      open={openMenuId === item.id}
                      onToggle={() => setOpenMenuId((current) => (current === item.id ? null : item.id))}
                      onClose={() => setOpenMenuId(null)}
                      onDismiss={() => props.onDismissNotification(item)}
                      onMuteKind={() => props.onMuteNotificationKind(item)}
                      onDisableSessionReminders={props.onDisableSessionReminders}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export function NotificationsBackdrop(props: {
  language: AppLanguage;
  onClose: () => void;
}) {
  return (
    <button
      type="button"
      className="notifications-dropdown-backdrop"
      aria-label={t(props.language, { es: "Cerrar notificaciones", en: "Close notifications", pt: "Fechar notificacoes" })}
      onClick={props.onClose}
    />
  );
}
