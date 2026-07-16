import {
  type AppLanguage,
  type LocalizedText,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import { avatarInitialsFromNameParts } from "@therapy/types";
import { type ChangeEvent, type ReactNode, type SyntheticEvent, useEffect, useId, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useDiaryPortalToolbarMountElement } from "../../emotional-diary/context/DiaryPortalToolbarMount";
import { PortalHelpLegalMenuSection } from "./PortalHelpLegalLinks";
import { PATIENT_FAVORITES_ENABLED } from "../constants";
import { useMobilePortal } from "../hooks/useMobilePortal";
import { kindLabel } from "../notifications/buildPortalNotifications";
import { notificationKindVisual } from "../notifications/notificationKindVisual";
import type { PortalNotificationItem } from "../notifications/portalNotificationTypes";
import type { ProfileTab } from "../types";
import { NotificationItemActionsMenu } from "./NotificationItemActionsMenu";
import { requestPatientDashboardTour } from "./DashboardGuidedTour";
import type { Market } from "@therapy/types";

/** Showcase «Profesionales» en sidebar y sheet mobile (reactivar cuando esté listo). */
const PATIENT_PROFESSIONALS_NAV_ENABLED = false;

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
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

function IconProfessionals(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M14.5 20a4.5 4.5 0 0 1 6.5-4" />
    </svg>
  );
}

function IconNotes(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3h11A1.5 1.5 0 0 1 19 4.5V20l-3-2-3 2-3-2-3 2V4.5Z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

function IconExercises(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21a9 9 0 1 0-9-9" />
      <path d="M12 8v4l2.5 2.5" />
      <path d="M3 12h2.5" />
    </svg>
  );
}

function IconMusic(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function IconMore(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="6" cy="6" r="1.75" />
      <circle cx="12" cy="6" r="1.75" />
      <circle cx="6" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
    </svg>
  );
}

