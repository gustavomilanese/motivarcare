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
import type { PortalNotificationItem } from "../notifications/portalNotificationTypes";
import type { ProfileTab } from "../types";
import { NotificationsBackdrop, NotificationsDropdown } from "./NotificationsDropdown";
import { requestPatientDashboardTour } from "../../home/components/GuidedTour";
import type { Market } from "@therapy/types";
import {
  PATIENT_HOME_VARIANT_EVENT,
  readPatientHomeVariant,
  setPatientHomeVariant,
  type PatientHomeVariant
} from "../../home/lib/patientHomeVariant";
import { CalmSidebar } from "../../home/calm/CalmSidebar";
import { CalmSupportNote } from "../../home/calm/CalmSupportNote";

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

function scrollPortalToTop(behavior: ScrollBehavior = "smooth") {
  window.scrollTo({ top: 0, left: 0, behavior });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function IconHome(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6h-6v6H5.5A1.5 1.5 0 0 1 4 19z" />
    </svg>
  );
}

function IconSessions(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
      <circle cx="12" cy="15" r="1.6" />
    </svg>
  );
}

function IconChat(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 5.5h15v10h-9l-4.5 4v-4H4.5z" />
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
      <circle cx="12" cy="8.5" r="4" />
      <path d="M4.5 20.5c.8-4 3.9-6.3 7.5-6.3s6.7 2.3 7.5 6.3" />
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
      <path d="M6 3.5h10.5A2.5 2.5 0 0 1 19 6v14.5H7.5A2.5 2.5 0 0 1 5 18V4.5a1 1 0 0 1 1-1z" />
      <path d="M5 18a2.5 2.5 0 0 1 2.5-2.5H19M9 8h6M9 11.5h4" />
    </svg>
  );
}

