import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import { flushSync } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import {
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
  defaultDisplayCurrencyForMarket,
  type AppLanguage,
  type LocalizedText,
  textByLanguage
} from "@therapy/i18n-config";
import { isMarket, joinFirstLastToFullName, type Market } from "@therapy/types";
import { detectBrowserTimezone, syncUserTimezone } from "@therapy/auth";
import {
  mapBookingFromMineApi,
} from "../booking/bookingMappers";
import {
  POST_TRIAL_CALENDAR_PENDING_SESSION_KEY,
  clearCalendarOfferContext,
  clearPostTrialCalendarPending,
  getCalendarOfferContext,
  setCalendarOfferContext
} from "./constants";
import { AuthScreen } from "./pages/AuthScreen";
import { PatientForgotPasswordScreen } from "./pages/PatientForgotPasswordScreen";
import { PatientResetPasswordScreen } from "./pages/PatientResetPasswordScreen";
import { VerifyEmailRequiredScreen } from "./pages/VerifyEmailRequiredScreen";
import {
  VerifyEmailTokenScreen,
  type PatientVerifyEmailCompletePayload
} from "./pages/VerifyEmailTokenScreen";
import { MainPortal } from "./pages/MainPortal";
import { heroImage, professionalImageMap, professionalsCatalog } from "./data/professionalsCatalog";
import {
  friendlyCalendarOAuthReturnMessage,
  friendlyCalendarOnboardingMessage
} from "./lib/friendlyPatientMessages";
import { sessionUserFromAuthMe } from "./lib/sessionFromAuthMe";
import { IntakeScreen } from "../intake/pages/IntakeScreen";
import { IntakeMethodChooserScreen } from "../intake/pages/IntakeMethodChooserScreen";
import { IntakeChatScreen } from "../intake/pages/IntakeChatScreen";
import {
  fetchActiveIntakeChatSession,
  type IntakeChatSessionDto
} from "../intake/services/intakeChatApi";
import { TreatmentChatFAB } from "../treatment-chat/components/TreatmentChatFAB";
import { usePublicFeatures } from "./hooks/usePublicFeatures";
import { API_BASE, STORAGE_KEY, apiRequest, resolvePublicAssetUrl, setPatientApiUnauthorizedHandler } from "./services/api";
import { fetchPatientPortalSyncBatchShared } from "./lib/fetchPatientPortalSyncBatchShared";
import { fetchProfessionalDirectory } from "../matching/services/professionals";
import type {
  Booking,
  Message,
  PatientAppState,
  PatientProfile,
  Professional,
  RiskLevel,
  SessionUser,
  SubmitIntakeApiResponse
} from "./types";

const initialMessages: Message[] = [];
const CALENDAR_PROMPT_DISMISSED_USERS_KEY = "patient_calendar_prompt_dismissed_users";
/** Survives full-page Google OAuth redirect if localStorage is briefly empty (same origin). */
const CALENDAR_OAUTH_LOCAL_STORAGE_BACKUP_KEY = "mc_calendar_oauth_ls_backup";
function restorePatientPortalAfterCalendarOAuth(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    if (!params.get("calendar_sync")) {
      return;
    }
    const backup = window.sessionStorage.getItem(CALENDAR_OAUTH_LOCAL_STORAGE_BACKUP_KEY);
    if (backup && !window.localStorage.getItem(STORAGE_KEY)) {
      window.localStorage.setItem(STORAGE_KEY, backup);
    }
    window.sessionStorage.removeItem(CALENDAR_OAUTH_LOCAL_STORAGE_BACKUP_KEY);
  } catch {
    // ignore private mode / quota
  }
}

const defaultProfile: PatientProfile = {
  timezone: detectBrowserTimezone(),
  phone: "",
  emergencyContact: "",
  notificationsEmail: true,
  notificationsReminder: true,
  dashboardPhotoDataUrl: "",
  cards: []
};

const defaultState: PatientAppState = {
  session: null,
  authToken: null,
  googleCalendarConnected: false,
  emailVerificationRequired: false,
  language: "es",
  /** Por defecto se asume mercado AR; la moneda se sincroniza con `patientMarket`. */
  currency: defaultDisplayCurrencyForMarket("AR"),
  profileResidencyCountry: null,
  patientMarket: "AR",
  intake: null,
  onboardingFinalCompleted: false,
  therapistSelectionCompleted: false,
  selectedProfessionalId: professionalsCatalog[0].id,
  assignedProfessionalId: null,
  assignedProfessionalName: null,
  activeChatProfessionalId: professionalsCatalog[0].id,
  bookedSlotIds: [],
  favoriteProfessionalIds: [],
  bookings: [],
  trialUsedProfessionalIds: [],
  messages: initialMessages,
  subscription: {
    packageId: null,
    packageName: "Sin paquete activo",
    creditsTotal: 0,
    creditsRemaining: 0,
    purchaseHistory: []
  },
  profile: defaultProfile
};

function hasConfirmedTrialBooking(bookings: Booking[]): boolean {
  return bookings.some((booking) => booking.status === "confirmed" && booking.bookingMode === "trial");
}