function IconPencilTiny() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"
        stroke="#475569"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PortalNavigation(props: {
  language: AppLanguage;
  sessionEmail?: string;
  sessionFullName?: string;
  sessionFirstName?: string;
  sessionLastName?: string;
  unreadMessagesCount: number;
  favoriteCount: number;
  notificationsUnreadCount: number;
  notificationsOpen: boolean;
  notifications: PortalNotificationItem[];
  menuOpen: boolean;
  languageSummary: string;
  currencySummary: string;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onToggleNotifications: () => void;
  onCloseNotifications: () => void;
  onOpenNotification: (item: PortalNotificationItem) => void;
  onDismissNotification: (item: PortalNotificationItem, event?: { stopPropagation: () => void }) => void;
  onMuteNotificationKind: (item: PortalNotificationItem) => void;
  onDisableSessionReminders?: () => void;
  onOpenNotificationSettings: () => void;
  onOpenNotificationThread: (professionalId: string) => void;
  onOpenProfileTab: (tab: ProfileTab) => void;
  onOpenPreferences: () => void;
  onLogout: () => void;
  hideSidebar?: boolean;
  patientHeaderAvatarSrc: string | null;
  onPatientAvatarError: (event: SyntheticEvent<HTMLImageElement>) => void;
  authToken: string | null;
  patientHeaderAvatarUploadBusy: boolean;
  patientHeaderAvatarError?: string | null;
  onPatientHeaderAvatarFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  residencyCountry: string | null;
  patientMarket: Market;
  children: ReactNode;
}) {
  const mobileFirstName = firstNameOnly(props.sessionFullName);
  const mobileAvatarInitials = avatarInitialsFromNameParts(
    props.sessionFirstName ?? "",
    props.sessionLastName ?? "",
    props.sessionFullName ?? ""
  );
  const avatarInputId = useId();
  const location = useLocation();
  const navigate = useNavigate();
  const diaryImmersive = location.pathname.startsWith("/diario");
  const diaryHomeImmersive = location.pathname === "/diario";
  const diarySubpageImmersive = diaryImmersive && !diaryHomeImmersive;
  const dashboardHomeImmersive = location.pathname === "/";
  const sessionsHomeImmersive = location.pathname === "/sessions";
  const wellbeingRelaxImmersive = location.pathname === "/bienestar/musica";
  const chatImmersive = location.pathname === "/chat";
  const immersivePortalHome =
    diaryImmersive || dashboardHomeImmersive || sessionsHomeImmersive || wellbeingRelaxImmersive || chatImmersive;
  const [diaryHeroToolbarMount, setDiaryHeroToolbarMount] = useState<HTMLElement | null>(null);
  const diaryPortalToolbarMount = useDiaryPortalToolbarMountElement();
  const [dashboardHeroToolbarMount, setDashboardHeroToolbarMount] = useState<HTMLElement | null>(null);
  const [sessionsHeroToolbarMount, setSessionsHeroToolbarMount] = useState<HTMLElement | null>(null);
  const [wellbeingRelaxToolbarMount, setWellbeingRelaxToolbarMount] = useState<HTMLElement | null>(null);
  const [chatHeroToolbarMount, setChatHeroToolbarMount] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!diaryHomeImmersive) {
      setDiaryHeroToolbarMount(null);
      return;
    }
    let cancelled = false;
    let frames = 0;
    const resolveMount = () => {
      if (cancelled) return;
      const mount = document.getElementById("diary-hero-toolbar-mount");
      if (mount) {
        setDiaryHeroToolbarMount(mount);
        return;
      }
      if (frames < 40) {
        frames += 1;
        requestAnimationFrame(resolveMount);
      }
    };
    resolveMount();
    return () => {
      cancelled = true;
    };
  }, [diaryHomeImmersive, location.pathname]);

  useLayoutEffect(() => {
    if (!dashboardHomeImmersive) {
      setDashboardHeroToolbarMount(null);
      return;
    }
    let cancelled = false;
    let frames = 0;
    const resolveMount = () => {
      if (cancelled) return;
      const mount = document.getElementById("dashboard-hero-toolbar-mount");
      if (mount) {
        setDashboardHeroToolbarMount(mount);
        return;
      }
      if (frames < 40) {
        frames += 1;
        requestAnimationFrame(resolveMount);
      }
    };
    resolveMount();
    return () => {
      cancelled = true;
    };
  }, [dashboardHomeImmersive, location.pathname]);

  useLayoutEffect(() => {
    if (!sessionsHomeImmersive) {
      setSessionsHeroToolbarMount(null);
      return;
    }
    let cancelled = false;
    let frames = 0;
    const resolveMount = () => {
      if (cancelled) return;
      const mount = document.getElementById("sessions-hero-toolbar-mount");
      if (mount) {
        setSessionsHeroToolbarMount(mount);
        return;
      }
      if (frames < 40) {
        frames += 1;
        requestAnimationFrame(resolveMount);
      }
    };
    resolveMount();
    return () => {
      cancelled = true;
    };
  }, [sessionsHomeImmersive, location.pathname]);

  useLayoutEffect(() => {
    if (!wellbeingRelaxImmersive) {
      setWellbeingRelaxToolbarMount(null);
      return;
    }
    let cancelled = false;
    let frames = 0;
    const resolveMount = () => {
      if (cancelled) return;
      const mount = document.getElementById("wellbeing-relax-toolbar-mount");
      if (mount) {
        setWellbeingRelaxToolbarMount(mount);
        return;
      }
      if (frames < 40) {
        frames += 1;
        requestAnimationFrame(resolveMount);
      }
    };
    resolveMount();
    return () => {
      cancelled = true;
    };
  }, [wellbeingRelaxImmersive, location.pathname]);

  useLayoutEffect(() => {
    if (!chatImmersive) {
      setChatHeroToolbarMount(null);
      return;
    }
    let cancelled = false;
    let frames = 0;
    const resolveMount = () => {
      if (cancelled) return;
      const mount = document.getElementById("chat-hero-toolbar-mount");
      if (mount) {
        setChatHeroToolbarMount(mount);
        return;
      }
      if (frames < 40) {
        frames += 1;
        requestAnimationFrame(resolveMount);
      }
    };
    resolveMount();
    return () => {
      cancelled = true;
    };
  }, [chatImmersive, location.pathname]);

  const avatarVisual = (
    <span className="portal-header-avatar-edit-visual">
      {props.patientHeaderAvatarSrc ? (
        <img
          className="portal-header-patient-avatar"
          src={props.patientHeaderAvatarSrc}
          alt=""
          onError={props.onPatientAvatarError}
        />
      ) : (
        <span className="portal-header-patient-avatar portal-header-patient-avatar--fallback" aria-hidden>
          {mobileAvatarInitials || "?"}
        </span>
      )}
      <span className="portal-header-avatar-edit-badge" aria-hidden>
        <IconPencilTiny />
      </span>
    </span>
  );

  const avatarSrLabel = t(props.language, {
    es: "Cambiar foto de perfil",
    en: "Change profile photo",
    pt: "Alterar foto do perfil"
  });

  /** Saludo en hero de Inicio — solo web desktop (no mobile ni otras secciones). */
  const dashboardHomeGreeting = replaceTemplate(
    t(props.language, {
      es: "Hola, {name}",
      en: "Hi, {name}",
      pt: "Olá, {name}"
    }),
    { name: mobileFirstName || t(props.language, { es: "paciente", en: "there", pt: "paciente" }) }
  );

  const isMobilePortal = useMobilePortal();
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [openNotificationMenuId, setOpenNotificationMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!props.notificationsOpen) {
      setOpenNotificationMenuId(null);
    }
  }, [props.notificationsOpen]);

  useEffect(() => {
    if (!mobileMoreOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMoreOpen]);
  const mobileSecondaryActive =
    (PATIENT_PROFESSIONALS_NAV_ENABLED && location.pathname.startsWith("/profesionales")) ||
    location.pathname.startsWith("/ejercicios") ||
    location.pathname.startsWith("/bienestar/musica") ||
    location.pathname.startsWith("/profile");

  useEffect(() => {
    setMobileMoreOpen(false);
  }, [location.pathname]);

  function renderDashboardHomeGreeting() {
    return (
      <div className="portal-immersive-mobile-greet">
        <span className="portal-immersive-mobile-greet-label">{dashboardHomeGreeting}</span>
      </div>
    );
  }

  function renderAccountMenuDropdown() {
    return (
      <>
        <button
          type="button"
          className="menu-dropdown-backdrop"
          aria-label={t(props.language, { es: "Cerrar menú", en: "Close menu", pt: "Fechar menu" })}
          onClick={props.onCloseMenu}
        />
        <div
          className={`menu-dropdown${isMobilePortal ? " menu-dropdown--account-sheet" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label={t(props.language, { es: "Menú de cuenta", en: "Account menu", pt: "Menu da conta" })}
        >
          <div className="menu-panel-head">
            <div className="menu-panel-head-copy">
              <strong>{props.sessionEmail ?? ""}</strong>
              <span>{props.sessionFullName ?? ""}</span>
            </div>
            <button
              type="button"
              className="menu-dropdown-close"
              aria-label={t(props.language, { es: "Cerrar menú", en: "Close menu", pt: "Fechar menu" })}
              onClick={props.onCloseMenu}
            >
              ×
            </button>
          </div>

          <section
            className="menu-dropdown-group menu-dropdown-account"
            aria-label={t(props.language, { es: "Cuenta", en: "Account", pt: "Conta" })}
          >
            <p className="menu-dropdown-section-label">
              {t(props.language, { es: "Cuenta", en: "Account", pt: "Conta" })}
            </p>
            <button className="menu-item menu-item--sub" type="button" onClick={() => props.onOpenProfileTab("data")}>
              {t(props.language, { es: "Datos personales", en: "Personal details", pt: "Dados pessoais" })}
            </button>
            <button className="menu-item menu-item--sub" type="button" onClick={() => props.onOpenProfileTab("subscription")}>
              {t(props.language, { es: "Actividad de sesiones", en: "Session activity", pt: "Atividade de sessoes" })}
            </button>
            <button className="menu-item menu-item--sub" type="button" onClick={() => props.onOpenProfileTab("cards")}>
              {t(props.language, { es: "Tarjetas", en: "Cards", pt: "Cartoes" })}
            </button>
          </section>

          <section
            className="menu-dropdown-group menu-dropdown-settings"
            aria-label={t(props.language, { es: "Preferencias", en: "Preferences", pt: "Preferencias" })}
          >
            <p className="menu-dropdown-section-label">
              {t(props.language, { es: "Preferencias", en: "Preferences", pt: "Preferencias" })}
            </p>
            <button className="menu-item menu-item--sub menu-item--value" type="button" onClick={props.onOpenPreferences}>
              <span>{t(props.language, { es: "Idioma y moneda", en: "Language and currency", pt: "Idioma e moeda" })}</span>
              <small>
                {props.languageSummary} · {props.currencySummary}
              </small>
            </button>
            <button className="menu-item menu-item--sub" type="button" onClick={props.onOpenNotificationSettings}>
              {t(props.language, { es: "Notificaciones", en: "Notifications", pt: "Notificacoes" })}
            </button>
          </section>

          <PortalHelpLegalMenuSection
            language={props.language}
            residencyCountry={props.residencyCountry}
            patientMarket={props.patientMarket}
            onNavigate={props.onCloseMenu}
            onOpenSupport={() => props.onOpenProfileTab("support")}
          />

          <button className="menu-item menu-item--danger" type="button" onClick={props.onLogout}>
            {t(props.language, { es: "Cerrar sesión", en: "Sign out", pt: "Sair" })}
          </button>
          {isMobilePortal ? <div className="menu-dropdown-sheet-foot" aria-hidden="true" /> : null}
        </div>
      </>
    );
  }

  function renderNotificationsDropdown() {
    const unreadInList = props.notifications.filter((item) => item.unread).length;

    return (
      <div
        className={`notifications-dropdown${isMobilePortal ? " notifications-dropdown--mobile-sheet" : " notifications-dropdown--portaled"}`}
        role="dialog"
        aria-modal={isMobilePortal ? "true" : undefined}
        aria-label={t(props.language, { es: "Notificaciones", en: "Notifications", pt: "Notificacoes" })}
      >
        <div className="notifications-head">
          <div className="notifications-head-copy">
            <span className="notifications-head-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3a5 5 0 0 0-5 5v2.7c0 .9-.3 1.8-.8 2.5L4.8 15a1 1 0 0 0 .8 1.6h12.8a1 1 0 0 0 .8-1.6l-1.4-1.8c-.6-.7-.8-1.6-.8-2.5V8a5 5 0 0 0-5-5Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
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
                  strokeWidth="1.8"
                />
                <path
                  d="M19.4 13.5a7.4 7.4 0 0 0 .1-3l1.5-1.2-1.5-2.6-1.8.5a7.5 7.5 0 0 0-2.6-1.5l-.5-1.8H9.5l-.5 1.8a7.5 7.5 0 0 0-2.6 1.5l-1.8-.5L2.1 9.3l1.5 1.2a7.4 7.4 0 0 0 0 3L2.1 14.7l1.5 2.6 1.8-.5a7.5 7.5 0 0 0 2.6 1.5l.5 1.8h5l.5-1.8a7.5 7.5 0 0 0 2.6-1.5l1.8.5 1.5-2.6-1.5-1.2Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className="notifications-head-close"
              aria-label={t(props.language, { es: "Cerrar notificaciones", en: "Close notifications", pt: "Fechar notificacoes" })}
              onClick={props.onCloseNotifications}
            >
              ×
            </button>
          </div>
        </div>

        <div className="notifications-body">
          {props.notifications.length === 0 ? (
            <div className="notifications-empty-box" role="status">
              <span className="notifications-empty-icon" aria-hidden="true">
                ✨
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
                        className={`notification-item ${item.unread ? "unread" : ""}`}
                        onClick={() => props.onOpenNotification(item)}
                        style={
                          {
                            "--notification-kind": visual.accent,
                            "--notification-kind-soft": visual.accentSoft
                          } as React.CSSProperties
                        }
                      >
                        <span className="notification-item-icon" aria-hidden="true">
                          {visual.icon}
                        </span>
                        <span className="notification-item-content">
                          <span className="notification-item-top">
                            <span className="notification-item-kind">{kindLabel(props.language, item.kind)}</span>
                            {item.meta ? <small className="notification-item-meta">{item.meta}</small> : null}
                          </span>
                          <strong className="notification-item-title">{item.title}</strong>
                          {item.body ? <em className="notification-item-body">{item.body}</em> : null}
                          {item.detail ? <em className="notification-item-detail">{item.detail}</em> : null}
                        </span>
                      </button>
                      <NotificationItemActionsMenu
                        language={props.language}
                        item={item}
                        open={openNotificationMenuId === item.id}
                        onToggle={() =>
                          setOpenNotificationMenuId((current) => (current === item.id ? null : item.id))
                        }
                        onClose={() => setOpenNotificationMenuId(null)}
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

  function renderNotificationsBackdrop() {
    return (
      <button
        type="button"
        className="notifications-dropdown-backdrop"
        aria-label={t(props.language, { es: "Cerrar notificaciones", en: "Close notifications", pt: "Fechar notificacoes" })}
        onClick={props.onCloseNotifications}
      />
    );
  }

  function renderHeaderActions(onImmersiveToolbar = false) {
    if (props.hideSidebar) {
      return null;
    }

    const showDashboardHomeGreeting =
      onImmersiveToolbar && dashboardHomeImmersive && !isMobilePortal;

    return (
      <div
        className={`header-actions${onImmersiveToolbar ? " header-actions--immersive-toolbar" : ""}${onImmersiveToolbar && !showDashboardHomeGreeting ? " header-actions--toolbar-only" : ""}`}
      >
        {showDashboardHomeGreeting ? renderDashboardHomeGreeting() : null}
        <div className="header-actions-cluster">
          {PATIENT_FAVORITES_ENABLED ? (
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
          ) : null}
          <div className={`notifications-wrap${props.notificationsOpen ? " notifications-wrap--open" : ""}`}>
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
              <>
                {createPortal(renderNotificationsBackdrop(), document.body)}
                {createPortal(renderNotificationsDropdown(), document.body)}
              </>
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
          {props.menuOpen
            ? isMobilePortal
              ? createPortal(renderAccountMenuDropdown(), document.body)
              : renderAccountMenuDropdown()
            : null}
        </div>
      </div>
    );
  }

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

          <nav className="portal-sidebar-nav" data-tour="patient-tour-sidebar">
            <NavLink className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} end to="/">
              {t(props.language, { es: "Inicio", en: "Home", pt: "Inicio" })}
            </NavLink>
            <NavLink className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} to="/sessions">
              {t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" })}
            </NavLink>
            <NavLink className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} to="/diario" end={false}>
              {t(props.language, { es: "Diario emocional", en: "Emotional diary", pt: "Diário emocional" })}
            </NavLink>
            {PATIENT_PROFESSIONALS_NAV_ENABLED ? (
              <NavLink className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} to="/profesionales">
                {t(props.language, { es: "Profesionales", en: "Professionals", pt: "Profissionais" })}
              </NavLink>
            ) : null}
            <NavLink className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} to="/ejercicios">
              {t(props.language, { es: "Ejercicios", en: "Exercises", pt: "Exercícios" })}
            </NavLink>
            <NavLink className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} to="/bienestar/musica">
              {t(props.language, { es: "Música relajante", en: "Relaxing music", pt: "Música relaxante" })}
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
            <button
              type="button"
              className="portal-sidebar-tour"
              onClick={() => {
                const goHome = location.pathname !== "/";
                if (goHome) {
                  navigate("/");
                }
                window.setTimeout(
                  () => requestPatientDashboardTour({ force: true }),
                  goHome ? 420 : 60
                );
              }}
            >
              <span className="portal-sidebar-tour-label">
                {t(props.language, {
                  es: "Tour MotivarCare",
                  en: "MotivarCare Tour",
                  pt: "Tour MotivarCare"
                })}
              </span>
            </button>
            <div className="portal-sidebar-foot-identity">
              {props.sessionFullName?.trim() ? (
                <p className="portal-sidebar-foot-name">{props.sessionFullName.trim()}</p>
              ) : null}
              {props.sessionEmail ? (
                <p className="portal-sidebar-foot-email">{props.sessionEmail}</p>
              ) : null}
            </div>
          </div>
        </aside>
      ) : null}

      <div
        className={`portal-main${diaryHomeImmersive ? " portal-main--diary-home" : ""}${dashboardHomeImmersive ? " portal-main--dashboard-home" : ""}${sessionsHomeImmersive ? " portal-main--sessions-home" : ""}${wellbeingRelaxImmersive ? " portal-main--wellbeing-relax" : ""}${chatImmersive ? " portal-main--chat" : ""}`}
      >
        {!immersivePortalHome ? (
          <header className="portal-header">
            <div
              className={`portal-header-greeting${props.patientHeaderAvatarUploadBusy ? " portal-header-greeting--avatar-busy" : ""}`}
              aria-busy={props.patientHeaderAvatarUploadBusy || undefined}
            >
              <input
                id={avatarInputId}
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={!props.authToken || props.patientHeaderAvatarUploadBusy}
                onChange={props.onPatientHeaderAvatarFileChange}
              />

              <div className="portal-header-desktop-greet">
                <label htmlFor={avatarInputId} className="portal-header-avatar-edit portal-header-avatar-edit--desktop">
                  {avatarVisual}
                  <span className="sr-only">{avatarSrLabel}</span>
                </label>
              </div>

              <div className="portal-header-greeting-mobile">
                <label htmlFor={avatarInputId} className="portal-header-avatar-edit portal-header-avatar-edit--mobile">
                  {avatarVisual}
                  <span className="sr-only">{avatarSrLabel}</span>
                </label>
              </div>

              {props.patientHeaderAvatarError ? (
                <p className="portal-header-avatar-error" role="status">
                  {props.patientHeaderAvatarError}
                </p>
              ) : null}
            </div>

            {renderHeaderActions()}
          </header>
        ) : null}

        {!props.hideSidebar ? (
          <>
            {mobileMoreOpen ? (
              <div
                className="portal-mobile-more-backdrop"
                role="presentation"
                onClick={() => setMobileMoreOpen(false)}
              />
            ) : null}
            <div
              id="portal-mobile-more-sheet"
              className={`portal-mobile-more-sheet ${mobileMoreOpen ? "portal-mobile-more-sheet--open" : ""}`}
              role="dialog"
              aria-modal="true"
              aria-hidden={!mobileMoreOpen}
              aria-label={t(props.language, { es: "Explorar el portal", en: "Explore the portal", pt: "Explorar o portal" })}
            >
              <div className="portal-mobile-more-sheet-head">
                <div className="portal-mobile-more-sheet-head-copy">
                  <h2>{t(props.language, { es: "Explorar", en: "Explore", pt: "Explorar" })}</h2>
                  <p>
                    {PATIENT_PROFESSIONALS_NAV_ENABLED
                      ? t(props.language, {
                          es: "Profesionales, bienestar y tu cuenta.",
                          en: "Therapists, wellbeing and your account.",
                          pt: "Profissionais, bem-estar e sua conta."
                        })
                      : t(props.language, {
                          es: "Bienestar y tu cuenta.",
                          en: "Wellbeing and your account.",
                          pt: "Bem-estar e sua conta."
                        })}
                  </p>
                </div>
                <button
                  type="button"
                  className="portal-mobile-more-close"
                  aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
                  onClick={() => setMobileMoreOpen(false)}
                >
                  ×
                </button>
              </div>
              <nav className="portal-mobile-more-links" aria-label={t(props.language, { es: "Más secciones", en: "More sections", pt: "Mais seções" })}>
                {PATIENT_PROFESSIONALS_NAV_ENABLED ? (
                  <NavLink className="portal-mobile-more-link" to="/profesionales" onClick={() => setMobileMoreOpen(false)}>
                    <IconProfessionals className="portal-mobile-more-link-icon" />
                    <span>{t(props.language, { es: "Profesionales", en: "Professionals", pt: "Profissionais" })}</span>
                  </NavLink>
                ) : null}
                <NavLink className="portal-mobile-more-link" to="/ejercicios" onClick={() => setMobileMoreOpen(false)}>
                  <IconExercises className="portal-mobile-more-link-icon" />
                  <span>{t(props.language, { es: "Ejercicios", en: "Exercises", pt: "Exercícios" })}</span>
                </NavLink>
                <NavLink className="portal-mobile-more-link" to="/bienestar/musica" onClick={() => setMobileMoreOpen(false)}>
                  <IconMusic className="portal-mobile-more-link-icon" />
                  <span>{t(props.language, { es: "Música relajante", en: "Relaxing music", pt: "Música relaxante" })}</span>
                </NavLink>
                <NavLink className="portal-mobile-more-link" to="/profile" onClick={() => setMobileMoreOpen(false)}>
                  <IconAccount className="portal-mobile-more-link-icon" />
                  <span>{t(props.language, { es: "Mi cuenta", en: "My account", pt: "Minha conta" })}</span>
                </NavLink>
              </nav>
            </div>
            <nav
              className="portal-mobile-nav"
              aria-label={t(props.language, {
                es: "Navegación principal",
                en: "Main navigation",
                pt: "Navegacao principal"
              })}
            >
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
              <NavLink className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} to="/diario" end={false}>
                <IconNotes className="mobile-nav-icon" />
                <span className="mobile-nav-label">{t(props.language, { es: "Diario", en: "Diary", pt: "Diário" })}</span>
              </NavLink>
              <button
                type="button"
                className={`mobile-nav-link mobile-nav-link--more ${mobileSecondaryActive ? "active" : ""}`}
                aria-expanded={mobileMoreOpen}
                aria-controls="portal-mobile-more-sheet"
                onClick={() => setMobileMoreOpen((open) => !open)}
              >
                <IconMore className="mobile-nav-icon" />
                <span className="mobile-nav-label">{t(props.language, { es: "Más", en: "More", pt: "Mais" })}</span>
              </button>
            </nav>
          </>
        ) : null}
        {props.children}
        {diaryHomeImmersive && diaryHeroToolbarMount
          ? createPortal(renderHeaderActions(true), diaryHeroToolbarMount)
          : null}
        {diarySubpageImmersive && diaryPortalToolbarMount
          ? createPortal(renderHeaderActions(true), diaryPortalToolbarMount)
          : null}
        {dashboardHomeImmersive && dashboardHeroToolbarMount
          ? createPortal(renderHeaderActions(true), dashboardHeroToolbarMount)
          : null}
        {sessionsHomeImmersive && sessionsHeroToolbarMount
          ? createPortal(renderHeaderActions(true), sessionsHeroToolbarMount)
          : null}
        {wellbeingRelaxImmersive && wellbeingRelaxToolbarMount
          ? createPortal(renderHeaderActions(true), wellbeingRelaxToolbarMount)
          : null}
        {chatImmersive && chatHeroToolbarMount
          ? createPortal(renderHeaderActions(true), chatHeroToolbarMount)
          : null}
      </div>
    </>
  );
}
