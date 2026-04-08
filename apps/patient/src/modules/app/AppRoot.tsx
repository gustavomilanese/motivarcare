import { useEffect, useLayoutEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import { flushSync } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import {
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
  type LocalizedText,
  textByLanguage
} from "@therapy/i18n-config";
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
import { VerifyEmailRequiredScreen } from "./pages/VerifyEmailRequiredScreen";
import { VerifyEmailTokenScreen } from "./pages/VerifyEmailTokenScreen";
import { MainPortal } from "./pages/MainPortal";
import { heroImage, professionalImageMap, professionalsCatalog } from "./data/professionalsCatalog";
import { PostIntakePhotoScreen } from "./components/PostIntakePhotoScreen";
import { IntakeScreen } from "../intake/pages/IntakeScreen";
import { API_BASE, STORAGE_KEY, apiRequest, resolvePublicAssetUrl, setPatientApiUnauthorizedHandler } from "./services/api";
import { fetchProfessionalDirectory } from "../matching/services/professionals";
import type {
  Booking,
  AuthMeApiResponse,
  BookingsMineApiResponse,
  Message,
  PatientAppState,
  PatientProfile,
  ProfileMeApiResponse,
  Professional,
  RiskLevel,
  SessionUser,
  SubmitIntakeApiResponse
} from "./types";

const initialMessages: Message[] = [];
const CALENDAR_PROMPT_DISMISSED_USERS_KEY = "patient_calendar_prompt_dismissed_users";
/** Survives full-page Google OAuth redirect if localStorage is briefly empty (same origin). */
const CALENDAR_OAUTH_LOCAL_STORAGE_BACKUP_KEY = "mc_calendar_oauth_ls_backup";
const POST_INTAKE_PHOTO_SESSION_KEY = "mc_patient_post_intake_photo";

function markPostIntakePhotoPending(userId: string) {
  try {
    window.sessionStorage.setItem(POST_INTAKE_PHOTO_SESSION_KEY, userId);
  } catch {
    // ignore
  }
}

function clearPostIntakePhotoPending() {
  try {
    window.sessionStorage.removeItem(POST_INTAKE_PHOTO_SESSION_KEY);
  } catch {
    // ignore
  }
}

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
  emailVerificationRequired: false,
  language: "es",
  currency: "USD",
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
      currency: (SUPPORTED_CURRENCIES as readonly string[]).includes((parsed as any).currency)
        ? (parsed as any).currency
        : "USD",
      trialUsedProfessionalIds: parsed.trialUsedProfessionalIds ?? [],
      session: parsed.session
        ? {
            ...parsed.session,
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
          ))
          : []
      },
      profile: {
        ...defaultProfile,
        ...parsed.profile,
        cards: parsed.profile?.cards ?? []
      }
    };
  } catch {
    return defaultState;
  }
}

