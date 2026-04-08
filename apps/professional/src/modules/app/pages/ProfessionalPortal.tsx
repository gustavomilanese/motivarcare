import { type MouseEvent, useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import { ProMobileNavIcon } from "../components/ProMobileNavIcon";
import { PORTAL_NAV_GROUP_LABELS, getPortalNavLinks } from "../config/portalNav";
import { usePortalChatThreads } from "../hooks/usePortalChatThreads";
import { buildPatientMessageNotificationItems } from "../lib/portalPatientNotifications";
import { AdminPage } from "./AdminPage";
import { AvailabilityMonthPage } from "./AvailabilityMonthPage";
import { ChatPage } from "./ChatPage";
import { DashboardPage } from "./DashboardPage";
import { IncomePage } from "./IncomePage";
import { PatientsPage } from "./PatientsPage";
import { ProfilePage } from "./ProfilePage";
import { SchedulePage } from "./SchedulePage";
import { SettingsPage } from "./SettingsPage";
import { PROFESSIONAL_CALENDAR_OAUTH_RETURN_PATH_KEY } from "../services/api";
import type { AuthUser, PortalSection } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfessionalPortal(props: {
  token: string;
  user: AuthUser;
  onLogout: () => void;
  language: AppLanguage;
  currency: SupportedCurrency;
  onUserChange: (user: AuthUser) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const links = useMemo(() => getPortalNavLinks(props.language), [props.language]);
  const { threads, unreadMessagesCount } = usePortalChatThreads(props.token);

  const notificationItems = useMemo(
    () => buildPatientMessageNotificationItems(props.language, threads),
    [props.language, threads]
  );

  useEffect(() => {
    if (!notificationsOpen) {
      return;
    }

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [notificationsOpen]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const calendarSync = params.get("calendar_sync");
    if (!calendarSync) {
      return;
    }

    let stored: string | null = null;
    try {
      stored = window.sessionStorage.getItem(PROFESSIONAL_CALENDAR_OAUTH_RETURN_PATH_KEY);
      window.sessionStorage.removeItem(PROFESSIONAL_CALENDAR_OAUTH_RETURN_PATH_KEY);
    } catch {
      // ignore
    }

    const stripQuery = () => navigate({ pathname: location.pathname, search: "" }, { replace: true });

    if (calendarSync !== "connected") {
      stripQuery();
      return;
    }

    let target: string | null = null;
    if (stored === "/ajustes" || stored === "/") {
      target = stored;
    } else if (location.pathname === "/ajustes") {
      target = "/";
    } else {
      stripQuery();
      return;
    }

    if (location.pathname !== target) {
      navigate({ pathname: target, search: "" }, { replace: true });
    } else {
      stripQuery();
    }
  }, [location.pathname, location.search, navigate]);

  const notificationsUnreadCount = notificationItems.filter((item) => item.unread).length;

  const handlePortalNavClick = (target: PortalSection) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (target === "/horarios" && window.location.pathname === "/horarios") {
      event.preventDefault();
      window.dispatchEvent(new CustomEvent("professional:schedule-reset"));
      return;
    }
    if (target === "/agenda/ajustes" && window.location.pathname === "/agenda/ajustes") {
      event.preventDefault();
      window.dispatchEvent(new CustomEvent("professional:schedule-settings-reset"));
    }
  };

  const newMessagesLabel = t(props.language, {
    es: "Mensajes nuevos",
    en: "New messages",
    pt: "Novas mensagens"
  });

  return (
    <div className="pro-shell">
      <aside className="pro-sidebar">
        <div className="pro-brand">
          <img
            className="pro-brand-wordmark"
            src="/brand/motivarcare-wordmark.png"
            alt="MotivarCare"
            width={180}
            height={36}
          />
          <p className="pro-brand-sub">{t(props.language, { es: "Portal profesional", en: "Professional portal", pt: "Portal profissional" })}</p>
        </div>

        <nav className="pro-sidebar-nav">
          {links.flatMap((link, index) => {
            const prevGroup = index > 0 ? links[index - 1]?.group : undefined;
            const showGroupLabel = Boolean(link.group && link.group !== prevGroup);
            const navLink = (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={handlePortalNavClick(link.to)}
                className={({ isActive }) => (isActive ? "pro-link active" : "pro-link")}
                end={link.to === "/"}
              >
                {link.to === "/chat" ? (
                  <span className="pro-nav-link-with-badge">
                    {link.label}
                    {unreadMessagesCount > 0 ? (
                      <span className="pro-chat-badge-pill" aria-label={newMessagesLabel}>
                        {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                      </span>
                    ) : null}
                  </span>
                ) : (
                  link.label
                )}
              </NavLink>
            );

            if (!showGroupLabel || !link.group) {
              return [navLink];
            }

            return [
              <span key={`sidebar-group-${link.group}-${index}`} className="pro-sidebar-nav-group-label">
                {t(props.language, PORTAL_NAV_GROUP_LABELS[link.group])}
              </span>,
              navLink
            ];
          })}
        </nav>

        <div className="pro-sidebar-foot">
          <p>{props.user.email}</p>
        </div>
      </aside>

      <div className="pro-main">
        <header className="pro-header">
          <div>
            <h1>
              {replaceTemplate(
                t(props.language, { es: "Hola, {name}", en: "Hi, {name}", pt: "Ola, {name}" }),
                { name: props.user.fullName }
              )}
            </h1>
          </div>
          <div className="pro-header-actions">
            <NavLink
              to="/perfil"
              className={({ isActive }) => `pro-header-icon-link ${isActive ? "active" : ""}`}
              aria-label={t(props.language, { es: "Perfil", en: "Profile", pt: "Perfil" })}
            >
              <span className="pro-header-icon profile" aria-hidden="true" />
            </NavLink>
            <NavLink
              to="/ajustes"
              className={({ isActive }) => `pro-header-icon-link ${isActive ? "active" : ""}`}
              aria-label={t(props.language, { es: "Ajustes", en: "Settings", pt: "Configuracoes" })}
            >
              <span className="pro-header-icon settings" aria-hidden="true" />
            </NavLink>
            <div className="pro-notifications-wrap">
              <button
                type="button"
                className={`pro-header-icon-link pro-notifications-trigger ${notificationsOpen ? "active" : ""}`}
                aria-label={t(props.language, { es: "Ver notificaciones", en: "View notifications", pt: "Ver notificacoes" })}
                onClick={() => setNotificationsOpen((current) => !current)}
              >
                <svg className="pro-header-bell-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                  <path d="M12 3a5 5 0 0 0-5 5v2.7c0 .9-.3 1.8-.8 2.5L4.8 15a1 1 0 0 0 .8 1.6h12.8a1 1 0 0 0 .8-1.6l-1.4-1.8c-.6-.7-.8-1.6-.8-2.5V8a5 5 0 0 0-5-5Z" />
                  <path d="M10 18a2 2 0 0 0 4 0" />
                </svg>
                {notificationsUnreadCount > 0 ? (
                  <small>{notificationsUnreadCount > 99 ? "99+" : notificationsUnreadCount}</small>
                ) : null}
              </button>
              {notificationsOpen ? (
                <div className="pro-notifications-dropdown">
                  <div className="pro-notifications-head">
                    <strong>{t(props.language, { es: "Notificaciones", en: "Notifications", pt: "Notificacoes" })}</strong>
                  </div>
                  <div className="menu-sep" />
                  {notificationItems.length === 0 ? (
                    <p className="pro-notifications-empty">
                      {t(props.language, { es: "Sin novedades por ahora.", en: "No updates for now.", pt: "Sem novidades por agora." })}
                    </p>
                  ) : (
                    <ul className="pro-notifications-list">
                      {notificationItems.slice(0, 8).map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            className={`pro-notification-item ${item.unread ? "unread" : ""}`}
                            onClick={() => {
                              setNotificationsOpen(false);
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
            <button className="pro-danger pro-header-logout" type="button" onClick={props.onLogout}>
              {t(props.language, { es: "Salir", en: "Sign out", pt: "Sair" })}
            </button>
          </div>
        </header>

        <nav
          className="pro-mobile-nav"
          aria-label={t(props.language, {
            es: "Navegación principal",
            en: "Main navigation",
            pt: "Navegacao principal"
          })}
        >
          {links.map((link) => (
            <NavLink
              key={`mobile-${link.to}`}
              to={link.to}
              onClick={handlePortalNavClick(link.to)}
              className={({ isActive }) => (isActive ? "pro-mobile-link active" : "pro-mobile-link")}
              end={link.to === "/"}
            >
              {link.to === "/chat" ? (
                <>
                  <span className="pro-mobile-link-inner">
                    <ProMobileNavIcon section={link.to} />
                    {unreadMessagesCount > 0 ? (
                      <span className="pro-chat-badge-pill" aria-label={newMessagesLabel}>
                        {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                      </span>
                    ) : null}
                  </span>
                  <span className="pro-mobile-nav-label">{link.label}</span>
                </>
              ) : (
                <>
                  <ProMobileNavIcon section={link.to} />
                  <span className="pro-mobile-nav-label">{link.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <main className="pro-main-content">
          <Routes>
            <Route path="/" element={<DashboardPage token={props.token} language={props.language} currency={props.currency} user={props.user} />} />
            <Route path="/horarios" element={<SchedulePage token={props.token} language={props.language} mode="work" />} />
            <Route path="/agenda/ajustes" element={<SchedulePage token={props.token} language={props.language} mode="settings" />} />
            <Route path="/disponibilidad" element={<AvailabilityMonthPage token={props.token} language={props.language} />} />
            <Route path="/pacientes" element={<PatientsPage token={props.token} language={props.language} />} />
            <Route path="/chat" element={<ChatPage token={props.token} user={props.user} language={props.language} />} />
            <Route path="/ingresos" element={<IncomePage token={props.token} language={props.language} currency={props.currency} />} />
            <Route path="/admin" element={<AdminPage token={props.token} language={props.language} />} />
            <Route
              path="/perfil"
              element={<ProfilePage token={props.token} user={props.user} language={props.language} onUserChange={props.onUserChange} />}
            />
            <Route path="/ajustes" element={<SettingsPage token={props.token} onLogout={props.onLogout} language={props.language} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
