import { type MouseEvent, useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { type AppLanguage, type LocalizedText, type SupportedCurrency, textByLanguage } from "@therapy/i18n-config";
import { ProMobileNavIcon } from "../components/ProMobileNavIcon";
import { ProPortalChromeProvider } from "../components/ProPortalChromeContext";
import { ProPortalHeaderActions } from "../components/ProPortalHeaderActions";
import {
  PortalPreferencesModal,
  PROFESSIONAL_LANGUAGE_CHOICES
} from "../components/PortalPreferencesModal";
import { ProHeaderIconLocale, ProHeaderIconUser } from "../components/ProHeaderIcons";
import { ProfessionalListingVisibilityControl } from "../components/ProfessionalListingVisibilityControl";
import { getPortalNavLinks } from "../config/portalNav";
import { useProfessionalListingVisibility } from "../hooks/useProfessionalListingVisibility";
import { usePortalChatThreads } from "../hooks/usePortalChatThreads";
import { buildPatientMessageNotificationItems } from "../lib/portalPatientNotifications";
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

function currencySymbolOnly(currency: SupportedCurrency): string {
  switch (currency) {
    case "USD":
      return "$";
    case "EUR":
      return "EUR";
    case "GBP":
      return "GBP";
    case "BRL":
      return "R$";
    case "ARS":
      return "$";
    default:
      return currency;
  }
}

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
  onLanguageChange: (language: AppLanguage) => void;
  onCurrencyChange: (currency: SupportedCurrency) => void;
  onUserChange: (user: AuthUser) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [railNavLocked, setRailNavLocked] = useState(false);
  const links = useMemo(() => getPortalNavLinks(props.language), [props.language]);
  const { threads, unreadMessagesCount, reloadThreads } = usePortalChatThreads(props.token);
  const languageSummary =
    PROFESSIONAL_LANGUAGE_CHOICES.find((item) => item.value === props.language)?.nativeLabel ?? "Espanol";
  const currencySummary = currencySymbolOnly(props.currency);

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
  const listingVisibility = useProfessionalListingVisibility(props.token);

  const collapseRailAfterNav = () => {
    setRailNavLocked(true);
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }
  };

  const handlePortalNavClick = (target: PortalSection) => (event: MouseEvent<HTMLAnchorElement>) => {
    collapseRailAfterNav();
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

  const openPreferences = () => {
    setNotificationsOpen(false);
    setPreferencesOpen(true);
  };

  const headerActionsProps = {
    language: props.language,
    notificationsOpen,
    notificationsUnreadCount,
    notificationItems,
    languageSummary,
    currencySummary,
    onToggleNotifications: () => setNotificationsOpen((current) => !current),
    onCloseNotifications: () => setNotificationsOpen(false),
    onOpenPreferences: openPreferences,
    onLogout: props.onLogout,
    listingVisibility:
      listingVisibility.ready && listingVisibility.visible !== null && listingVisibility.registrationApproval
        ? (
            <ProfessionalListingVisibilityControl
              language={props.language}
              token={props.token}
              professionalProfileId={props.user.professionalProfileId}
              visible={listingVisibility.visible}
              registrationApproval={listingVisibility.registrationApproval}
              onVisibleChange={listingVisibility.setVisible}
            />
          )
        : null
  };

  const portalHeaderActions = (
    <ProPortalHeaderActions {...headerActionsProps} variant="dashboard-toolbar" />
  );

  return (
    <div className="pro-shell">
      <ProfessionalPortalGuidedTour language={props.language} sessionUserId={props.user.id} token={props.token} />
      <aside
        className={`pro-sidebar${railNavLocked ? " is-nav-locked" : ""}`}
        aria-label={t(props.language, {
          es: "Menú de la aplicación",
          en: "App menu",
          pt: "Menu do aplicativo"
        })}
        onMouseLeave={() => {
          setRailNavLocked(false);
          const active = document.activeElement;
          if (active instanceof HTMLElement && active.closest(".pro-sidebar")) {
            active.blur();
          }
        }}
      >
        <div className="pro-sidebar-edge" aria-hidden="true" />
        <div className="pro-sidebar-panel" data-tour="pro-tour-sidebar">
          <div className="pro-sidebar-brand">
            <span className="pro-sidebar-brand-mark-wrap">
              <img
                className="pro-brand-mark-img"
                src="/brand/motivarcare-mark.png"
                alt="MotivarCare"
                width={396}
                height={352}
              />
            </span>
            <span className="pro-sidebar-rail-label">
              {t(props.language, { es: "Portal Profesional", en: "Professional portal", pt: "Portal profissional" })}
            </span>
          </div>

          <nav className="pro-sidebar-nav">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={handlePortalNavClick(link.to)}
                className={({ isActive }) => `pro-sidebar-rail-link${isActive ? " is-active" : ""}`}
                end={link.to === "/"}
                data-tour-nav={portalNavTourKey(link.to)}
              >
                {link.to === "/chat" ? (
                  <span className="pro-sidebar-rail-icon-wrap">
                    <ProMobileNavIcon section={link.to} className="pro-sidebar-rail-icon" />
                    {unreadMessagesCount > 0 ? (
                      <span className="pro-sidebar-rail-badge" aria-label={newMessagesLabel}>
                        {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <ProMobileNavIcon section={link.to} className="pro-sidebar-rail-icon" />
                )}
                <span className="pro-sidebar-rail-label">{link.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="pro-sidebar-foot-stack">
            <button
              type="button"
              className="pro-sidebar-rail-foot"
              onClick={() => {
                collapseRailAfterNav();
                openPreferences();
              }}
            >
              <span className="pro-sidebar-rail-foot-icon-wrap" aria-hidden="true">
                <ProHeaderIconLocale className="pro-sidebar-rail-icon" />
              </span>
              <span className="pro-sidebar-rail-foot-copy">
                <span className="pro-sidebar-rail-foot-name">
                  {t(props.language, { es: "Idioma y moneda", en: "Language and currency", pt: "Idioma e moeda" })}
                </span>
                <span className="pro-sidebar-rail-foot-email">
                  {languageSummary} · {currencySummary}
                </span>
              </span>
            </button>
            <div className="pro-sidebar-rail-foot pro-sidebar-rail-foot--identity">
              <span className="pro-sidebar-rail-foot-icon-wrap" aria-hidden="true">
                <ProHeaderIconUser className="pro-sidebar-rail-icon" />
              </span>
              <span className="pro-sidebar-rail-foot-copy">
                {props.user.fullName ? (
                  <span className="pro-sidebar-rail-foot-name">{props.user.fullName}</span>
                ) : null}
                {props.user.email ? <span className="pro-sidebar-rail-foot-email">{props.user.email}</span> : null}
              </span>
            </div>
          </div>
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
            <Route path="/admin" element={<Navigate to="/perfil#pro-profile-bank" replace />} />
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

      <PortalPreferencesModal
        open={preferencesOpen}
        language={props.language}
        currency={props.currency}
        languageChoices={PROFESSIONAL_LANGUAGE_CHOICES}
        onClose={() => setPreferencesOpen(false)}
        onLanguageChange={props.onLanguageChange}
        onCurrencyChange={props.onCurrencyChange}
      />
    </div>
  );
}
