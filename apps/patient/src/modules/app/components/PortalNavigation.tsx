import {
  type AppLanguage,
  type LocalizedText,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import type { ProfileTab } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function PortalNavigation(props: {
  language: AppLanguage;
  sessionEmail?: string;
  sessionFullName?: string;
  unreadMessagesCount: number;
  favoriteCount: number;
  menuOpen: boolean;
  languageSummary: string;
  currencySummary: string;
  onToggleMenu: () => void;
  onOpenProfileTab: (tab: ProfileTab) => void;
  onOpenPreferences: () => void;
  onLogout: () => void;
  hideSidebar?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {!props.hideSidebar ? (
        <aside className="portal-sidebar">
          <div className="portal-brand">
            <span className="portal-brand-mark">M</span>
            <div>
              <strong>Motivarte</strong>
              <p>{t(props.language, { es: "Portal paciente", en: "Patient portal", pt: "Portal do paciente" })}</p>
            </div>
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
                {props.unreadMessagesCount > 0 ? <span className="chat-badge-dot" aria-label="Nuevos mensajes" /> : null}
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
          <div>
            <h1>
              {replaceTemplate(
                t(props.language, {
                  es: "Hola, {name}",
                  en: "Hi, {name}",
                  pt: "Ola, {name}"
                }),
                { name: props.sessionFullName ?? "" }
              )}
            </h1>
          </div>

          <div className="header-actions">
            <NavLink
              to="/favorites"
              className={({ isActive }) => `header-icon-link ${isActive ? "active" : ""}`}
              aria-label={t(props.language, { es: "Ver favoritos", en: "View favorites", pt: "Ver favoritos" })}
            >
              <svg className="header-heart-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 21.1 10.3 19.5C5.2 14.9 2 12 2 8.5A4.5 4.5 0 0 1 6.5 4c2 0 3.1.9 3.9 2 .8-1.1 1.9-2 3.9-2A4.5 4.5 0 0 1 18.8 8.5c0 3.5-3.2 6.4-8.3 11L12 21.1Z" />
              </svg>
              {props.favoriteCount > 0 ? <small>{props.favoriteCount}</small> : null}
            </NavLink>
            <div className="menu-wrap">
              <button
                aria-label={t(props.language, { es: "Abrir menu", en: "Open menu", pt: "Abrir menu" })}
                className="menu-toggle"
                type="button"
                onClick={props.onToggleMenu}
              >
                &#9776;
              </button>
              {props.menuOpen ? (
                <div className="menu-dropdown">
                  <div className="menu-panel-head">
                    <strong>{props.sessionEmail ?? ""}</strong>
                    <span>{props.sessionFullName ?? ""}</span>
                  </div>
                  <div className="menu-sep" />

                  <button className="menu-item" type="button" onClick={() => props.onOpenProfileTab("data")}>
                    {t(props.language, { es: "Informacion de cuenta", en: "Account information", pt: "Informacoes da conta" })}
                  </button>
                  <button className="menu-item" type="button" onClick={() => props.onOpenProfileTab("cards")}>
                    {t(props.language, { es: "Tarjetas", en: "Cards", pt: "Cartoes" })}
                  </button>
                  <button className="menu-item" type="button" onClick={() => props.onOpenProfileTab("subscription")}>
                    {t(props.language, { es: "Actividad de sesiones", en: "Session activity", pt: "Atividade de sessoes" })}
                  </button>
                  <button className="menu-item" type="button" onClick={() => props.onOpenProfileTab("settings")}>
                    {t(props.language, { es: "Notificaciones", en: "Notification settings", pt: "Notificacoes" })}
                  </button>
                  <button className="menu-item" type="button" onClick={() => props.onOpenProfileTab("support")}>
                    {t(props.language, { es: "Soporte", en: "Support", pt: "Suporte" })}
                  </button>

                  <button className="menu-item menu-item-split" type="button" onClick={props.onOpenPreferences}>
                    <span>{t(props.language, { es: "Idioma y moneda", en: "Language and currency", pt: "Idioma e moeda" })}</span>
                    <small>
                      {props.languageSummary} · {props.currencySummary}
                    </small>
                  </button>

                  <div className="menu-sep" />
                  <button className="menu-item danger" type="button" onClick={props.onLogout}>
                    {t(props.language, { es: "Cerrar sesion", en: "Sign out", pt: "Sair" })}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {!props.hideSidebar ? (
          <nav
            className="portal-mobile-nav"
            aria-label={t(props.language, {
              es: "Navegacion principal mobile",
              en: "Main mobile navigation",
              pt: "Navegacao principal mobile"
            })}
          >
            <NavLink className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} end to="/">
              {t(props.language, { es: "Inicio", en: "Home", pt: "Inicio" })}
            </NavLink>
            <NavLink className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} to="/sessions">
              {t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" })}
            </NavLink>
            <NavLink className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} to="/chat">
              <span className="nav-link-with-badge">
                {t(props.language, { es: "Chat", en: "Chat", pt: "Chat" })}
                {props.unreadMessagesCount > 0 ? <span className="chat-badge-dot" aria-label="Nuevos mensajes" /> : null}
              </span>
            </NavLink>
          </nav>
        ) : null}
        {props.children}
      </div>
    </>
  );
}
