import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { PatientMessageNotificationItem } from "../lib/portalPatientNotifications";
import {
  ProHeaderIconBell,
  ProHeaderIconLogOut,
  ProHeaderIconMore,
  ProHeaderIconSettings,
  ProHeaderIconUser
} from "./ProHeaderIcons";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProPortalHeaderActions(props: {
  language: AppLanguage;
  variant?: "default" | "dashboard-toolbar";
  notificationsOpen: boolean;
  notificationsUnreadCount: number;
  notificationItems: PatientMessageNotificationItem[];
  onToggleNotifications: () => void;
  onCloseNotifications: () => void;
  onLogout: () => void;
  listingVisibility?: ReactNode;
}) {
  const navigate = useNavigate();
  const variant = props.variant ?? "default";
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const isDashboardToolbar = variant === "dashboard-toolbar";

  useEffect(() => {
    if (!accountMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  const openAccountMenu = () => {
    props.onCloseNotifications();
    setAccountMenuOpen(true);
  };

  const toggleAccountMenu = () => {
    if (accountMenuOpen) {
      setAccountMenuOpen(false);
      return;
    }
    openAccountMenu();
  };

  const toggleNotifications = () => {
    setAccountMenuOpen(false);
    props.onToggleNotifications();
  };

  return (
    <div
      className={`pro-header-actions${isDashboardToolbar ? " pro-header-actions--dashboard-toolbar" : ""}`}
    >
      {props.listingVisibility ? (
        <div className="pro-listing-visibility-header-slot">{props.listingVisibility}</div>
      ) : null}
      <div className="pro-notifications-wrap">
        <button
          type="button"
          className={`pro-header-icon-link pro-notifications-trigger ${props.notificationsOpen ? "active" : ""}`}
          aria-label={t(props.language, { es: "Ver notificaciones", en: "View notifications", pt: "Ver notificacoes" })}
          onClick={toggleNotifications}
        >
          <ProHeaderIconBell className="pro-header-svg-icon pro-header-svg-icon--bell" />
          {props.notificationsUnreadCount > 0 ? (
            <small>{props.notificationsUnreadCount > 99 ? "99+" : props.notificationsUnreadCount}</small>
          ) : null}
        </button>
        {props.notificationsOpen ? (
          <div className="pro-notifications-dropdown">
            <div className="pro-notifications-head">
              <strong>{t(props.language, { es: "Notificaciones", en: "Notifications", pt: "Notificacoes" })}</strong>
            </div>
            <div className="menu-sep" />
            {props.notificationItems.length === 0 ? (
              <p className="pro-notifications-empty">
                {t(props.language, { es: "Sin novedades por ahora.", en: "No updates for now.", pt: "Sem novidades por agora." })}
              </p>
            ) : (
              <ul className="pro-notifications-list">
                {props.notificationItems.slice(0, 8).map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`pro-notification-item ${item.unread ? "unread" : ""}`}
                      onClick={() => {
                        props.onCloseNotifications();
                        navigate(`/chat?patientId=${encodeURIComponent(item.patientId)}`);
                      }}
                    >
                      <span>{item.title}</span>
                      <strong>{item.body}</strong>
                      {item.detail ? <em>{item.detail}</em> : null}
                      <small>{item.meta}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
      <NavLink
        to="/perfil"
        className={({ isActive }) => `pro-header-icon-link pro-header-direct-action ${isActive ? "active" : ""}`}
        aria-label={t(props.language, { es: "Perfil", en: "Profile", pt: "Perfil" })}
      >
        <ProHeaderIconUser className="pro-header-svg-icon" />
      </NavLink>
      <NavLink
        to="/ajustes"
        className={({ isActive }) => `pro-header-icon-link pro-header-direct-action ${isActive ? "active" : ""}`}
        aria-label={t(props.language, { es: "Ajustes", en: "Settings", pt: "Configuracoes" })}
      >
        <ProHeaderIconSettings className="pro-header-svg-icon" />
      </NavLink>
      <button
        className="pro-danger pro-header-logout pro-header-direct-action"
        type="button"
        onClick={props.onLogout}
        aria-label={t(props.language, { es: "Salir", en: "Sign out", pt: "Sair" })}
      >
        <ProHeaderIconLogOut className="pro-header-svg-icon pro-header-direct-action-only-mobile" />
        <span className="pro-header-logout-label">
          {t(props.language, { es: "Salir", en: "Sign out", pt: "Sair" })}
        </span>
      </button>

      {isDashboardToolbar ? (
        <div className="pro-header-account-menu" ref={menuRef}>
          <button
            type="button"
            className={`pro-header-icon-link pro-header-menu-trigger${accountMenuOpen ? " active" : ""}`}
            aria-label={t(props.language, { es: "Menú de cuenta", en: "Account menu", pt: "Menu da conta" })}
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
            aria-controls={menuId}
            onClick={toggleAccountMenu}
          >
            <ProHeaderIconMore className="pro-header-svg-icon pro-header-svg-icon--more" />
          </button>
          {accountMenuOpen ? (
            <div id={menuId} className="pro-header-account-dropdown" role="menu">
              <NavLink
                to="/perfil"
                role="menuitem"
                className={({ isActive }) => `pro-header-account-dropdown-item${isActive ? " active" : ""}`}
                onClick={() => setAccountMenuOpen(false)}
              >
                <ProHeaderIconUser className="pro-header-svg-icon pro-header-svg-icon--menu" />
                {t(props.language, { es: "Perfil", en: "Profile", pt: "Perfil" })}
              </NavLink>
              <NavLink
                to="/ajustes"
                role="menuitem"
                className={({ isActive }) => `pro-header-account-dropdown-item${isActive ? " active" : ""}`}
                onClick={() => setAccountMenuOpen(false)}
              >
                <ProHeaderIconSettings className="pro-header-svg-icon pro-header-svg-icon--menu" />
                {t(props.language, { es: "Ajustes", en: "Settings", pt: "Configuracoes" })}
              </NavLink>
              <div className="menu-sep" role="separator" />
              <button
                type="button"
                role="menuitem"
                className="pro-header-account-dropdown-item pro-header-account-dropdown-item--danger"
                onClick={() => {
                  setAccountMenuOpen(false);
                  props.onLogout();
                }}
              >
                <ProHeaderIconLogOut className="pro-header-svg-icon pro-header-svg-icon--menu pro-header-svg-icon--danger" />
                {t(props.language, { es: "Salir", en: "Sign out", pt: "Sair" })}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