function IconLeaf(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 19c0-8 5-13.5 14-14-.3 9-5.8 14-14 14z" />
      <path d="M5 19c3-3.5 6-6 9.5-8" />
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

function IconTourMaca(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
      <path d="M16.5 4.5 18 3M7.5 4.5 6 3M19.5 10h2M2.5 10h2" />
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
  /** Chrome tipo marketplace (rail + top bar) en Inicio next y secciones del menú. */
  homeMlChrome?: boolean;
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
  const diaryImmersive = location.pathname.startsWith("/diario") && !props.homeMlChrome;
  const diaryHomeImmersive = location.pathname === "/diario" && !props.homeMlChrome;
  const diarySubpageImmersive = diaryImmersive && !diaryHomeImmersive;
  const dashboardHomeImmersive = location.pathname === "/" && !props.homeMlChrome;
  const homeMlFloatingToolbar = Boolean(props.homeMlChrome) && location.pathname === "/";
  const sessionsHomeImmersive = location.pathname === "/sessions" && !props.homeMlChrome;
  const assignedProImmersive = location.pathname === "/mi-profesional";
  const matchingImmersive =
    (location.pathname === "/matching" || location.pathname === "/favorites") && !props.homeMlChrome;
  const exercisesHomeImmersive = location.pathname.startsWith("/ejercicios") && !props.homeMlChrome;
  const wellbeingRelaxImmersive = location.pathname === "/bienestar/musica" && !props.homeMlChrome;
  const chatImmersive = location.pathname === "/chat";
  const immersivePortalHome =
    diaryImmersive ||
    dashboardHomeImmersive ||
    homeMlFloatingToolbar ||
    sessionsHomeImmersive ||
    assignedProImmersive ||
    matchingImmersive ||
    exercisesHomeImmersive ||
    wellbeingRelaxImmersive ||
    chatImmersive ||
    Boolean(props.homeMlChrome);
  const [diaryHeroToolbarMount, setDiaryHeroToolbarMount] = useState<HTMLElement | null>(null);
  const diaryPortalToolbarMount = useDiaryPortalToolbarMountElement();
  const [dashboardHeroToolbarMount, setDashboardHeroToolbarMount] = useState<HTMLElement | null>(null);
  const [dashboardHomeChromeEpoch, setDashboardHomeChromeEpoch] = useState(0);
  const [calmPickNav, setCalmPickNav] = useState(() => document.body.dataset.patientHome === "pick");
  const [sessionsHeroToolbarMount, setSessionsHeroToolbarMount] = useState<HTMLElement | null>(null);
  const [assignedProToolbarMount, setAssignedProToolbarMount] = useState<HTMLElement | null>(null);
  const [wellbeingRelaxToolbarMount, setWellbeingRelaxToolbarMount] = useState<HTMLElement | null>(null);
  const [wellbeingHeroToolbarMount, setWellbeingHeroToolbarMount] = useState<HTMLElement | null>(null);
  const [chatHeroToolbarMount, setChatHeroToolbarMount] = useState<HTMLElement | null>(null);
  const [homeMlRailNavLocked, setHomeMlRailNavLocked] = useState(false);
  const [homeVariant, setHomeVariant] = useState<PatientHomeVariant>(() => readPatientHomeVariant());
  useEffect(() => {
    const sync = () => setHomeVariant(readPatientHomeVariant());
    window.addEventListener(PATIENT_HOME_VARIANT_EVENT, sync);
    return () => window.removeEventListener(PATIENT_HOME_VARIANT_EVENT, sync);
  }, []);
  const calmAppNav = homeVariant === "classic" && !props.homeMlChrome && !calmPickNav;

  useEffect(() => {
    if (location.pathname !== "/") {
      return;
    }
    scrollPortalToTop("auto");
  }, [location.pathname]);

  function goPathToTop(target: string, options?: { prefix?: boolean }) {
    const pathname = location.pathname;
    const onTarget = options?.prefix
      ? pathname === target || pathname.startsWith(`${target}/`)
      : pathname === target;
    if (onTarget) {
      scrollPortalToTop("smooth");
      return;
    }
    requestAnimationFrame(() => {
      scrollPortalToTop("auto");
    });
  }

  function goHomeToTop() {
    goPathToTop("/");
  }

  function goSessionsToTop() {
    goPathToTop("/sessions");
  }

  function closeMobileMoreAndGoToTop(target: string, options?: { prefix?: boolean }) {
    setMobileMoreOpen(false);
    goPathToTop(target, options);
  }

  useLayoutEffect(() => {
    if (!diaryImmersive) {
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
  }, [diaryImmersive, location.pathname]);

  useEffect(() => {
    if (!dashboardHomeImmersive && !homeMlFloatingToolbar) {
      return undefined;
    }
    const bump = () => setDashboardHomeChromeEpoch((current) => current + 1);
    window.addEventListener(PATIENT_HOME_VARIANT_EVENT, bump);
    window.addEventListener("mc-patient-home-surface", bump);
    return () => {
      window.removeEventListener(PATIENT_HOME_VARIANT_EVENT, bump);
      window.removeEventListener("mc-patient-home-surface", bump);
    };
  }, [dashboardHomeImmersive, homeMlFloatingToolbar]);

  useEffect(() => {
    const sync = () => setCalmPickNav(document.body.dataset.patientHome === "pick");
    sync();
    window.addEventListener("mc-patient-home-surface", sync);
    return () => window.removeEventListener("mc-patient-home-surface", sync);
  }, []);

  useLayoutEffect(() => {
    if (!dashboardHomeImmersive && !homeMlFloatingToolbar && !matchingImmersive) {
      setDashboardHeroToolbarMount(null);
      return;
    }
    let cancelled = false;
    let frames = 0;
    const resolveMount = () => {
      if (cancelled) return;
      const mount = document.getElementById("dashboard-hero-toolbar-mount");
      if (mount && mount.isConnected) {
        setDashboardHeroToolbarMount(mount);
        return;
      }
      if (frames < 40) {
        frames += 1;
        requestAnimationFrame(resolveMount);
      } else {
        setDashboardHeroToolbarMount(null);
      }
    };
    setDashboardHeroToolbarMount(null);
    resolveMount();
    return () => {
      cancelled = true;
    };
  }, [
    dashboardHomeImmersive,
    homeMlFloatingToolbar,
    matchingImmersive,
    location.pathname,
    dashboardHomeChromeEpoch,
    calmPickNav
  ]);
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
    if (!assignedProImmersive) {
      setAssignedProToolbarMount(null);
      return;
    }
    let cancelled = false;
    let frames = 0;
    const resolveMount = () => {
      if (cancelled) return;
      const mount = document.getElementById("assigned-pro-toolbar-mount");
      if (mount && mount.isConnected) {
        setAssignedProToolbarMount(mount);
        return;
      }
      if (frames < 40) {
        frames += 1;
        requestAnimationFrame(resolveMount);
      } else {
        setAssignedProToolbarMount(null);
      }
    };
    setAssignedProToolbarMount(null);
    resolveMount();
    return () => {
      cancelled = true;
    };
  }, [assignedProImmersive, location.pathname]);

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
    if (!exercisesHomeImmersive) {
      setWellbeingHeroToolbarMount(null);
      return;
    }
    let cancelled = false;
    let frames = 0;
    const resolveMount = () => {
      if (cancelled) return;
      const mount = document.getElementById("wellbeing-hero-toolbar-mount");
      if (mount) {
        setWellbeingHeroToolbarMount(mount);
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
  }, [exercisesHomeImmersive, location.pathname]);

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

  function renderAccountMenuDropdown(options?: { portaledDesktop?: boolean; homeMlDrawer?: boolean }) {
    const portaledDesktop = Boolean(options?.portaledDesktop);
    const homeMlDrawer = Boolean(options?.homeMlDrawer);
    return (
      <>
        <button
          type="button"
          className={`menu-dropdown-backdrop${portaledDesktop || homeMlDrawer ? " menu-dropdown-backdrop--portaled" : ""}${homeMlDrawer ? " menu-dropdown-backdrop--home-ml" : ""}`}
          aria-label={t(props.language, { es: "Cerrar menú", en: "Close menu", pt: "Fechar menu" })}
          onClick={props.onCloseMenu}
        />
        <div
          className={`menu-dropdown${isMobilePortal ? " menu-dropdown--account-sheet" : ""}${portaledDesktop ? " menu-dropdown--portaled" : ""}${homeMlDrawer ? " menu-dropdown--home-ml-drawer" : ""}`}
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

          <button
            className="menu-item menu-item--sub menu-item--dev-home"
            type="button"
            onClick={() => {
              const next = homeVariant === "next" ? "classic" : "next";
              setPatientHomeVariant(next);
              props.onCloseMenu();
              navigate("/", { replace: true });
            }}
          >
            {homeVariant === "classic"
              ? t(props.language, {
                  es: "Inicio marketplace",
                  en: "Marketplace home",
                  pt: "Início marketplace"
                })
              : t(props.language, {
                  es: "Volver al inicio",
                  en: "Back to home",
                  pt: "Voltar ao início"
                })}
          </button>

          <button className="menu-item menu-item--danger" type="button" onClick={props.onLogout}>
            {t(props.language, { es: "Cerrar sesión", en: "Sign out", pt: "Sair" })}
          </button>
          {isMobilePortal ? <div className="menu-dropdown-sheet-foot" aria-hidden="true" /> : null}
        </div>
      </>
    );
  }

  function renderNotificationsPortal() {
    if (!props.notificationsOpen) {
      return null;
    }
    return (
      <>
        {createPortal(
          <NotificationsBackdrop language={props.language} onClose={props.onCloseNotifications} />,
          document.body
        )}
        {createPortal(
          <NotificationsDropdown
            language={props.language}
            isMobileSheet={isMobilePortal}
            notifications={props.notifications}
            onClose={props.onCloseNotifications}
            onOpenNotification={props.onOpenNotification}
            onDismissNotification={props.onDismissNotification}
            onMuteNotificationKind={props.onMuteNotificationKind}
            onDisableSessionReminders={props.onDisableSessionReminders}
            onOpenNotificationSettings={props.onOpenNotificationSettings}
          />,
          document.body
        )}
      </>
    );
  }

  function renderHeaderActions(onImmersiveToolbar = false) {
    if (props.hideSidebar && !props.homeMlChrome) {
      return null;
    }

    const showDashboardHomeGreeting =
      onImmersiveToolbar && dashboardHomeImmersive && !isMobilePortal;

    return (
      <div
        className={`header-actions${calmAppNav || calmPickNav ? " portal-account-tools" : ""}${onImmersiveToolbar ? " header-actions--immersive-toolbar" : ""}${onImmersiveToolbar && !showDashboardHomeGreeting ? " header-actions--toolbar-only" : ""}`}
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
              <svg className="header-bell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" />
                <path d="M10 20.5a2 2 0 0 0 4 0" />
              </svg>
              {props.notificationsUnreadCount > 0 ? <small>{props.notificationsUnreadCount > 99 ? "99+" : props.notificationsUnreadCount}</small> : null}
            </button>
            {renderNotificationsPortal()}
          </div>
        </div>
        <div className="menu-wrap">
          <button
            aria-label={t(props.language, { es: "Abrir menú", en: "Open menu", pt: "Abrir menu" })}
            className="menu-toggle"
            type="button"
            onClick={props.onToggleMenu}
          >
            {calmAppNav ? (
              <>
                <span className="calm-user-mark" aria-hidden="true">
                  {(mobileAvatarInitials || mobileFirstName || "?").slice(0, 1)}
                </span>
                {mobileFirstName ? <span className="calm-user-name">{mobileFirstName}</span> : null}
                <svg className="calm-user-caret" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m7 10 5 5 5-5" />
                </svg>
              </>
            ) : (
              <IconMenu className="menu-toggle-icon" />
            )}
          </button>
          {props.menuOpen
            ? isMobilePortal || onImmersiveToolbar
              ? createPortal(
                  renderAccountMenuDropdown({ portaledDesktop: onImmersiveToolbar && !isMobilePortal }),
                  document.body
                )
              : renderAccountMenuDropdown()
            : null}
        </div>
      </div>
    );
  }

  function renderHomeMlChrome() {
    const railLinkClass = ({ isActive }: { isActive: boolean }) =>
      `portal-home-ml-rail-link${isActive ? " is-active" : ""}`;
    const railName = props.sessionFullName?.trim() || "";
    const railEmail = props.sessionEmail?.trim() || "";
    const hasRailIdentity = Boolean(railName || railEmail);

    function collapseHomeMlRailAfterNav() {
      setHomeMlRailNavLocked(true);
      const active = document.activeElement;
      if (active instanceof HTMLElement) {
        active.blur();
      }
    }

    return (
      <>
        <aside
          className={`portal-home-ml-rail${homeMlRailNavLocked ? " is-nav-locked" : ""}`}
          aria-label={t(props.language, { es: "Menú de la aplicación", en: "App menu", pt: "Menu do aplicativo" })}
          onMouseLeave={() => {
            setHomeMlRailNavLocked(false);
            const active = document.activeElement;
            if (active instanceof HTMLElement && active.closest(".portal-home-ml-rail")) {
              active.blur();
            }
          }}
        >
          <div className="portal-home-ml-rail-edge" aria-hidden="true" />
          <div className="portal-home-ml-rail-panel" data-tour="patient-tour-sidebar">
            <nav className="portal-home-ml-rail-nav">
              <NavLink
                className={railLinkClass}
                end
                to="/"
                onClick={() => {
                  goHomeToTop();
                  collapseHomeMlRailAfterNav();
                }}
              >
                <IconHome className="portal-home-ml-rail-icon" />
                <span className="portal-home-ml-rail-label">{t(props.language, { es: "Inicio", en: "Home", pt: "Inicio" })}</span>
              </NavLink>
              <NavLink
                className={railLinkClass}
                to="/sessions"
                onClick={() => {
                  goSessionsToTop();
                  collapseHomeMlRailAfterNav();
                }}
              >
                <IconSessions className="portal-home-ml-rail-icon" />
                <span className="portal-home-ml-rail-label">{t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" })}</span>
              </NavLink>
              <NavLink className={railLinkClass} to="/chat" onClick={collapseHomeMlRailAfterNav}>
                <span className="portal-home-ml-rail-icon-wrap">
                  <IconChat className="portal-home-ml-rail-icon" />
                  {props.unreadMessagesCount > 0 ? (
                    <span className="portal-home-ml-rail-badge" aria-hidden="true">
                      {props.unreadMessagesCount > 99 ? "99+" : props.unreadMessagesCount}
                    </span>
                  ) : null}
                </span>
                <span className="portal-home-ml-rail-label">
                  {t(props.language, { es: "Chat", en: "Chat", pt: "Chat" })}
                </span>
              </NavLink>
              <NavLink className={railLinkClass} to="/diario" end={false} onClick={collapseHomeMlRailAfterNav}>
                <IconNotes className="portal-home-ml-rail-icon" />
                <span className="portal-home-ml-rail-label">{t(props.language, { es: "Diario", en: "Diary", pt: "Diario" })}</span>
              </NavLink>
              <NavLink className={railLinkClass} to="/ejercicios" onClick={collapseHomeMlRailAfterNav}>
                <IconExercises className="portal-home-ml-rail-icon" />
                <span className="portal-home-ml-rail-label">{t(props.language, { es: "Ejercicios", en: "Exercises", pt: "Exercicios" })}</span>
              </NavLink>
              <NavLink className={railLinkClass} to="/bienestar/musica" onClick={collapseHomeMlRailAfterNav}>
                <IconMusic className="portal-home-ml-rail-icon" />
                <span className="portal-home-ml-rail-label">{t(props.language, { es: "Música", en: "Music", pt: "Musica" })}</span>
              </NavLink>
            </nav>
            <div className="portal-home-ml-rail-foot-stack">
              <button
                type="button"
                className="portal-home-ml-rail-tour"
                onClick={() => {
                  collapseHomeMlRailAfterNav();
                  const goHome = location.pathname !== "/";
                  if (goHome) {
                    navigate("/");
                  }
                  window.setTimeout(
                    () => requestPatientDashboardTour({ force: true }),
                    goHome ? 420 : 60
                  );
                }}
                aria-label={t(props.language, {
                  es: "Tour MotivarCare con Maca",
                  en: "MotivarCare tour with Maca",
                  pt: "Tour MotivarCare com a Maca"
                })}
              >
                <span className="portal-home-ml-rail-foot-icon-wrap" aria-hidden="true">
                  <IconTourMaca className="portal-home-ml-rail-icon" />
                </span>
                <span className="portal-home-ml-rail-foot-copy portal-home-ml-rail-tour-copy">
                  <span className="portal-home-ml-rail-foot-name">
                    {t(props.language, {
                      es: "Tour con Maca",
                      en: "Tour with Maca",
                      pt: "Tour com a Maca"
                    })}
                  </span>
                  <span className="portal-home-ml-rail-foot-email">
                    {t(props.language, {
                      es: "Recorrido guiado del portal",
                      en: "Guided walkthrough of the portal",
                      pt: "Percurso guiado do portal"
                    })}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="portal-home-ml-rail-foot"
                onClick={() => {
                  collapseHomeMlRailAfterNav();
                  props.onOpenProfileTab("data");
                }}
                aria-label={
                  hasRailIdentity
                    ? [railName, railEmail].filter(Boolean).join(", ")
                    : t(props.language, { es: "Mi cuenta", en: "My account", pt: "Minha conta" })
                }
              >
                <span className="portal-home-ml-rail-foot-icon-wrap" aria-hidden="true">
                  <IconAccount className="portal-home-ml-rail-icon" />
                </span>
                {hasRailIdentity ? (
                  <span className="portal-home-ml-rail-foot-copy">
                    {railName ? <span className="portal-home-ml-rail-foot-name">{railName}</span> : null}
                    {railEmail ? <span className="portal-home-ml-rail-foot-email">{railEmail}</span> : null}
                  </span>
                ) : null}
              </button>
            </div>
          </div>
        </aside>

        <header className="portal-home-ml-bar" data-tour="patient-tour-home-ml-chrome">
          <div className="portal-home-ml-lead">
            <NavLink to="/" className="portal-home-ml-brand" end onClick={goHomeToTop}>
            <img
              className="portal-home-ml-brand-mark"
              src="/brand/motivarcare-mark.png"
              alt=""
              width={40}
              height={36}
            />
            <span className="portal-home-ml-brand-text">MotivarCare</span>
          </NavLink>
          </div>

          <nav className="portal-home-ml-nav" aria-label={t(props.language, { es: "Secciones", en: "Sections", pt: "Secoes" })}>
            <NavLink
              className={({ isActive }) => `portal-home-ml-link${isActive ? " is-active" : ""}`}
              end
              to="/"
              onClick={goHomeToTop}
            >
              {t(props.language, { es: "Inicio", en: "Home", pt: "Inicio" })}
            </NavLink>
            <NavLink
              className={({ isActive }) => `portal-home-ml-link${isActive ? " is-active" : ""}`}
              to="/sessions"
              onClick={goSessionsToTop}
            >
              {t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" })}
            </NavLink>
            <NavLink className={({ isActive }) => `portal-home-ml-link${isActive ? " is-active" : ""}`} to="/chat">
              <span className="nav-link-with-badge">
                {t(props.language, { es: "Chat", en: "Chat", pt: "Chat" })}
                {props.unreadMessagesCount > 0 ? (
                  <span className="chat-badge-pill" aria-label={t(props.language, { es: "Mensajes nuevos", en: "New messages", pt: "Novas mensagens" })}>
                    {props.unreadMessagesCount > 99 ? "99+" : props.unreadMessagesCount}
                  </span>
                ) : null}
              </span>
            </NavLink>
            <NavLink className={({ isActive }) => `portal-home-ml-link${isActive ? " is-active" : ""}`} to="/diario" end={false}>
              {t(props.language, { es: "Diario", en: "Diary", pt: "Diario" })}
            </NavLink>
            <NavLink className={({ isActive }) => `portal-home-ml-link${isActive ? " is-active" : ""}`} to="/ejercicios">
              {t(props.language, { es: "Ejercicios", en: "Exercises", pt: "Exercicios" })}
            </NavLink>
            <NavLink className={({ isActive }) => `portal-home-ml-link${isActive ? " is-active" : ""}`} to="/bienestar/musica">
              {t(props.language, { es: "Música", en: "Music", pt: "Musica" })}
            </NavLink>
          </nav>

          <div className="portal-home-ml-actions">
            <div className={`notifications-wrap${props.notificationsOpen ? " notifications-wrap--open" : ""}`}>
              <button
                type="button"
                className={`portal-home-ml-icon-btn ${props.notificationsOpen ? "is-active" : ""}`}
                aria-label={t(props.language, { es: "Ver notificaciones", en: "View notifications", pt: "Ver notificacoes" })}
                onClick={props.onToggleNotifications}
              >
                <svg className="header-bell-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3a5 5 0 0 0-5 5v2.7c0 .9-.3 1.8-.8 2.5L4.8 15a1 1 0 0 0 .8 1.6h12.8a1 1 0 0 0 .8-1.6l-1.4-1.8c-.6-.7-.8-1.6-.8-2.5V8a5 5 0 0 0-5-5Z" />
                  <path d="M10 18a2 2 0 0 0 4 0" />
                </svg>
                {props.notificationsUnreadCount > 0 ? (
                  <small>{props.notificationsUnreadCount > 99 ? "99+" : props.notificationsUnreadCount}</small>
                ) : null}
              </button>
              {renderNotificationsPortal()}
            </div>
            <button
              type="button"
              className={`portal-home-ml-account-btn${props.menuOpen ? " is-open" : ""}`}
              aria-expanded={props.menuOpen}
              aria-haspopup="dialog"
              onClick={props.onToggleMenu}
            >
              {t(props.language, { es: "Cuenta", en: "Account", pt: "Conta" })}
              <span className="portal-home-ml-account-chevron" aria-hidden="true">
                {props.menuOpen ? "▲" : "▼"}
              </span>
            </button>
          </div>
          {props.menuOpen
            ? createPortal(renderAccountMenuDropdown({ homeMlDrawer: true }), document.body)
            : null}
        </header>
      </>
    );
  }

  return (
    <>
      {!props.hideSidebar && calmAppNav && !isMobilePortal ? (
        <CalmSidebar language={props.language} unreadMessagesCount={props.unreadMessagesCount} />
      ) : !props.hideSidebar ? (
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
            <NavLink
              className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
              end
              to="/"
              onClick={goHomeToTop}
            >
              {t(props.language, { es: "Inicio", en: "Home", pt: "Inicio" })}
            </NavLink>
            <NavLink
              className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
              to="/sessions"
              onClick={goSessionsToTop}
            >
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
          </nav>

          <div className="portal-sidebar-foot">
            {location.pathname === "/" && !props.homeMlChrome ? (
              <CalmSupportNote language={props.language} />
            ) : null}
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
              <img src="/brand/ds/maca.svg" alt="" width="28" height="28" />
              <span className="portal-sidebar-tour-label">
                {t(props.language, {
                  es: "Tour con Maca",
                  en: "Tour with Maca",
                  pt: "Tour com a Maca"
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
        className={`portal-main${diaryHomeImmersive ? " portal-main--diary-home" : ""}${dashboardHomeImmersive || matchingImmersive ? " portal-main--dashboard-home" : ""}${props.homeMlChrome ? " portal-main--home-ml" : ""}${sessionsHomeImmersive ? " portal-main--sessions-home" : ""}${exercisesHomeImmersive ? " portal-main--exercises-home" : ""}${wellbeingRelaxImmersive ? " portal-main--wellbeing-relax" : ""}${chatImmersive ? " portal-main--chat" : ""}`}
      >
        {props.homeMlChrome ? renderHomeMlChrome() : null}
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
                  <NavLink
                    className="portal-mobile-more-link"
                    to="/profesionales"
                    onClick={() => closeMobileMoreAndGoToTop("/profesionales")}
                  >
                    <IconProfessionals className="portal-mobile-more-link-icon" />
                    <span>{t(props.language, { es: "Profesionales", en: "Professionals", pt: "Profissionais" })}</span>
                  </NavLink>
                ) : null}
                <NavLink
                  className="portal-mobile-more-link"
                  to="/ejercicios"
                  onClick={() => closeMobileMoreAndGoToTop("/ejercicios")}
                >
                  <IconExercises className="portal-mobile-more-link-icon" />
                  <span>{t(props.language, { es: "Ejercicios", en: "Exercises", pt: "Exercícios" })}</span>
                </NavLink>
                <NavLink
                  className="portal-mobile-more-link"
                  to="/bienestar/musica"
                  onClick={() => closeMobileMoreAndGoToTop("/bienestar/musica")}
                >
                  <IconMusic className="portal-mobile-more-link-icon" />
                  <span>{t(props.language, { es: "Música relajante", en: "Relaxing music", pt: "Música relaxante" })}</span>
                </NavLink>
                <NavLink
                  className="portal-mobile-more-link"
                  to="/profile"
                  onClick={() => closeMobileMoreAndGoToTop("/profile", { prefix: true })}
                >
                  <IconAccount className="portal-mobile-more-link-icon" />
                  <span>{t(props.language, { es: "Mi cuenta", en: "My account", pt: "Minha conta" })}</span>
                </NavLink>
              </nav>
            </div>
            <nav
              className={`portal-mobile-nav${calmPickNav || matchingImmersive ? " portal-mobile-nav--calm" : ""}${calmAppNav ? " portal-mobile-nav--app" : ""}`}
              aria-label={t(props.language, {
                es: "Navegación principal",
                en: "Main navigation",
                pt: "Navegacao principal"
              })}
            >
              {calmPickNav ? (
                <>
                  <NavLink className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} to="/sessions" onClick={goSessionsToTop}>
                    <IconSessions className="mobile-nav-icon" />
                    <span className="mobile-nav-label">{t(props.language, { es: "Agenda", en: "Schedule", pt: "Agenda" })}</span>
                  </NavLink>
                  <NavLink className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} end to="/" onClick={goHomeToTop}>
                    <IconAccount className="mobile-nav-icon" />
                    <span className="mobile-nav-label">{t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}</span>
                  </NavLink>
                  <NavLink className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} to="/diario" end={false} onClick={() => goPathToTop("/diario", { prefix: true })}>
                    <IconNotes className="mobile-nav-icon" />
                    <span className="mobile-nav-label">{t(props.language, { es: "Diario", en: "Diary", pt: "Diário" })}</span>
                  </NavLink>
                  <NavLink className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} to="/ejercicios" onClick={() => goPathToTop("/ejercicios", { prefix: true })}>
                    <IconLeaf className="mobile-nav-icon" />
                    <span className="mobile-nav-label">{t(props.language, { es: "Bienestar", en: "Wellbeing", pt: "Bem-estar" })}</span>
                  </NavLink>
                </>
              ) : calmAppNav ? (
                <>
                  <NavLink className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} end to="/" onClick={goHomeToTop}>
                    <span className="mobile-nav-pill"><IconHome className="mobile-nav-icon" /></span>
                    <span className="mobile-nav-label">{t(props.language, { es: "Inicio", en: "Home", pt: "Início" })}</span>
                  </NavLink>
                  <NavLink className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} to="/sessions" onClick={goSessionsToTop}>
                    <span className="mobile-nav-pill"><IconSessions className="mobile-nav-icon" /></span>
                    <span className="mobile-nav-label">{t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessões" })}</span>
                  </NavLink>
                  <NavLink className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} to="/chat" onClick={() => goPathToTop("/chat")}>
                    <span className="mobile-nav-pill">
                      <IconAccount className="mobile-nav-icon" />
                      {props.unreadMessagesCount > 0 ? (
                        <span className="mobile-nav-badge" aria-label={t(props.language, { es: "Mensajes nuevos", en: "New messages", pt: "Novas mensagens" })}>
                          {props.unreadMessagesCount > 99 ? "99+" : props.unreadMessagesCount}
                        </span>
                      ) : null}
                    </span>
                    <span className="mobile-nav-label">{t(props.language, { es: "Profesional", en: "Professional", pt: "Profissional" })}</span>
                  </NavLink>
                  <NavLink className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} to="/diario" end={false} onClick={() => goPathToTop("/diario", { prefix: true })}>
                    <span className="mobile-nav-pill"><IconNotes className="mobile-nav-icon" /></span>
                    <span className="mobile-nav-label">{t(props.language, { es: "Diario", en: "Diary", pt: "Diário" })}</span>
                  </NavLink>
                  <NavLink className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} to="/ejercicios" onClick={() => goPathToTop("/ejercicios", { prefix: true })}>
                    <span className="mobile-nav-pill"><IconLeaf className="mobile-nav-icon" /></span>
                    <span className="mobile-nav-label">{t(props.language, { es: "Bienestar", en: "Wellbeing", pt: "Bem-estar" })}</span>
                  </NavLink>
                </>
              ) : (
                <>
              <NavLink
                className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}
                end
                to="/"
                onClick={goHomeToTop}
              >
                <IconHome className="mobile-nav-icon" />
                <span className="mobile-nav-label">{t(props.language, { es: "Inicio", en: "Home", pt: "Inicio" })}</span>
              </NavLink>
              <NavLink
                className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}
                to="/sessions"
                onClick={goSessionsToTop}
              >
                <IconSessions className="mobile-nav-icon" />
                <span className="mobile-nav-label">{t(props.language, { es: "Sesiones", en: "Sessions", pt: "Sessoes" })}</span>
              </NavLink>
              <NavLink
                className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}
                to="/chat"
                onClick={() => goPathToTop("/chat")}
              >
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
              <NavLink
                className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}
                to="/diario"
                end={false}
                onClick={() => goPathToTop("/diario", { prefix: true })}
              >
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
                </>
              )}
            </nav>
          </>
        ) : null}
        {props.children}
        {diaryImmersive && diaryHeroToolbarMount
          ? createPortal(renderHeaderActions(true), diaryHeroToolbarMount)
          : null}
        {diarySubpageImmersive && !diaryHeroToolbarMount && diaryPortalToolbarMount
          ? createPortal(renderHeaderActions(true), diaryPortalToolbarMount)
          : null}
        {dashboardHomeImmersive && dashboardHeroToolbarMount
          ? createPortal(renderHeaderActions(true), dashboardHeroToolbarMount)
          : null}
        {homeMlFloatingToolbar && dashboardHeroToolbarMount
          ? createPortal(renderHeaderActions(true), dashboardHeroToolbarMount)
          : null}
        {sessionsHomeImmersive && sessionsHeroToolbarMount
          ? createPortal(renderHeaderActions(true), sessionsHeroToolbarMount)
          : null}
        {assignedProImmersive && assignedProToolbarMount
          ? createPortal(renderHeaderActions(true), assignedProToolbarMount)
          : null}
        {exercisesHomeImmersive && wellbeingHeroToolbarMount
          ? createPortal(renderHeaderActions(true), wellbeingHeroToolbarMount)
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