function saveState(state: PatientAppState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
  const [showPostIntakePhotoStep, setShowPostIntakePhotoStep] = useState(false);
  const [postIntakePhotoBusy, setPostIntakePhotoBusy] = useState(false);
  const calendarAfterPhotoRef = useRef(false);
  const sessionTimezone = useMemo(() => detectBrowserTimezone(), []);
  const isVerifyEmailRoute = useMemo(() => location.pathname === "/verify-email", [location.pathname]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    setPatientApiUnauthorizedHandler(() => {
      clearPostIntakePhotoPending();
      clearPostTrialCalendarPending();
      clearCalendarOfferContext();
      setShowPostIntakePhotoStep(false);
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

  const updateState = (updater: (current: PatientAppState) => PatientAppState) => {
    setState((current) => updater(current));
  };

  const sessionId = state.session?.id;

  /** Calendar opcional tras intake y antes del matching; deja de aplicar al elegir terapeuta / reservar. */
  useEffect(() => {
    if (!sessionId || !state.intake?.completed || state.intake.riskBlocked) {
      return;
    }
    try {
      if (window.sessionStorage.getItem(POST_INTAKE_PHOTO_SESSION_KEY) === sessionId) {
        setShowPostIntakePhotoStep(true);
      }
    } catch {
      // ignore
    }
  }, [sessionId, state.intake?.completed, state.intake?.riskBlocked]);

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
    if (showPostIntakePhotoStep) {
      return;
    }
    try {
      if (window.sessionStorage.getItem(POST_INTAKE_PHOTO_SESSION_KEY) === sessionId) {
        return;
      }
    } catch {
      // ignore
    }
    setCalendarOfferContext("pre-matching");
    setShowCalendarOnboarding(true);
  }, [
    sessionId,
    state.authToken,
    shouldOfferCalendarOnboardingBeforeMatching,
    calendarPromptDismissedUserIds,
    showCalendarOnboarding,
    showPostIntakePhotoStep
  ]);

  /** Tras confirmar sesión de prueba: ofrecer Google Calendar si aún no está conectado. */
  useEffect(() => {
    if (!sessionId || !state.authToken || !profileSyncReady) {
      return;
    }
    if (showPostIntakePhotoStep || showCalendarOnboarding) {
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

    let cancelled = false;

    void apiRequest<{ connected: boolean }>("/api/auth/google/calendar/status", {}, state.authToken)
      .then((response) => {
        if (cancelled) {
          return;
        }
        if (response.connected) {
          clearPostTrialCalendarPending();
          return;
        }
        setCalendarOfferContext("post-trial");
        setShowCalendarOnboarding(true);
      })
      .catch(() => {
        if (!cancelled) {
          setCalendarOfferContext("post-trial");
          setShowCalendarOnboarding(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    sessionId,
    state.authToken,
    profileSyncReady,
    showPostIntakePhotoStep,
    showCalendarOnboarding,
    calendarPromptDismissedUserIds
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
        notConfigured
          ? t(state.language, {
              es: "Google Calendar no está disponible todavía: el servidor necesita GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET. Podés continuar y conectar el calendario más tarde desde Ajustes.",
              en: "Google Calendar is not available yet: the server needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. You can continue and connect later from Settings.",
              pt: "O Google Calendar ainda nao esta disponivel: o servidor precisa de GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET. Voce pode continuar e conectar depois em Configuracoes."
            })
          : raw || t(state.language, { es: "No se pudo iniciar la conexión con Google.", en: "Could not start Google connection.", pt: "Nao foi possivel iniciar a conexao com o Google." })
      );
    } finally {
      setCalendarOnboardingLoading(false);
    }
  };

  const finishPostIntakePhoto = async (avatarDataUrl: string | null) => {
    if (!state.authToken) {
      return;
    }
    setPostIntakePhotoBusy(true);
    try {
      let avatarUrl: string | null = state.session?.avatarUrl ?? null;
      if (avatarDataUrl?.startsWith("data:image")) {
        try {
          const mePatch = await apiRequest<{ user: { avatarUrl?: string | null } }>(
            "/api/auth/me",
            { method: "PATCH", body: JSON.stringify({ avatarUrl: avatarDataUrl }) },
            state.authToken
          );
          avatarUrl = mePatch.user?.avatarUrl ?? avatarDataUrl;
        } catch {
          // Intake listo; la foto se puede reintentar desde Mi cuenta.
        }
      }
      setState((c) => ({
        ...c,
        session: c.session ? { ...c.session, avatarUrl } : null
      }));
      clearPostIntakePhotoPending();
      setShowPostIntakePhotoStep(false);
      if (calendarAfterPhotoRef.current) {
        flushSync(() => {
          setCalendarOfferContext("pre-matching");
          setShowCalendarOnboarding(true);
        });
      } else {
        navigate("/onboarding/final/matching", { replace: true });
      }
      calendarAfterPhotoRef.current = false;
    } finally {
      setPostIntakePhotoBusy(false);
    }
  };

  useEffect(() => {
    if (!sessionId || !state.authToken) {
      setProfileSyncReady(false);
      setProfessionalDirectory(professionalsCatalog);
      setProfessionalPhotoMap(professionalImageMap);
      return;
    }

    setProfileSyncReady(false);

    let cancelled = false;

    const syncFromApi = async () => {
      try {
        const [profileResult, bookingsResult, authResult, professionalDirectoryResult] = await Promise.allSettled([
          apiRequest<ProfileMeApiResponse>("/api/profiles/me", {}, state.authToken ?? undefined),
          apiRequest<BookingsMineApiResponse>("/api/bookings/mine", {}, state.authToken ?? undefined),
          apiRequest<AuthMeApiResponse>("/api/auth/me", {}, state.authToken ?? undefined),
          fetchProfessionalDirectory(state.authToken ?? undefined, state.language)
        ]);

        if (cancelled) {
          return;
        }

        const profileResponse = profileResult.status === "fulfilled" ? profileResult.value : null;
        const bookingsResponse = bookingsResult.status === "fulfilled" ? bookingsResult.value : null;
        const authResponse = authResult.status === "fulfilled" ? authResult.value : null;
        const professionalDirectoryResponse = professionalDirectoryResult.status === "fulfilled" ? professionalDirectoryResult.value : null;

        let mergedPhotos: Record<string, string> = { ...professionalImageMap };

        if (professionalDirectoryResponse && professionalDirectoryResponse.length > 0) {
          const mapped = professionalDirectoryResponse.map(mapDirectoryProfessionalToLegacyProfessional);
          setProfessionalDirectory(mapped);
          for (const professional of professionalDirectoryResponse) {
            const resolved = resolvePublicAssetUrl(professional.photoUrl);
            if (resolved) {
              mergedPhotos[professional.id] = resolved;
            }
          }
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
          if (!current.session || current.session.id !== sessionId) {
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
            : remoteAssignedProfessional?.fullName ?? current.assignedProfessionalName;

          return {
            ...current,
            onboardingFinalCompleted:
              current.onboardingFinalCompleted
              || hasRemoteOnboardingCompletionSignal,
            therapistSelectionCompleted: therapistSelectionCompletedMerged,
            assignedProfessionalId: assignedProfessionalIdMerged,
            assignedProfessionalName: assignedProfessionalNameMerged,
            selectedProfessionalId:
              remoteAssignedProfessional
                ? remoteAssignedProfessional.id
                : current.selectedProfessionalId,
            activeChatProfessionalId:
              remoteAssignedProfessional
                ? remoteAssignedProfessional.id
                : current.activeChatProfessionalId,
            profile: {
              ...current.profile,
              timezone: profileResponse?.profile?.timezone ?? current.profile.timezone
            },
            session: authResponse?.user
              ? {
                  id: authResponse.user.id,
                  fullName: authResponse.user.fullName,
                  email: authResponse.user.email,
                  emailVerified: authResponse.user.emailVerified,
                  avatarUrl: authResponse.user.avatarUrl ?? null
                }
              : current.session,
            emailVerificationRequired:
              typeof authResponse?.emailVerificationRequired === "boolean"
                ? authResponse.emailVerificationRequired
                : current.emailVerificationRequired,
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
        if (!cancelled) {
          setProfileSyncReady(true);
        }
      }
    };

    void syncFromApi();

    return () => {
      cancelled = true;
    };
  }, [sessionId, state.authToken]);

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
    if (!state.session?.id) {
      return;
    }

    const query = new URLSearchParams(location.search);
    const calendarSync = query.get("calendar_sync");
    const callbackUserId = query.get("calendar_user_id");
    const onboardingPath = "/onboarding/final/matching";
    const resumeMatching = location.pathname.startsWith("/onboarding/final");

    const calendarNav = (pathname: string, extraSearch: Record<string, string> | null) => {
      const nextSearch = new URLSearchParams(location.search);
      nextSearch.delete("calendar_sync");
      nextSearch.delete("calendar_user_id");
      if (extraSearch) {
        for (const [k, v] of Object.entries(extraSearch)) {
          nextSearch.set(k, v);
        }
      }
      const qs = nextSearch.toString();
      navigate({ pathname, search: qs ? `?${qs}` : "" }, { replace: true });
    };

    if (calendarSync === "connected" && callbackUserId === state.session.id) {
      const nextDismissed = [...calendarPromptDismissedUserIds, state.session.id];
      writeDismissedCalendarPromptUsers(nextDismissed);
      setCalendarPromptDismissedUserIds(nextDismissed);
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

    if (!callbackUserId || callbackUserId === state.session.id) {
      return;
    }

    // Keep current session stable and return safely to onboarding flow.
    setShowCalendarOnboarding(false);
    setCalendarOnboardingLoading(false);
    const ctxErr = getCalendarOfferContext();
    clearCalendarOfferContext();
    clearPostTrialCalendarPending();
    const errorTarget = ctxErr === "post-trial" ? "/" : resumeMatching ? onboardingPath : location.pathname;
    calendarNav(errorTarget, { calendar_sync: "error", calendar_reason: "session_mismatch" });
  }, [calendarPromptDismissedUserIds, location.pathname, location.search, navigate, state.session?.id]);

  useEffect(() => {
    if (!showCalendarOnboarding || !state.authToken || !state.session) {
      return;
    }

    let cancelled = false;
    void apiRequest<{ connected: boolean }>(
      "/api/auth/google/calendar/status",
      {},
      state.authToken
    )
      .then((response) => {
        if (!cancelled && response.connected) {
          setShowCalendarOnboarding(false);
          const ctx = getCalendarOfferContext();
          clearCalendarOfferContext();
          clearPostTrialCalendarPending();
          navigate(ctx === "post-trial" ? "/" : "/onboarding/final/matching", { replace: true });
        }
      })
      .catch(() => {
      });

    return () => {
      cancelled = true;
    };
  }, [showCalendarOnboarding, state.authToken, state.session, navigate]);

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
    return <VerifyEmailTokenScreen language={state.language} />;
  }

  if (!state.session) {
    return (
      <AuthScreen
        language={state.language}
        heroImage={heroImage}
        onHeroFallback={handleHeroFallback}
        onLogin={({ user, token, emailVerificationRequired }) => {
          clearPostIntakePhotoPending();
          setShowPostIntakePhotoStep(false);
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
        email={state.session.email}
        showDevBypass={(import.meta as { env?: Record<string, boolean | string | undefined> }).env?.DEV === true}
        onVerified={() =>
          setState((current) => ({
            ...current,
            session: current.session ? { ...current.session, emailVerified: true } : null
          }))
        }
        onLogout={() => {
          if (location.pathname === "/verify-email-required") {
            navigate("/", { replace: true });
          }
          clearPostIntakePhotoPending();
          setShowPostIntakePhotoStep(false);
          setProfileSyncReady(false);
          setProfessionalDirectory(professionalsCatalog);
          setProfessionalPhotoMap(professionalImageMap);
          setState(defaultState);
        }}
      />
    );
  }

  if (showPostIntakePhotoStep && state.session && state.intake?.completed) {
    return (
      <PostIntakePhotoScreen
        user={state.session}
        language={state.language}
        busy={postIntakePhotoBusy}
        onContinue={finishPostIntakePhoto}
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
              <p className="calendar-consent-error" role="alert">
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

  if (!profileSyncReady && !showPostIntakePhotoStep) {
    return (
      <div className="intake-shell">
        <section className="intake-card">
          <p>{t(state.language, { es: "Cargando tu perfil...", en: "Loading your profile...", pt: "Carregando seu perfil..." })}</p>
        </section>
      </div>
    );
  }

  if (!state.intake?.completed) {
    return (
      <IntakeScreen
        user={state.session}
        language={state.language}
        onBack={() => {
          setProfileSyncReady(false);
          setProfessionalDirectory(professionalsCatalog);
          setProfessionalPhotoMap(professionalImageMap);
          setState(defaultState);
        }}
        onCancel={() => {
          setProfileSyncReady(false);
          setProfessionalDirectory(professionalsCatalog);
          setProfessionalPhotoMap(professionalImageMap);
          setState(defaultState);
        }}
        onComplete={async ({ answers }) => {
          if (!state.authToken) {
            throw new Error("No se encontró sesión autenticada");
          }

          try {
            const response = await apiRequest<SubmitIntakeApiResponse>(
              "/api/profiles/me/intake",
              {
                method: "POST",
                body: JSON.stringify({ answers })
              },
              state.authToken
            );

            const riskLevel = response.intake.riskLevel as RiskLevel;

            const sessionUserId = state.session?.id ?? "";
            const offerGoogleCalendarStep =
              riskLevel === "low"
              && sessionUserId.length > 0
              && !calendarPromptDismissedUserIds.includes(sessionUserId)
              && state.bookings.length === 0
              && state.subscription.purchaseHistory.length === 0;

            calendarAfterPhotoRef.current = offerGoogleCalendarStep;

            flushSync(() => {
              setState((current) => ({
                ...current,
                onboardingFinalCompleted: false,
                therapistSelectionCompleted: false,
                assignedProfessionalId: null,
                assignedProfessionalName: null,
                session: current.session ? { ...current.session } : null,
                intake: {
                  completed: true,
                  completedAt: response.intake.completedAt,
                  riskLevel,
                  riskBlocked: riskLevel !== "low",
                  triageDecision: riskLevel === "low" ? null : "pending",
                  answers
                }
              }));
              if (riskLevel === "low" && sessionUserId.length > 0) {
                markPostIntakePhotoPending(sessionUserId);
                setShowPostIntakePhotoStep(true);
              }
            });

            if (riskLevel !== "low") {
              clearPostIntakePhotoPending();
              navigate("/", { replace: true });
              return;
            }
            if (sessionUserId.length === 0) {
              clearPostIntakePhotoPending();
              navigate("/onboarding/final/matching", { replace: true });
            }
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
    <MainPortal
      state={state}
      professionalDirectory={professionalDirectory}
      professionalPhotoMap={professionalPhotoMap}
      sessionTimezone={sessionTimezone}
      onStateChange={updateState}
      onLogout={() => {
        clearPostIntakePhotoPending();
        clearPostTrialCalendarPending();
        clearCalendarOfferContext();
        setShowPostIntakePhotoStep(false);
        setProfileSyncReady(false);
        setProfessionalDirectory(professionalsCatalog);
        setProfessionalPhotoMap(professionalImageMap);
        setState(defaultState);
      }}
    />
  );
}
