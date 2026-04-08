import {
  type AppLanguage,
  type LocalizedText,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import type { ReactNode, SyntheticEvent } from "react";
import { NavLink } from "react-router-dom";
import type { ProfileTab } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function firstNameOnly(fullName: string | undefined): string {
  const trimmed = (fullName ?? "").trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function IconHome(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9.5 12 4l9 5.5V20a1 1 0 0 1-1 1h-5v-8H9v8H4a1 1 0 0 1-1-1V9.5Z" />
    </svg>
  );
}

function IconSessions(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </svg>
  );
}

function IconChat(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a7 7 0 0 1-7 7H8l-5 3v-3a7 7 0 1 1 18-7Z" />
    </svg>
  );
}

function IconMenu(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function IconAccount(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  );
}

export function PortalNavigation(props: {
  language: AppLanguage;
  sessionEmail?: string;
  sessionFullName?: string;
  unreadMessagesCount: number;
  favoriteCount: number;
  notificationsUnreadCount: number;
  notificationsOpen: boolean;
  notifications: Array<{
    id: string;
    title: string;
    body: string;
    detail: string;
    meta: string;
    unread: boolean;
    professionalId: string;
  }>;
  menuOpen: boolean;
  languageSummary: string;
  currencySummary: string;
  onToggleMenu: () => void;
  onToggleNotifications: () => void;
  onOpenNotificationThread: (professionalId: string) => void;
  onOpenProfileTab: (tab: ProfileTab) => void;
  onOpenPreferences: () => void;
  onLogout: () => void;
  hideSidebar?: boolean;
  patientHeaderAvatarSrc: string | null;
  onPatientAvatarError: (event: SyntheticEvent<HTMLImageElement>) => void;
  children: ReactNode;
}) {
  const mobileFirstName = firstNameOnly(props.sessionFullName);

  return (
    <>
      {!props.hideSidebar ? (
        <aside className="portal-sidebar">
          <div className="portal-brand">
            <img
              className="portal-brand-mark-img"
              src="/brand/motivarcare-mark.png"
              alt="MotivarCare"
              width={396}
              height={352}
            />
            <span className="portal-brand-sub">
              {t(props.language, { es: "Portal Paciente", en: "Patient portal", pt: "Portal do paciente" })}
            </span>
          </div>

          <nav className="portal-sidebar-nav">
            <NavLink className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} end to="/">
              {t(props.language, { es: "Inicio", en: "Home", pt: "Inicio" })}
            </NavLink>
            <NavLink className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} to="/sessions">
              {t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" })}
            </NavLink>
            <NavLink className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} to="/chat">
              <span className="nav-link-with-badge">
                {t(props.language, { es: "Chat", en: "Chat", pt: "Chat" })}
                {props.unreadMessagesCount > 0 ? (
                  <span className="chat-badge-pill" aria-label={t(props.language, { es: "Mensajes nuevos", en: "New messages", pt: "Novas mensagens" })}>
                    {props.unreadMessagesCount > 99 ? "99+" : props.unreadMessagesCount}
                  </span>
                ) : null}
              </span>
            </NavLink>
          </nav>

          <div className="portal-sidebar-foot">
            <p>{props.sessionEmail}</p>
          </div>
        </aside>
      ) : null}

      <div className="portal-main">
        <header className="portal-header">
          <div className="portal-header-greeting">
            <h1 className="portal-header-greeting-desktop">
              {replaceTemplate(
                t(props.language, {
                  es: "Hola, {name}",
                  en: "Hi, {name}",
                  pt: "Ola, {name}"
                }),
                { name: props.sessionFullName ?? "" }
              )}
            </h1>
            <div className="portal-header-greeting-mobile" aria-label={mobileFirstName}>
              {props.patientHeaderAvatarSrc ? (
                <img
                  className="portal-header-patient-avatar"
                  src={props.patientHeaderAvatarSrc}
                  alt=""
                  onError={props.onPatientAvatarError}
                />
              ) : (
                <span className="portal-header-patient-avatar portal-header-patient-avatar--fallback" aria-hidden>
                  {mobileFirstName ? mobileFirstName.charAt(0).toUpperCase() : "?"}
                </span>
              )}
              <span className="portal-header-patient-name">{mobileFirstName}</span>
            </div>
          </div>

          {!props.hideSidebar ? (
            <div className="header-actions">
              <div className="header-actions-cluster">
              <NavLink
                to="/favorites"
                className={({ isActive }) => `header-favorites-link header-icon-link ${isActive ? "active" : ""}`}
                aria-label={t(props.language, { es: "Ver favoritos", en: "View favorites", pt: "Ver favoritos" })}
              >
                <svg className="header-heart-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 21.1 10.3 19.5C5.2 14.9 2 12 2 8.5A4.5 4.5 0 0 1 6.5 4c2 0 3.1.9 3.9 2 .8-1.1 1.9-2 3.9-2A4.5 4.5 0 0 1 18.8 8.5c0 3.5-3.2 6.4-8.3 11L12 21.1Z" />
                </svg>
                {props.favoriteCount > 0 ? <small>{props.favoriteCount}</small> : null}
              </NavLink>
              <div className="notifications-wrap">
                <button
                  type="button"
                  className={`header-icon-link ${props.notificationsOpen ? "active" : ""}`}
                  aria-label={t(props.language, { es: "Ver notificaciones", en: "View notifications", pt: "Ver notificacoes" })}
                  onClick={props.onToggleNotifications}
                >
                  <svg className="header-bell-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3a5 5 0 0 0-5 5v2.7c0 .9-.3 1.8-.8 2.5L4.8 15a1 1 0 0 0 .8 1.6h12.8a1 1 0 0 0 .8-1.6l-1.4-1.8c-.6-.7-.8-1.6-.8-2.5V8a5 5 0 0 0-5-5Z" />
                    <path d="M10 18a2 2 0 0 0 4 0" />
                  </svg>
                  {props.notificationsUnreadCount > 0 ? <small>{props.notificationsUnreadCount > 99 ? "99+" : props.notificationsUnreadCount}</small> : null}
                </button>
                {props.notificationsOpen ? (
                  <div className="notifications-dropdown">
                    <div className="notifications-head">
                      <strong>{t(props.language, { es: "Notificaciones", en: "Notifications", pt: "Notificacoes" })}</strong>
                    </div>
                    <div className="menu-sep" />
                    {props.notifications.length === 0 ? (
                      <p className="notifications-empty">
                        {t(props.language, { es: "Sin novedades por ahora.", en: "No updates for now.", pt: "Sem novidades por agora." })}
                      </p>
                    ) : (
                      <ul className="notifications-list">
                        {props.notifications.slice(0, 8).map((item) => (
                          <li key={item.id}>
                            <button type="button" className={`notification-item ${item.unread ? "unread" : ""}`} onClick={() => props.onOpenNotificationThread(item.professionalId)}>
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
              </div>
              <div className="menu-wrap">
                <button
                  aria-label={t(props.language, { es: "Abrir menú", en: "Open menu", pt: "Abrir menu" })}
                  className="menu-toggle"
                  type="button"
                  onClick={props.onToggleMenu}
                >
                  <IconMenu className="menu-toggle-icon" />
                </button>
                {props.menuOpen ? (
                  <div className="menu-dropdown">
                    <div className="menu-panel-head">
                      <strong>{props.sessionEmail ?? ""}</strong>
                      <span>{props.sessionFullName ?? ""}</span>
                    </div>
                    <div className="menu-sep" />

                    <div
                      className="menu-dropdown-account"
                      role="group"
                      aria-label={t(props.language, {
                        es: "Mi Cuenta",
                        en: "My account",
                        pt: "Minha conta"
                      })}
                    >
                      <button className="menu-item menu-item--account-main" type="button" onClick={() => props.onOpenProfileTab("data")}>
                        {t(props.language, { es: "Mi Cuenta", en: "My account", pt: "Minha conta" })}
                      </button>
                      <button className="menu-item menu-item--account-sub" type="button" onClick={() => props.onOpenProfileTab("cards")}>
                        {t(props.language, { es: "Tarjetas", en: "Cards", pt: "Cartoes" })}
                      </button>
                      <button className="menu-item menu-item--account-sub" type="button" onClick={() => props.onOpenProfileTab("subscription")}>
                        {t(props.language, { es: "Actividad de sesiones", en: "Session activity", pt: "Atividade de sessoes" })}
                      </button>
                      <button className="menu-item menu-item--account-sub" type="button" onClick={() => props.onOpenProfileTab("settings")}>
                        {t(props.language, { es: "Notificaciones", en: "Notification settings", pt: "Notificacoes" })}
                      </button>
                      <button className="menu-item menu-item--account-sub" type="button" onClick={() => props.onOpenProfileTab("support")}>
                        {t(props.language, { es: "Soporte", en: "Support", pt: "Suporte" })}
                      </button>
                    </div>

                    <button className="menu-item menu-item-split" type="button" onClick={props.onOpenPreferences}>
                      <span>{t(props.language, { es: "Idioma y moneda", en: "Language and currency", pt: "Idioma e moeda" })}</span>
                      <small>
                        {props.languageSummary} · {props.currencySummary}
                      </small>
                    </button>

                    <div className="menu-sep" />
                    <button className="menu-item danger" type="button" onClick={props.onLogout}>
                      {t(props.language, { es: "Cerrar sesión", en: "Sign out", pt: "Sair" })}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </header>

        {!props.hideSidebar ? (
          <nav
            className="portal-mobile-nav"
            aria-label={t(props.language, {
              es: "Navegación principal",
              en: "Main navigation",
              pt: "Navegacao principal"
            })}
          >
            <NavLink className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} to="/profile">
              <IconAccount className="mobile-nav-icon" />
              <span className="mobile-nav-label">{t(props.language, { es: "Mi Cuenta", en: "My account", pt: "Minha conta" })}</span>
            </NavLink>
            <NavLink className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} end to="/">
              <IconHome className="mobile-nav-icon" />
              <span className="mobile-nav-label">{t(props.language, { es: "Inicio", en: "Home", pt: "Inicio" })}</span>
            </NavLink>
            <NavLink className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} to="/sessions">
              <IconSessions className="mobile-nav-icon" />
              <span className="mobile-nav-label">{t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" })}</span>
            </NavLink>
            <NavLink className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} to="/chat">
              <span className="mobile-nav-link-inner">
                <IconChat className="mobile-nav-icon" />
                {props.unreadMessagesCount > 0 ? (
                  <span className="chat-badge-pill mobile-nav-badge" aria-label={t(props.language, { es: "Mensajes nuevos", en: "New messages", pt: "Novas mensagens" })}>
                    {props.unreadMessagesCount > 99 ? "99+" : props.unreadMessagesCount}
                  </span>
                ) : null}
              </span>
              <span className="mobile-nav-label">{t(props.language, { es: "Chat", en: "Chat", pt: "Chat" })}</span>
            </NavLink>
          </nav>
        ) : null}
        {props.children}
      </div>
    </>
  );
}