function mergeRemoteWithLocalTrialBookings(remoteBookings: Booking[], localBookings: Booking[]): Booking[] {
  void localBookings;
  return [...remoteBookings].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

function loadState(): PatientAppState {
  restorePatientPortalAfterCalendarOAuth();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState;
    }

    const parsed = JSON.parse(raw) as PatientAppState;
    const parsedBookings = Array.isArray(parsed.bookings) ? parsed.bookings : [];
    const inferredOnboardingFinalCompleted =
      typeof (parsed as { onboardingFinalCompleted?: unknown }).onboardingFinalCompleted === "boolean"
        ? Boolean((parsed as { onboardingFinalCompleted?: unknown }).onboardingFinalCompleted)
        : hasConfirmedTrialBooking(parsedBookings);
    const inferredTherapistSelectionCompleted =
      typeof (parsed as { therapistSelectionCompleted?: unknown }).therapistSelectionCompleted === "boolean"
        ? Boolean((parsed as { therapistSelectionCompleted?: unknown }).therapistSelectionCompleted)
        : Boolean(parsed.assignedProfessionalId) || parsedBookings.length > 0;

    return {
      ...defaultState,
      ...parsed,
      language: (SUPPORTED_LANGUAGES as readonly string[]).includes((parsed as any).language)
        ? (parsed as any).language
        : "es",
      patientMarket: (() => {
        const pm = (parsed as { patientMarket?: unknown }).patientMarket;
        return isMarket(pm) ? pm : "AR";
      })(),
      currency: (() => {
        const storedCurrency = (parsed as { currency?: unknown }).currency;
        if (typeof storedCurrency === "string" && (SUPPORTED_CURRENCIES as readonly string[]).includes(storedCurrency)) {
          return storedCurrency as PatientAppState["currency"];
        }
        const pm = (parsed as { patientMarket?: unknown }).patientMarket;
        const market: Market = isMarket(pm) ? pm : "AR";
        return defaultDisplayCurrencyForMarket(market);
      })(),
      profileResidencyCountry: (() => {
        const raw = (parsed as { profileResidencyCountry?: unknown }).profileResidencyCountry;
        if (typeof raw !== "string") return null;
        const u = raw.trim().toUpperCase();
        return /^[A-Z]{2}$/.test(u) ? u : null;
      })(),
      trialUsedProfessionalIds: parsed.trialUsedProfessionalIds ?? [],
      session: parsed.session
        ? {
            ...parsed.session,
            id: String((parsed.session as { id?: unknown }).id ?? ""),
            emailVerified:
              typeof (parsed.session as { emailVerified?: unknown }).emailVerified === "boolean"
                ? Boolean((parsed.session as { emailVerified?: unknown }).emailVerified)
                : true
          }
        : null,
      emailVerificationRequired:
        typeof (parsed as { emailVerificationRequired?: unknown }).emailVerificationRequired === "boolean"
          ? Boolean((parsed as { emailVerificationRequired?: unknown }).emailVerificationRequired)
          : false,
      onboardingFinalCompleted: inferredOnboardingFinalCompleted,
      therapistSelectionCompleted: inferredTherapistSelectionCompleted,
      assignedProfessionalId: parsed.assignedProfessionalId ?? null,
      assignedProfessionalName: parsed.assignedProfessionalName ?? null,
      favoriteProfessionalIds: Array.isArray(parsed.favoriteProfessionalIds)
        ? parsed.favoriteProfessionalIds.filter((value): value is string => typeof value === "string")
        : [],
      subscription: {
        ...defaultState.subscription,
        ...parsed.subscription,
        purchaseHistory: Array.isArray(parsed.subscription?.purchaseHistory)
          ? parsed.subscription.purchaseHistory.filter((item): item is PatientAppState["subscription"]["purchaseHistory"][number] => (
            typeof item?.id === "string"
            && typeof item?.name === "string"
            && typeof item?.credits === "number"
            && typeof item?.purchasedAt === "string"
            && (item?.priceCents === undefined || item?.priceCents === null || typeof item?.priceCents === "number")
            && (item?.currency === undefined || item?.currency === null || typeof item?.currency === "string")
          ))
          : []
      },
      profile: {
        ...defaultProfile,
        ...parsed.profile,
        cards: parsed.profile?.cards ?? []
      },
      googleCalendarConnected: false
    };
  } catch {
    return defaultState;
  }
}

