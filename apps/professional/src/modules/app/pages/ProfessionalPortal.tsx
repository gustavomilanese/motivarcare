import { type MouseEvent, useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { type AppLanguage, type LocalizedText, type SupportedCurrency, textByLanguage } from "@therapy/i18n-config";
import { ProMobileNavIcon } from "../components/ProMobileNavIcon";
import { ProPortalChromeProvider } from "../components/ProPortalChromeContext";
import { ProPortalHeaderActions } from "../components/ProPortalHeaderActions";
import { PORTAL_NAV_GROUP_LABELS, getPortalNavLinks } from "../config/portalNav";
import { usePortalChatThreads } from "../hooks/usePortalChatThreads";
import { buildPatientMessageNotificationItems } from "../lib/portalPatientNotifications";
import { AdminPage } from "./AdminPage";
import { AvailabilityMonthPage } from "./AvailabilityMonthPage";
import { ChatPage } from "./ChatPage";
import { DashboardPage } from "./DashboardPage";
import { IncomePage } from "./IncomePage";
import { PatientDetailPage } from "./PatientDetailPage";
import { PatientsPage } from "./PatientsPage";
import { ProfilePage } from "./ProfilePage";
import { ScheduleHubPage } from "./ScheduleHubPage";
import { SchedulePage } from "./SchedulePage";
import { SettingsPage } from "./SettingsPage";
import { TreatmentReportsPage } from "./TreatmentReportsPage";
import { PROFESSIONAL_CALENDAR_OAUTH_RETURN_PATH_KEY } from "../services/api";
import type { AuthUser, PortalSection } from "../types";
import { ProfessionalPortalGuidedTour } from "../components/ProfessionalPortalGuidedTour";

function portalNavTourKey(to: PortalSection): string | undefined {
  if (to === "/") {
    return "dashboard";
  }
  if (to === "/horarios") {
    return "agenda";
  }
  if (to === "/pacientes") {
    return "pacientes";
  }
  if (to === "/chat") {
    return "chat";
  }
  if (to === "/ingresos") {
    return "ingresos";
  }
  return undefined;
}

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
  const { threads, unreadMessagesCount, reloadThreads } = usePortalChatThreads(props.token);

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
    /** Paridad con paciente: al volver con Calendar conectado, el dashboard puede pulsar la fila de Meet. */
    const searchAfterCalendarOk = (pathname: string) => (pathname === "/" ? "?meet_hint=1" : "");

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

    const nextSearch = searchAfterCalendarOk(target);
    if (location.pathname !== target) {
      navigate({ pathname: target, search: nextSearch }, { replace: true });
    } else {
      navigate({ pathname: location.pathname, search: searchAfterCalendarOk(location.pathname) }, { replace: true });
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

  const headerActionsProps = {
    language: props.language,
    notificationsOpen,
    notificationsUnreadCount,
    notificationItems,
    onToggleNotifications: () => setNotificationsOpen((current) => !current),
    onCloseNotifications: () => setNotificationsOpen(false),
    onLogout: props.onLogout
  };

  const portalHeaderActions = (
    <ProPortalHeaderActions {...headerActionsProps} variant="dashboard-toolbar" />
  );

  return (
    <div className="pro-shell">
      <ProfessionalPortalGuidedTour language={props.language} sessionUserId={props.user.id} token={props.token} />
      <aside className="pro-sidebar" data-tour="pro-tour-sidebar">
        <div className="pro-brand">
          <img
            className="pro-brand-mark-img"
            src="/brand/motivarcare-mark.png"
            alt="MotivarCare"
            width={396}
            height={352}
          />
          <span className="pro-brand-sub">
            {t(props.language, { es: "Portal Profesional", en: "Professional portal", pt: "Portal profissional" })}
          </span>
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
                data-tour-nav={portalNavTourKey(link.to)}
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

      <div className="pro-main pro-main--immersive pro-main--dashboard-home">
        <nav
          className="pro-mobile-nav"
          data-tour="pro-tour-mobile-nav"
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
              data-tour-nav={portalNavTourKey(link.to)}
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
          <ProPortalChromeProvider language={props.language} headerActions={portalHeaderActions}>
            <Routes>
            <Route
              path="/"
              element={
                <DashboardPage
                  token={props.token}
                  language={props.language}
                  currency={props.currency}
                  user={props.user}
                />
              }
            />
            <Route path="/horarios" element={<ScheduleHubPage language={props.language} />}>
              <Route index element={<SchedulePage token={props.token} language={props.language} mode="work" inScheduleHub />} />
              <Route path="disponibilidad" element={<AvailabilityMonthPage token={props.token} language={props.language} />} />
            </Route>
            <Route path="/disponibilidad" element={<Navigate to="/horarios/disponibilidad" replace />} />
            <Route path="/agenda/ajustes" element={<SchedulePage token={props.token} language={props.language} mode="settings" />} />
            <Route
              path="/pacientes/:patientId"
              element={<PatientDetailPage token={props.token} language={props.language} currency={props.currency} />}
            />
            <Route path="/pacientes" element={<PatientsPage token={props.token} language={props.language} />} />
            <Route path="/reportes" element={<TreatmentReportsPage token={props.token} language={props.language} />} />
            <Route
              path="/chat"
              element={
                <ChatPage
                  token={props.token}
                  user={props.user}
                  language={props.language}
                  portalThreads={threads}
                  reloadPortalThreads={reloadThreads}
                />
              }
            />
            <Route path="/ingresos" element={<IncomePage token={props.token} language={props.language} user={props.user} />} />
            <Route path="/admin" element={<AdminPage token={props.token} language={props.language} />} />
            <Route
              path="/perfil"
              element={<ProfilePage token={props.token} user={props.user} language={props.language} onUserChange={props.onUserChange} />}
            />
            <Route path="/ajustes" element={<SettingsPage token={props.token} onLogout={props.onLogout} language={props.language} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </ProPortalChromeProvider>
        </main>
      </div>
    </div>
  );
}