function saveState(state: PatientAppState): void {
  const { googleCalendarConnected: _gc, ...persisted } = state;
  void _gc;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
}

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function readDismissedCalendarPromptUsers(): string[] {
  try {
    const raw = window.localStorage.getItem(CALENDAR_PROMPT_DISMISSED_USERS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function writeDismissedCalendarPromptUsers(userIds: string[]): void {
  window.localStorage.setItem(CALENDAR_PROMPT_DISMISSED_USERS_KEY, JSON.stringify(Array.from(new Set(userIds))));
}

function mapDirectoryProfessionalToLegacyProfessional(item: {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  title: string;
  yearsExperience: number;
  compatibilityBase: number;
  specialization: string | null;
  focusPrimary: string | null;
  languages: string[];
  therapeuticApproach: string | null;
  bio: string | null;
  ratingAverage: number | null;
  reviewsCount: number;
  stripeVerified: boolean;
  sessionPriceUsd: number | null;
  activePatientsCount: number;
  slots: Array<{ id: string; startsAt: string; endsAt: string }>;
}): Professional {
  return {
    id: item.id,
    fullName: item.fullName,
    firstName: item.firstName,
    lastName: item.lastName,
    title: item.title || "Profesional de salud mental",
    yearsExperience: item.yearsExperience,
    compatibility: item.compatibilityBase,
    specialties: [item.specialization, item.focusPrimary].filter((value): value is string => Boolean(value && value.trim().length > 0)),
    languages: item.languages ?? [],
    approach: item.therapeuticApproach ?? "",
    bio: item.bio ?? "",
    rating: item.ratingAverage ?? 0,
    reviewsCount: item.reviewsCount,
    verified: item.stripeVerified,
    sessionPriceUsd: item.sessionPriceUsd ?? undefined,
    activePatients: item.activePatientsCount,
    introVideoUrl: "",
    slots: item.slots ?? []
  };
}

/** Profesional asignado por admin que no entra en el directorio (p. ej. visible=false); slots vacíos — la agenda se pide por API en Reservas. */
function professionalStubFromActiveProfile(active: {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  photoUrl?: string | null;
}): Professional {
  return {
    id: active.id,
    fullName: active.fullName,
    firstName: active.firstName,
    lastName: active.lastName,
    title: "Profesional de salud mental",
    yearsExperience: 0,
    compatibility: 50,
    specialties: [],
    languages: [],
    approach: "",
    bio: "",
    rating: 0,
    reviewsCount: 0,
    verified: false,
    sessionPriceUsd: undefined,
    activePatients: 0,
    introVideoUrl: "",
    slots: []
  };
}

/** Evita pedir disponibilidad con ids del catálogo demo cuando el directorio real ya cargó (Sesiones / Reservas). */
function pickPreferredProfessionalIds(
  directoryList: Professional[],
  assignedProfessionalId: string | null,
  currentSelectedId: string,
  currentChatProfessionalId: string
): { selectedProfessionalId: string; activeChatProfessionalId: string } {
  const ids = new Set(directoryList.map((p) => p.id));
  if (ids.size === 0) {
    return {
      selectedProfessionalId: currentSelectedId,
      activeChatProfessionalId: currentChatProfessionalId
    };
  }
  const pick = (id: string | null | undefined) => (id && ids.has(id) ? id : null);
  const selected =
    pick(assignedProfessionalId) ?? pick(currentSelectedId) ?? directoryList[0]?.id ?? currentSelectedId;
  const chat =
    pick(currentChatProfessionalId) ?? pick(assignedProfessionalId) ?? selected;
  return { selectedProfessionalId: selected, activeChatProfessionalId: chat };
}

function handleHeroFallback(event: SyntheticEvent<HTMLImageElement>): void {
  const img = event.currentTarget;
  img.onerror = null;
  img.src = "/images/hero-therapy.svg";
}

export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<PatientAppState>(() => loadState());
  const [showCalendarOnboarding, setShowCalendarOnboarding] = useState(false);
  const [calendarOnboardingLoading, setCalendarOnboardingLoading] = useState(false);
  const [calendarOnboardingError, setCalendarOnboardingError] = useState("");
  const [calendarPromptDismissedUserIds, setCalendarPromptDismissedUserIds] = useState<string[]>(() => readDismissedCalendarPromptUsers());
  const [professionalDirectory, setProfessionalDirectory] = useState<Professional[]>(() => professionalsCatalog);
  const [professionalPhotoMap, setProfessionalPhotoMap] = useState<Record<string, string>>(() => professionalImageMap);
  const [profileSyncReady, setProfileSyncReady] = useState(false);
  /**
   * Modo seleccionado por el paciente para hacer el intake.
   * - `chooser`: vemos la pantalla split (clásico vs chat IA).
   * - `classic`: wizard tradicional paso a paso.
   * - `chat`: conversación con asistente IA (PR2 detrás de feature flag).
   * Solo aplica cuando el paciente todavía no completó el intake.
   */
  const [intakeMethod, setIntakeMethod] = useState<"chooser" | "classic" | "chat">("chooser");
  /** Sesión activa del chat detectada al entrar; nos permite "retomar" sin pasar por el chooser. */
  const [activeChatSession, setActiveChatSession] = useState<IntakeChatSessionDto | null>(null);
  /** `true` cuando ya hicimos el lookup de sesión activa (evita parpadear el chooser durante el fetch). */
  const [chatSessionLookupDone, setChatSessionLookupDone] = useState(false);
  const { flags: publicFeatures } = usePublicFeatures();
  /**
   * Cada incremento invalida el lote de `syncFromApi` en vuelo (p. ej. verificación de email completada).
   * Así una respuesta vieja de GET /me no pisa estado ya actualizado.
   * Solo ref (no estado): si el epoch vive en `useState`, cada bump re-dispara el efecto de sync y
   * puede encadenar ráfagas a /profiles/me + /auth/me cuando hay muchos resyncs (p. ej. visibility).
   */
  const portalSyncEpochRef = useRef(0);
  /** `true` = saltear throttle (email verificado, otra pestaña, etc.). */
  const schedulePortalSyncRef = useRef<(force?: boolean) => void>(() => {});

  /**
   * Clave estable por sesión: evita que `id` número vs string u oscilaciones en token
   * re-disparen el efecto de sync en bucle (ráfagas a /profiles/me + /auth/me).
   */
  const portalLoginKey = useMemo(() => {
    const rawId = state.session?.id;
    const tok = state.authToken;
    if (rawId == null || tok == null) {
      return null;
    }
    const id = String(rawId).trim();
    const token = String(tok).trim();
    if (id.length === 0 || token.length === 0) {
      return null;
    }
    return `${id}::${token}`;
  }, [state.session?.id, state.authToken]);

  const requestPortalResync = useCallback(() => {
    portalSyncEpochRef.current += 1;
    schedulePortalSyncRef.current(true);
  }, []);

  const sessionTimezone = useMemo(() => detectBrowserTimezone(), []);
  const isVerifyEmailRoute = useMemo(() => location.pathname === "/verify-email", [location.pathname]);
  const isForgotPasswordRoute = useMemo(() => location.pathname === "/forgot-password", [location.pathname]);
  const isResetPasswordRoute = useMemo(() => location.pathname === "/reset-password", [location.pathname]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    setPatientApiUnauthorizedHandler(() => {
      clearPostTrialCalendarPending();
      clearCalendarOfferContext();
      setProfileSyncReady(false);
      setProfessionalDirectory(professionalsCatalog);
      setProfessionalPhotoMap(professionalImageMap);
      setShowCalendarOnboarding(false);
      setCalendarOnboardingLoading(false);
      setCalendarOnboardingError("");
      setState((current) => ({
        ...defaultState,
        language: current.language,
        currency: current.currency,
        patientMarket: current.patientMarket,
        profile: {
          ...defaultProfile,
          timezone: current.profile.timezone
        }
      }));
      navigate("/", { replace: true });
    });
    return () => {
      setPatientApiUnauthorizedHandler(undefined);
    };
  }, [navigate]);

  const updateState = useCallback((updater: (current: PatientAppState) => PatientAppState) => {
    setState((current) => updater(current));
  }, []);

  /**
   * Tras GET /verify-email: el servidor devuelve JWT (igual que login). Si llega acá con token,
   * abrimos sesión en esta pestaña y vamos a / → el portal envía al onboarding si corresponde.
   * Si solo había sesión ya cargada: actualizamos emailVerified; si no hay sesión ni token (caso raro): login con aviso.
   */
  const handleEmailLinkVerificationComplete = useCallback(
    (payload?: PatientVerifyEmailCompletePayload) => {
      if (payload?.token && payload.user.role === "PATIENT") {
        setProfileSyncReady(false);
        setProfessionalDirectory(professionalsCatalog);
        setProfessionalPhotoMap(professionalImageMap);
        setShowCalendarOnboarding(false);
        setCalendarOnboardingLoading(false);
        setCalendarPromptDismissedUserIds(readDismissedCalendarPromptUsers());
        flushSync(() => {
          setState((current) => ({
            ...defaultState,
            language: current.language,
            currency: current.currency,
            patientMarket: current.patientMarket,
            profileResidencyCountry: current.profileResidencyCountry,
            profile: {
              ...defaultProfile,
              timezone: sessionTimezone
            },
            session: {
              id: payload.user.id,
              fullName: payload.user.fullName,
              firstName: payload.user.firstName,
              lastName: payload.user.lastName,
              email: payload.user.email,
              emailVerified: payload.user.emailVerified,
              avatarUrl: payload.user.avatarUrl ?? null
            },
            authToken: payload.token,
            emailVerificationRequired: payload.emailVerificationRequired
          }));
        });
        requestPortalResync();
        navigate("/", { replace: true });
        return;
      }

      const hadSessionRef = { current: false };
      flushSync(() => {
        setState((current) => {
          if (current.session) {
            hadSessionRef.current = true;
            return {
              ...current,
              session: { ...current.session, emailVerified: true }
            };
          }
          return current;
        });
      });
      requestPortalResync();
      navigate(hadSessionRef.current ? "/" : "/?email_verified=1", { replace: true });
    },
    [navigate, requestPortalResync, sessionTimezone]
  );

  /** Otra pestaña guardó estado verificado en localStorage: alinear UI y pedir un sync fresco al servidor. */
  useEffect(() => {
    function handleStorageEvent(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || typeof event.newValue !== "string") {
        return;
      }
      let parsed: PatientAppState;
      try {
        parsed = JSON.parse(event.newValue) as PatientAppState;
      } catch {
        return;
      }
      const remote = parsed.session;
      if (!remote?.id || remote.emailVerified !== true) {
        return;
      }
      setState((current) => {
        if (!current.session || current.session.id !== remote.id || current.session.emailVerified) {
          return current;
        }
        return {
          ...current,
          session: { ...current.session, emailVerified: true }
        };
      });
      requestPortalResync();
    }

    window.addEventListener("storage", handleStorageEvent);
    return () => window.removeEventListener("storage", handleStorageEvent);
  }, [requestPortalResync]);

  /** Volvés a la pestaña donde seguía «revisá tu correo»: un resync trae /me autoritativo. */
  useEffect(() => {
    if (
      location.pathname !== "/verify-email-required"
      || !state.session?.id
      || state.session.emailVerified
      || !state.authToken
    ) {
      return;
    }

    let lastVisibilityResyncAt = 0;

    function onVisibility() {
      if (document.visibilityState !== "visible") {
        return;
      }
      const now = Date.now();
      if (now - lastVisibilityResyncAt < 2000) {
        return;
      }
      lastVisibilityResyncAt = now;
      requestPortalResync();
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [
    location.pathname,
    requestPortalResync,
    state.authToken,
    state.session?.emailVerified,
    state.session?.id
  ]);

  const sessionId = state.session?.id;

  const portalSyncThrottleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const portalSyncLastBatchAtRef = useRef(0);

  const portalSyncDepsRef = useRef({
    sessionId: undefined as string | undefined,
    authToken: null as string | null,
    language: "es" as AppLanguage
  });
  portalSyncDepsRef.current = {
    sessionId: sessionId == null ? undefined : String(sessionId),
    authToken: state.authToken,
    language: state.language
  };

  const portalSyncMutexRef = useRef({ inFlight: false, rerun: false });
  /** Evita GET /matching duplicado al montar; solo refetch de directorio cuando el usuario cambia idioma. */
  const portalLanguageBootstrapRef = useRef(false);

  /**
   * En logout (o reset a defaultState) volvemos al chooser y descartamos cualquier
   * sesión activa de chat detectada para el usuario anterior — así un nuevo login
   * no hereda la elección "chat" o una sesión que no le corresponde.
   */
  useEffect(() => {
    if (!state.session) {
      setIntakeMethod("chooser");
      setActiveChatSession(null);
      setChatSessionLookupDone(false);
    }
  }, [state.session]);

  /**
   * Lookup de sesión activa del intake-chat. Se dispara solo cuando:
   *  - el usuario está autenticado
   *  - el intake todavía no fue completado
   *  - el feature flag `intakeChatEnabled` está ON
   *  - no hicimos el lookup en este montaje (`chatSessionLookupDone === false`).
   *
   * Si encontramos una sesión activa, ponemos `intakeMethod = "chat"` para retomar
   * directamente la conversación, evitando re-mostrar el chooser cada vez.
   */
  useEffect(() => {
    if (!state.authToken || !sessionId) return;
    if (state.intake?.completed) return;
    if (!publicFeatures.intakeChatEnabled) {
      // Sin feature flag: nada para lookupear; ramificación irá siempre al wizard.
      if (!chatSessionLookupDone) setChatSessionLookupDone(true);
      return;
    }
    if (chatSessionLookupDone) return;

    let cancelled = false;
    const token = state.authToken;
    (async () => {
      try {
        const active = await fetchActiveIntakeChatSession(token);
        if (cancelled) return;
        setActiveChatSession(active);
        if (active) {
          setIntakeMethod("chat");
        }
      } catch (err) {
        // No bloqueamos el flujo: si falla, el chooser se muestra y el paciente decide.
        console.warn("[intake-chat] lookup falló:", err instanceof Error ? err.message : err);
      } finally {
        if (!cancelled) setChatSessionLookupDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.authToken, sessionId, state.intake?.completed, publicFeatures.intakeChatEnabled, chatSessionLookupDone]);

  const shouldOfferCalendarOnboardingBeforeMatching = useMemo(
    () =>
      Boolean(
        state.intake?.completed
        && !state.intake?.riskBlocked
        && !state.therapistSelectionCompleted
        && state.bookings.length === 0
        && state.subscription.purchaseHistory.length === 0
      ),
    [
      state.intake?.completed,
      state.intake?.riskBlocked,
      state.therapistSelectionCompleted,
      state.bookings.length,
      state.subscription.purchaseHistory.length
    ]
  );

  /**
   * Recuperación (F5): evita un frame de MainPortal entre intake completado y pantalla de Calendar.
   */
  useLayoutEffect(() => {
    if (!sessionId || !state.authToken) {
      return;
    }
    if (!shouldOfferCalendarOnboardingBeforeMatching) {
      return;
    }
    if (calendarPromptDismissedUserIds.includes(sessionId)) {
      return;
    }
    if (showCalendarOnboarding) {
      return;
    }
    setCalendarOfferContext("pre-matching");
    setShowCalendarOnboarding(true);
  }, [
    sessionId,
    state.authToken,
    shouldOfferCalendarOnboardingBeforeMatching,
    calendarPromptDismissedUserIds,
    showCalendarOnboarding
  ]);

  /** Tras confirmar sesión de prueba: ofrecer Google Calendar si aún no está conectado (flag en GET /me, sin polling extra). */
  useEffect(() => {
    if (!sessionId || !state.authToken || !profileSyncReady) {
      return;
    }
    if (showCalendarOnboarding) {
      return;
    }
    if (calendarPromptDismissedUserIds.includes(sessionId)) {
      clearPostTrialCalendarPending();
      return;
    }

    let pending = false;
    try {
      pending = window.sessionStorage.getItem(POST_TRIAL_CALENDAR_PENDING_SESSION_KEY) === sessionId;
    } catch {
      return;
    }
    if (!pending) {
      return;
    }

    if (state.googleCalendarConnected) {
      clearPostTrialCalendarPending();
      return;
    }

    setCalendarOfferContext("post-trial");
    setShowCalendarOnboarding(true);
  }, [
    sessionId,
    state.authToken,
    profileSyncReady,
    showCalendarOnboarding,
    calendarPromptDismissedUserIds,
    state.googleCalendarConnected
  ]);

  const handleConnectCalendarFromOnboarding = async () => {
    if (!state.authToken) {
      return;
    }

    setCalendarOnboardingLoading(true);
    setCalendarOnboardingError("");
    try {
      try {
        window.sessionStorage.setItem(
          CALENDAR_OAUTH_LOCAL_STORAGE_BACKUP_KEY,
          window.localStorage.getItem(STORAGE_KEY) ?? ""
        );
      } catch {
        // ignore
      }
      const returnPath = getCalendarOfferContext() === "post-trial" ? "/" : "/onboarding/final/matching";
      const response = await apiRequest<{ authUrl: string }>(
        "/api/auth/google/calendar/connect",
        {
          method: "POST",
          body: JSON.stringify({
            returnPath,
            clientOrigin: window.location.origin
          })
        },
        state.authToken
      );
      window.location.href = response.authUrl;
    } catch (error) {
      console.error("Could not start patient calendar onboarding OAuth", error);
      const raw = error instanceof Error ? error.message : "";
      const notConfigured =
        /not configured/i.test(raw) || /GOOGLE_CALENDAR_OAUTH_NOT_CONFIGURED/i.test(raw);
      setCalendarOnboardingError(
        friendlyCalendarOnboardingMessage(state.language, { raw, notConfigured })
      );
    } finally {
      setCalendarOnboardingLoading(false);
    }
  };

  useEffect(() => {
    if (!portalLoginKey) {
      if (portalSyncThrottleTimerRef.current) {
        clearTimeout(portalSyncThrottleTimerRef.current);
        portalSyncThrottleTimerRef.current = null;
      }
      portalSyncLastBatchAtRef.current = 0;
      setProfileSyncReady(false);
      setProfessionalDirectory(professionalsCatalog);
      setProfessionalPhotoMap(professionalImageMap);
      return;
    }

    /**
     * No bajar `profileSyncReady` en cada sync del mismo login: desmontaba todo el portal (parpadeo).
     * Un solo sync en vuelo; si llegan más disparos (deps), se encola `rerun` con deps al día (ref).
     * Evita ráfagas paralelas a /profiles/me + /bookings/mine + /auth/me.
     * Throttle entre lotes (salvo `force`) corta bucles si el efecto se re-dispara más rápido que ~1s.
     */
    const runSyncFromApi = async () => {
      const batchEpoch = portalSyncEpochRef.current;
      const { sessionId: sid, authToken: tokenFromRef, language: languageSnapshot } = portalSyncDepsRef.current;
      const tokenSnapshot = tokenFromRef ?? undefined;
      if (!sid || !tokenSnapshot) {
        return;
      }
      try {
        const { profileResult, bookingsResult, authResult, professionalDirectoryResult } =
          await fetchPatientPortalSyncBatchShared({
            token: tokenSnapshot,
            epoch: batchEpoch,
            language: languageSnapshot
          });

        if (batchEpoch !== portalSyncEpochRef.current) {
          return;
        }

        const profileResponse = profileResult.status === "fulfilled" ? profileResult.value : null;
        const bookingsResponse = bookingsResult.status === "fulfilled" ? bookingsResult.value : null;
        const authResponse = authResult.status === "fulfilled" ? authResult.value : null;
        const professionalDirectoryResponse = professionalDirectoryResult.status === "fulfilled" ? professionalDirectoryResult.value : null;

        let mergedPhotos: Record<string, string> = { ...professionalImageMap };
        let directoryListForClamp: Professional[] | null = null;

        if (professionalDirectoryResult.status === "fulfilled" && professionalDirectoryResponse !== null) {
          let directoryList = professionalDirectoryResponse.map(mapDirectoryProfessionalToLegacyProfessional);
          const assignedForDirectory = profileResponse?.profile?.activeProfessional;
          if (assignedForDirectory?.id && !directoryList.some((p) => p.id === assignedForDirectory.id)) {
            directoryList = [professionalStubFromActiveProfile(assignedForDirectory), ...directoryList];
          }
          directoryListForClamp = directoryList;
          setProfessionalDirectory(directoryList);
          for (const professional of professionalDirectoryResponse) {
            const resolved = resolvePublicAssetUrl(professional.photoUrl);
            if (resolved) {
              mergedPhotos[professional.id] = resolved;
            }
          }
        } else if (
          professionalDirectoryResult.status === "rejected"
          && profileResponse?.profile?.activeProfessional?.id
        ) {
          const stubOnly = [professionalStubFromActiveProfile(profileResponse.profile.activeProfessional)];
          directoryListForClamp = stubOnly;
          setProfessionalDirectory(stubOnly);
        }

        const activePro = profileResponse?.profile?.activeProfessional;
        if (activePro?.id) {
          const resolvedActive = resolvePublicAssetUrl(activePro.photoUrl);
          if (resolvedActive) {
            mergedPhotos[activePro.id] = resolvedActive;
          }
        }

        setProfessionalPhotoMap(mergedPhotos);

        const latestPackage = profileResponse?.profile?.latestPackage ?? null;
        const remoteAssignedProfessional = profileResponse?.profile?.activeProfessional ?? null;

        const bookingsFromApi: Booking[] = (bookingsResponse?.bookings ?? [])
          .map((booking) => mapBookingFromMineApi(booking))
          .filter((booking): booking is Booking => booking !== null);

        setState((current) => {
          const liveSid = portalSyncDepsRef.current.sessionId;
          if (!current.session || !liveSid || String(current.session.id) !== String(liveSid)) {
            return current;
          }

          const syncedBookings = bookingsResponse
            ? mergeRemoteWithLocalTrialBookings(bookingsFromApi, current.bookings)
            : current.bookings;

          const hasRemoteConfirmedTrialBooking = hasConfirmedTrialBooking(syncedBookings);
          const hasRemoteOnboardingCompletionSignal =
            hasRemoteConfirmedTrialBooking
            || syncedBookings.length > 0
            || Boolean(latestPackage);

          /**
           * Hasta que el paciente cierre el onboarding (trial reservado, paquete o señal remota),
           * no usar "active professional" del admin ni bookings remotos para saltar el matching:
           * evita redirect a Inicio tras OAuth o con asignación de prueba en SystemConfig.
           */
          const gateMatchingFromApiAssignment =
            !current.onboardingFinalCompleted
            && !hasRemoteOnboardingCompletionSignal
            && syncedBookings.length === 0
            && !latestPackage;

          const therapistSelectionCompletedMerged = gateMatchingFromApiAssignment
            ? current.therapistSelectionCompleted
            : current.therapistSelectionCompleted
              || Boolean(remoteAssignedProfessional)
              || syncedBookings.length > 0;

          const assignedProfessionalIdMerged = gateMatchingFromApiAssignment
            ? current.assignedProfessionalId
            : remoteAssignedProfessional?.id ?? current.assignedProfessionalId;

          const assignedProfessionalNameMerged = gateMatchingFromApiAssignment
            ? current.assignedProfessionalName
            : (() => {
                if (!remoteAssignedProfessional) {
                  return current.assignedProfessionalName;
                }
                const joined = joinFirstLastToFullName(
                  remoteAssignedProfessional.firstName ?? "",
                  remoteAssignedProfessional.lastName ?? ""
                ).trim();
                return joined || remoteAssignedProfessional.fullName;
              })();

          const selectionFromApiDirectory =
            directoryListForClamp && directoryListForClamp.length > 0
              ? pickPreferredProfessionalIds(
                  directoryListForClamp,
                  remoteAssignedProfessional?.id ?? null,
                  current.selectedProfessionalId,
                  current.activeChatProfessionalId
                )
              : null;

          return {
            ...current,
            onboardingFinalCompleted:
              current.onboardingFinalCompleted
              || hasRemoteOnboardingCompletionSignal,
            therapistSelectionCompleted: therapistSelectionCompletedMerged,
            assignedProfessionalId: assignedProfessionalIdMerged,
            assignedProfessionalName: assignedProfessionalNameMerged,
            selectedProfessionalId:
              selectionFromApiDirectory?.selectedProfessionalId
              ?? (remoteAssignedProfessional
                ? remoteAssignedProfessional.id
                : current.selectedProfessionalId),
            activeChatProfessionalId:
              selectionFromApiDirectory?.activeChatProfessionalId
              ?? (remoteAssignedProfessional
                ? remoteAssignedProfessional.id
                : current.activeChatProfessionalId),
            patientMarket: (() => {
              const m = profileResponse?.profile?.market;
              return isMarket(m) ? m : "AR";
            })(),
            profileResidencyCountry: (() => {
              const rc = profileResponse?.profile?.residencyCountry;
              if (rc === null || rc === undefined) {
                return current.profileResidencyCountry;
              }
              if (typeof rc !== "string") {
                return current.profileResidencyCountry;
              }
              const u = rc.trim().toUpperCase();
              return /^[A-Z]{2}$/.test(u) ? u : current.profileResidencyCountry;
            })(),
            currency: (() => {
              const m = profileResponse?.profile?.market;
              const resolvedMarket: Market = isMarket(m) ? m : current.patientMarket;
              return defaultDisplayCurrencyForMarket(resolvedMarket);
            })(),
            profile: {
              ...current.profile,
              timezone: profileResponse?.profile?.timezone ?? current.profile.timezone
            },
            session: authResponse?.user
              ? sessionUserFromAuthMe(authResponse.user, current.session)
              : current.session,
            emailVerificationRequired:
              typeof authResponse?.emailVerificationRequired === "boolean"
                ? authResponse.emailVerificationRequired
                : current.emailVerificationRequired,
            googleCalendarConnected:
              typeof authResponse?.googleCalendarConnected === "boolean"
                ? authResponse.googleCalendarConnected
                : current.googleCalendarConnected,
            intake: profileResponse?.profile?.intakeCompletedAt
              ? {
                  completed: true,
                  completedAt: profileResponse.profile.intakeCompletedAt,
                  riskLevel: (profileResponse.profile.intakeRiskLevel ?? "low") as RiskLevel,
                  riskBlocked:
                    typeof profileResponse.profile.intakeRiskBlocked === "boolean"
                      ? profileResponse.profile.intakeRiskBlocked
                      : (profileResponse.profile.intakeRiskLevel ?? "low") !== "low",
                  triageDecision: profileResponse.profile.intakeTriageDecision ?? null,
                  answers: current.intake?.answers ?? {}
                }
              : current.intake,
            subscription: latestPackage
              ? {
                  packageId: latestPackage.id,
                  packageName: latestPackage.name,
                  creditsTotal: latestPackage.totalCredits,
                  creditsRemaining: latestPackage.remainingCredits,
                  purchasedAt: latestPackage.purchasedAt,
                  purchaseHistory: profileResponse?.profile?.recentPackages ?? current.subscription.purchaseHistory
                }
              : {
                  ...current.subscription,
                  purchaseHistory:
                    profileResponse?.profile?.recentPackages ?? current.subscription.purchaseHistory
                },
            bookings: syncedBookings
          };
        });

        if (profileResult.status === "rejected") {
          console.error("Could not sync profile from API", profileResult.reason);
        }
        if (bookingsResult.status === "rejected") {
          console.error("Could not sync bookings from API", bookingsResult.reason);
        }
        if (authResult.status === "rejected") {
          console.error("Could not sync auth state from API", authResult.reason);
        }
        if (professionalDirectoryResult.status === "rejected") {
          console.error("Could not sync professional directory from API", professionalDirectoryResult.reason);
        }
      } catch (error) {
        console.error("Could not sync patient portal from API", error);
      } finally {
        const deps = portalSyncDepsRef.current;
        if (
          batchEpoch === portalSyncEpochRef.current
          && Boolean(String(deps.sessionId ?? "").trim())
          && Boolean(deps.authToken)
        ) {
          setProfileSyncReady(true);
        }
      }
    };

    const PORTAL_SYNC_MIN_GAP_MS = 1100;

    const schedulePortalSync = (force = false): void => {
      const startBatch = (): void => {
        if (portalSyncMutexRef.current.inFlight) {
          portalSyncMutexRef.current.rerun = true;
          return;
        }

        const runWithRetry = async (): Promise<void> => {
          portalSyncMutexRef.current.inFlight = true;
          try {
            do {
              portalSyncMutexRef.current.rerun = false;
              await runSyncFromApi();
            } while (portalSyncMutexRef.current.rerun);
          } finally {
            portalSyncMutexRef.current.inFlight = false;
          }
        };

        void runWithRetry();
      };

      if (force) {
        if (portalSyncThrottleTimerRef.current) {
          clearTimeout(portalSyncThrottleTimerRef.current);
          portalSyncThrottleTimerRef.current = null;
        }
        portalSyncLastBatchAtRef.current = Date.now();
        startBatch();
        return;
      }

      const now = Date.now();
      const since = now - portalSyncLastBatchAtRef.current;
      if (since >= PORTAL_SYNC_MIN_GAP_MS || portalSyncLastBatchAtRef.current === 0) {
        portalSyncLastBatchAtRef.current = now;
        startBatch();
        return;
      }

      if (portalSyncThrottleTimerRef.current) {
        return;
      }
      portalSyncThrottleTimerRef.current = setTimeout(() => {
        portalSyncThrottleTimerRef.current = null;
        portalSyncLastBatchAtRef.current = Date.now();
        startBatch();
      }, PORTAL_SYNC_MIN_GAP_MS - since);
    };

    schedulePortalSyncRef.current = schedulePortalSync;
    schedulePortalSync();

    return () => {
      portalSyncEpochRef.current += 1;
      if (portalSyncThrottleTimerRef.current) {
        clearTimeout(portalSyncThrottleTimerRef.current);
        portalSyncThrottleTimerRef.current = null;
      }
      portalSyncLastBatchAtRef.current = 0;
    };
  }, [portalLoginKey]);

  useEffect(() => {
    if (!sessionId || !state.authToken) {
      portalLanguageBootstrapRef.current = false;
      return;
    }
    if (!portalLanguageBootstrapRef.current) {
      portalLanguageBootstrapRef.current = true;
      return;
    }
    let cancelled = false;
    void fetchProfessionalDirectory(state.authToken, state.language).then((rows) => {
      if (cancelled) {
        return;
      }
      setProfessionalDirectory(rows.map(mapDirectoryProfessionalToLegacyProfessional));
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [state.language, sessionId, state.authToken]);

  useEffect(() => {
    if (!sessionId || !state.authToken) {
      return;
    }

    void syncUserTimezone({
      baseUrl: API_BASE,
      token: state.authToken,
      timezone: sessionTimezone,
      persistPreference: false
    }).catch((error) => {
      console.error("Could not sync patient timezone from session", error);
    });
  }, [sessionId, sessionTimezone, state.authToken]);

  useEffect(() => {
    const sessionUserId = state.session?.id;
    if (!sessionUserId) {
      return;
    }

    const query = new URLSearchParams(location.search);
    const calendarSync = query.get("calendar_sync");
    if (!calendarSync) {
      return;
    }

    const callbackUserId = query.get("calendar_user_id");
    const calendarReason = query.get("calendar_reason");
    const onboardingPath = "/onboarding/final/matching";
    const resumeMatching = location.pathname.startsWith("/onboarding/final");

    const calendarNav = (pathname: string, extraSearch: Record<string, string> | null) => {
      const nextSearch = new URLSearchParams(location.search);
      nextSearch.delete("calendar_sync");
      nextSearch.delete("calendar_user_id");
      nextSearch.delete("calendar_reason");
      if (extraSearch) {
        for (const [k, v] of Object.entries(extraSearch)) {
          nextSearch.set(k, v);
        }
      }
      const qs = nextSearch.toString();
      navigate({ pathname, search: qs ? `?${qs}` : "" }, { replace: true });
    };

    const stripCalendarQueryOnly = () => {
      calendarNav(location.pathname, null);
    };

    // Otro usuario en el mismo navegador: OAuth volvió con un userId distinto al de la sesión actual.
    if (callbackUserId && callbackUserId !== sessionUserId) {
      setShowCalendarOnboarding(false);
      setCalendarOnboardingLoading(false);
      const ctxErr = getCalendarOfferContext();
      clearCalendarOfferContext();
      clearPostTrialCalendarPending();
      const errorTarget = ctxErr === "post-trial" ? "/" : resumeMatching ? onboardingPath : location.pathname;
      calendarNav(errorTarget, { calendar_sync: "error", calendar_reason: "session_mismatch" });
      return;
    }

    if (calendarSync === "connected" && callbackUserId === sessionUserId) {
      /**
       * No usar `calendarPromptDismissedUserIds` en las deps de este efecto: al actualizar la lista el
       * efecto se vuelve a disparar mientras `location.search` sigue teniendo `calendar_sync=connected`
       * (navigate aún no aplicó), y re-entrar repite setState → Maximum update depth (p. ej. en matching).
       */
      setCalendarPromptDismissedUserIds((current) => {
        if (current.includes(sessionUserId)) {
          return current;
        }
        const nextDismissed = [...current, sessionUserId];
        writeDismissedCalendarPromptUsers(nextDismissed);
        return nextDismissed;
      });
      setShowCalendarOnboarding(false);
      setCalendarOnboardingLoading(false);
      const ctx = getCalendarOfferContext();
      clearCalendarOfferContext();
      clearPostTrialCalendarPending();
      const targetPath =
        ctx === "post-trial" ? "/" : resumeMatching ? onboardingPath : location.pathname;
      calendarNav(targetPath, null);
      return;
    }

    if (
      (calendarSync === "error" || calendarSync === "cancelled")
      && callbackUserId === sessionUserId
    ) {
      setCalendarOnboardingLoading(false);
      setShowCalendarOnboarding(true);
      setCalendarOnboardingError(
        friendlyCalendarOAuthReturnMessage(state.language, {
          status: calendarSync === "cancelled" ? "cancelled" : "error",
          reason: calendarReason
        })
      );
      stripCalendarQueryOnly();
      return;
    }

    // Params huérfanos o mismatch ya manejado: limpiar la barra de dirección.
    stripCalendarQueryOnly();
  }, [location.pathname, location.search, navigate, state.language, state.session?.id]);

  /** Si el modal de Calendar está abierto y el sync ya trajo `googleCalendarConnected`, cerrar sin GET /calendar/status. */
  useEffect(() => {
    if (!showCalendarOnboarding || !state.authToken || !sessionId) {
      return;
    }
    if (!state.googleCalendarConnected) {
      return;
    }
    setShowCalendarOnboarding(false);
    const ctx = getCalendarOfferContext();
    clearCalendarOfferContext();
    clearPostTrialCalendarPending();
    navigate(ctx === "post-trial" ? "/" : "/onboarding/final/matching", { replace: true });
  }, [showCalendarOnboarding, state.authToken, sessionId, state.googleCalendarConnected, navigate]);

  useEffect(() => {
    if (!state.session || location.pathname === "/verify-email") {
      return;
    }

    const shouldRedirectToVerification = state.emailVerificationRequired && !state.session.emailVerified;
    if (shouldRedirectToVerification && location.pathname !== "/verify-email-required") {
      navigate("/verify-email-required", { replace: true });
      return;
    }

    if (!shouldRedirectToVerification && location.pathname === "/verify-email-required") {
      navigate("/", { replace: true });
    }
  }, [location.pathname, navigate, state.emailVerificationRequired, state.session?.emailVerified, state.session?.id]);

  if (isVerifyEmailRoute) {
    return <VerifyEmailTokenScreen language={state.language} onVerificationComplete={handleEmailLinkVerificationComplete} />;
  }

  if (!state.session && isForgotPasswordRoute) {
    return <PatientForgotPasswordScreen language={state.language} />;
  }

  if (!state.session && isResetPasswordRoute) {
    return <PatientResetPasswordScreen language={state.language} />;
  }

  if (!state.session) {
    return (
      <AuthScreen
        language={state.language}
        heroImage={heroImage}
        onHeroFallback={handleHeroFallback}
        onLogin={({ user, token, emailVerificationRequired }) => {
          setProfileSyncReady(false);
          setProfessionalDirectory(professionalsCatalog);
          setProfessionalPhotoMap(professionalImageMap);
          setShowCalendarOnboarding(false);
          setCalendarOnboardingLoading(false);
          setCalendarPromptDismissedUserIds(readDismissedCalendarPromptUsers());
          setState((current) => ({
            ...defaultState,
            language: current.language,
            currency: current.currency,
            patientMarket: current.patientMarket,
            profileResidencyCountry: current.profileResidencyCountry,
            profile: {
              ...defaultProfile,
              timezone: sessionTimezone
            },
            session: user,
            authToken: token,
            emailVerificationRequired
          }));
        }}
      />
    );
  }

  /** Antes de Calendar: verificación de email primero (la URL /verify-email-required ya no queda “tapada” por Calendar). */
  if (state.emailVerificationRequired && !state.session.emailVerified) {
    return (
      <VerifyEmailRequiredScreen
        language={state.language}
        token={state.authToken ?? ""}
        onLogout={() => {
          if (location.pathname === "/verify-email-required") {
            navigate("/", { replace: true });
          }
          setProfileSyncReady(false);
          setProfessionalDirectory(professionalsCatalog);
          setProfessionalPhotoMap(professionalImageMap);
          setState(defaultState);
        }}
      />
    );
  }

  if (showCalendarOnboarding) {
    return (
      <div className="intake-shell calendar-consent-shell">
        <section className="intake-card calendar-consent-card">
          <div className="calendar-consent-header">
            <strong>{t(state.language, { es: "Google Calendar", en: "Google Calendar", pt: "Google Calendar" })}</strong>
          </div>
          <div className="calendar-consent-body">
            <div className="calendar-consent-visual" aria-hidden="true" />
            <h2>
              {t(state.language, {
                es: "Integrá tus sesiones con Google Calendar",
                en: "Connect your sessions to Google Calendar",
                pt: "Integre suas sessoes ao Google Calendar"
              })}
            </h2>
            <p>
              {t(state.language, {
                es: "Mantené tu proceso terapéutico organizado y sin fricciones.",
                en: "Keep your therapeutic process organized and frictionless.",
                pt: "Mantenha seu processo terapeutico organizado e sem atrito."
              })}
            </p>
            <p className="calendar-consent-note">
              {t(state.language, {
                es: "Cada vez que confirmes una sesión, vas a poder añadirla a tu calendario con un solo clic. De esta forma, recibís recordatorios automáticos y tenés toda tu agenda sincronizada en un solo lugar.",
                en: "Each time you confirm a session, you can add it to your calendar in one click. This way, you get automatic reminders and keep your full agenda in one place.",
                pt: "Cada vez que confirmar uma sessão, você poderá adicioná-la ao calendário com um clique. Assim, recebe lembretes automáticos e mantém toda a sua agenda num só lugar."
              })}
            </p>
            {calendarOnboardingError ? (
              <p className="calendar-consent-error" role="status">
                {calendarOnboardingError}
              </p>
            ) : null}
          </div>
          <div className="button-row calendar-consent-actions">
            <button
              className="primary"
              type="button"
              onClick={() => void handleConnectCalendarFromOnboarding()}
              disabled={calendarOnboardingLoading}
            >
              {calendarOnboardingLoading
                ? t(state.language, { es: "Conectando...", en: "Connecting...", pt: "Conectando..." })
                : t(state.language, { es: "Conectar ahora", en: "Connect now", pt: "Conectar agora" })}
            </button>
            <button
              type="button"
              onClick={() => {
                setCalendarOnboardingError("");
                if (state.session?.id) {
                  const nextDismissed = [...calendarPromptDismissedUserIds, state.session.id];
                  writeDismissedCalendarPromptUsers(nextDismissed);
                  setCalendarPromptDismissedUserIds(nextDismissed);
                }
                const ctx = getCalendarOfferContext();
                clearCalendarOfferContext();
                clearPostTrialCalendarPending();
                setShowCalendarOnboarding(false);
                navigate(ctx === "post-trial" ? "/" : "/onboarding/final/matching", { replace: true });
              }}
              disabled={calendarOnboardingLoading}
            >
              {t(state.language, { es: "Lo hago después", en: "I'll do it later", pt: "Depois eu faço" })}
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!profileSyncReady) {
    return (
      <div className="intake-shell">
        <section className="intake-card">
          <p>{t(state.language, { es: "Cargando tu perfil...", en: "Loading your profile...", pt: "Carregando seu perfil..." })}</p>
        </section>
      </div>
    );
  }

  if (!state.intake?.completed) {
    /**
     * Aplicación de la respuesta del backend (igual sea wizard clásico o chat IA).
     * Centraliza el side-effect post-intake: market, riskLevel,
     * navegación a calendar/matching, y manejo del caso "intake ya completado".
     */
    const applyIntakeCompletion = (
      response: SubmitIntakeApiResponse,
      answers: Record<string, string>
    ): void => {
      const riskLevel = response.intake.riskLevel as RiskLevel;
      const nextMarket = isMarket(response.market) ? response.market : undefined;

      const sessionUserId = state.session?.id ?? "";
      const offerGoogleCalendarStep =
        riskLevel === "low"
        && sessionUserId.length > 0
        && !calendarPromptDismissedUserIds.includes(sessionUserId)
        && state.bookings.length === 0
        && state.subscription.purchaseHistory.length === 0;

      flushSync(() => {
        setState((current) => ({
          ...current,
          onboardingFinalCompleted: false,
          therapistSelectionCompleted: false,
          assignedProfessionalId: null,
          assignedProfessionalName: null,
          session: current.session ? { ...current.session } : null,
          ...(nextMarket
            ? {
                patientMarket: nextMarket,
                currency: defaultDisplayCurrencyForMarket(nextMarket)
              }
            : {}),
          intake: {
            completed: true,
            completedAt: response.intake.completedAt,
            riskLevel,
            riskBlocked: riskLevel !== "low",
            triageDecision: riskLevel === "low" ? null : "pending",
            answers
          }
        }));
      });

      if (riskLevel !== "low") {
        navigate("/", { replace: true });
        return;
      }
      if (sessionUserId.length === 0) {
        navigate("/onboarding/final/matching", { replace: true });
        return;
      }

      if (offerGoogleCalendarStep) {
        flushSync(() => {
          setCalendarOfferContext("pre-matching");
          setShowCalendarOnboarding(true);
        });
      } else {
        navigate("/onboarding/final/matching", { replace: true });
      }
    };

    const cleanupAndLogout = () => {
      setProfileSyncReady(false);
      setProfessionalDirectory(professionalsCatalog);
      setProfessionalPhotoMap(professionalImageMap);
      setState(defaultState);
    };

    /**
     * Mientras el lookup de la sesión activa del chat está en vuelo, mostramos un
     * loading neutro: evita "parpadear" el chooser solo para saltar al chat un
     * instante después cuando hay sesión retomable.
     */
    const intakeChatGateActive =
      publicFeatures.intakeChatEnabled && Boolean(state.authToken) && !chatSessionLookupDone;

    if (intakeChatGateActive) {
      return (
        <div className="intake-shell">
          <section className="intake-card">
            <p>{t(state.language, { es: "Cargando entrevista...", en: "Loading intake...", pt: "Carregando entrevista..." })}</p>
          </section>
        </div>
      );
    }

    if (publicFeatures.intakeChatEnabled && intakeMethod === "chat") {
      return (
        <IntakeChatScreen
          user={state.session}
          language={state.language}
          authToken={state.authToken!}
          initialSession={activeChatSession}
          onSwitchToClassic={() => {
            setIntakeMethod("classic");
          }}
          onCancel={cleanupAndLogout}
          onComplete={async (response) => {
            try {
              applyIntakeCompletion(response, {});
            } catch (err) {
              if (err instanceof Error && err.message.includes("Intake already completed")) {
                setState((current) => ({
                  ...current,
                  intake: {
                    completed: true,
                    completedAt: new Date().toISOString(),
                    riskLevel: current.intake?.riskLevel ?? "low",
                    riskBlocked: (current.intake?.riskLevel ?? "low") !== "low",
                    triageDecision: current.intake?.triageDecision ?? null,
                    answers: current.intake?.answers ?? {}
                  }
                }));
                return;
              }
              throw err;
            }
          }}
        />
      );
    }

    if (publicFeatures.intakeChatEnabled && intakeMethod === "chooser") {
      return (
        <IntakeMethodChooserScreen
          language={state.language}
          hasActiveChatSession={Boolean(activeChatSession)}
          onChooseClassic={() => setIntakeMethod("classic")}
          onChooseChat={() => setIntakeMethod("chat")}
          onBack={cleanupAndLogout}
        />
      );
    }

    return (
      <IntakeScreen
        user={state.session}
        language={state.language}
        profileResidencyCountryIso={state.profileResidencyCountry}
        onBack={cleanupAndLogout}
        onCancel={cleanupAndLogout}
        onSafetyFrequentAbandon={cleanupAndLogout}
        onComplete={async ({ answers, residencyCountry }) => {
          if (!state.authToken) {
            throw new Error("No se encontró sesión autenticada");
          }

          try {
            const response = await apiRequest<SubmitIntakeApiResponse>(
              "/api/profiles/me/intake",
              {
                method: "POST",
                body: JSON.stringify({ answers, residencyCountry })
              },
              state.authToken
            );
            applyIntakeCompletion(response, answers);
          } catch (requestError) {
            if (requestError instanceof Error && requestError.message.includes("Intake already completed")) {
              setState((current) => ({
                ...current,
                intake: {
                  completed: true,
                  completedAt: new Date().toISOString(),
                  riskLevel: current.intake?.riskLevel ?? "low",
                  riskBlocked: (current.intake?.riskLevel ?? "low") !== "low",
                  triageDecision: current.intake?.triageDecision ?? null,
                  answers: current.intake?.answers ?? {}
                }
              }));
              return;
            }

            throw requestError;
          }
        }}
      />
    );
  }

  return (
    <>
      <MainPortal
        state={state}
        professionalDirectory={professionalDirectory}
        professionalPhotoMap={professionalPhotoMap}
        sessionTimezone={sessionTimezone}
        onStateChange={updateState}
        onLogout={() => {
          clearPostTrialCalendarPending();
          clearCalendarOfferContext();
          setProfileSyncReady(false);
          setProfessionalDirectory(professionalsCatalog);
          setProfessionalPhotoMap(professionalImageMap);
          setState(defaultState);
        }}
      />
      {/**
       * Chat IA flotante de acompañamiento del tratamiento. Solo se monta en el
       * portal "post-intake" del paciente (no durante el wizard ni la pantalla
       * de email-required) y detrás del feature flag público. El propio FAB es
       * lazy: no llama al backend hasta que el paciente abre el panel.
       */}
      {publicFeatures.treatmentChatEnabled && state.authToken ? (
        <TreatmentChatFAB authToken={state.authToken} language={state.language} />
      ) : null}
    </>
  );
}
