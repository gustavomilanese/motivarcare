import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
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
import { AuthScreen } from "./pages/AuthScreen";
import { VerifyEmailRequiredScreen } from "./pages/VerifyEmailRequiredScreen";
import { VerifyEmailTokenScreen } from "./pages/VerifyEmailTokenScreen";
import { MainPortal } from "./pages/MainPortal";
import { heroImage, professionalsCatalog } from "./data/professionalsCatalog";
import { IntakeScreen } from "../intake/pages/IntakeScreen";
import { API_BASE, STORAGE_KEY, apiRequest } from "./services/api";
import type {
  Booking,
  AuthMeApiResponse,
  BookingsMineApiResponse,
  Message,
  PatientAppState,
  PatientProfile,
  ProfileMeApiResponse,
  RiskLevel,
  SessionUser,
  SubmitIntakeApiResponse
} from "./types";

const initialMessages: Message[] = [];

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
  bookings: [],
  trialUsedProfessionalIds: [],
  messages: initialMessages,
  subscription: {
    packageId: null,
    packageName: "Sin paquete activo",
    creditsTotal: 0,
    creditsRemaining: 0
  },
  profile: defaultProfile
};

function loadState(): PatientAppState {
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
        : Boolean(parsed.assignedProfessionalId) && parsedBookings.some((booking) => booking.status === "confirmed");
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

function handleHeroFallback(event: SyntheticEvent<HTMLImageElement>): void {
  const img = event.currentTarget;
  img.onerror = null;
  img.src = "/images/hero-therapy.svg";
}

export function App() {
  const [state, setState] = useState<PatientAppState>(() => loadState());
  const [profileSyncReady, setProfileSyncReady] = useState(false);
  const sessionTimezone = useMemo(() => detectBrowserTimezone(), []);
  const isVerifyEmailRoute = useMemo(() => window.location.pathname === "/verify-email", []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const updateState = (updater: (current: PatientAppState) => PatientAppState) => {
    setState((current) => updater(current));
  };

  const sessionId = state.session?.id;

  useEffect(() => {
    if (!sessionId || !state.authToken) {
      setProfileSyncReady(false);
      return;
    }

    setProfileSyncReady(false);

    let cancelled = false;

    const syncFromApi = async () => {
      try {
        const [profileResult, bookingsResult, authResult] = await Promise.allSettled([
          apiRequest<ProfileMeApiResponse>("/api/profiles/me", {}, state.authToken ?? undefined),
          apiRequest<BookingsMineApiResponse>("/api/bookings/mine", {}, state.authToken ?? undefined),
          apiRequest<AuthMeApiResponse>("/api/auth/me", {}, state.authToken ?? undefined)
        ]);

        if (cancelled) {
          return;
        }

        const profileResponse = profileResult.status === "fulfilled" ? profileResult.value : null;
        const bookingsResponse = bookingsResult.status === "fulfilled" ? bookingsResult.value : null;
        const authResponse = authResult.status === "fulfilled" ? authResult.value : null;

        const latestPackage = profileResponse?.profile?.latestPackage ?? null;
        const remoteAssignedProfessional = profileResponse?.profile?.activeProfessional ?? null;
        const hasCatalogProfessional = remoteAssignedProfessional
          ? professionalsCatalog.some((item) => item.id === remoteAssignedProfessional.id)
          : false;

        const bookingsFromApi: Booking[] = (bookingsResponse?.bookings ?? [])
          .map((booking) => mapBookingFromMineApi(booking))
          .filter((booking): booking is Booking => booking !== null);

        setState((current) => {
          if (!current.session || current.session.id !== sessionId) {
            return current;
          }

          return {
            ...current,
            onboardingFinalCompleted:
              current.onboardingFinalCompleted
              || Boolean(remoteAssignedProfessional && bookingsFromApi.some((booking) => booking.status === "confirmed")),
            therapistSelectionCompleted:
              current.therapistSelectionCompleted
              || Boolean(remoteAssignedProfessional)
              || bookingsFromApi.length > 0,
            assignedProfessionalId: remoteAssignedProfessional?.id ?? current.assignedProfessionalId,
            assignedProfessionalName: remoteAssignedProfessional?.fullName ?? current.assignedProfessionalName,
            selectedProfessionalId:
              hasCatalogProfessional && remoteAssignedProfessional
                ? remoteAssignedProfessional.id
                : current.selectedProfessionalId,
            activeChatProfessionalId:
              hasCatalogProfessional && remoteAssignedProfessional
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
                  emailVerified: authResponse.user.emailVerified
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
                  riskBlocked: (profileResponse.profile.intakeRiskLevel ?? "low") !== "low",
                  answers: current.intake?.answers ?? {}
                }
              : current.intake,
            subscription: latestPackage
              ? {
                  packageId: latestPackage.id,
                  packageName: latestPackage.name,
                  creditsTotal: latestPackage.totalCredits,
                  creditsRemaining: latestPackage.remainingCredits,
                  purchasedAt: latestPackage.purchasedAt
                }
              : current.subscription,
            bookings: bookingsResponse ? bookingsFromApi : current.bookings
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
    if (!state.session || window.location.pathname === "/verify-email") {
      return;
    }

    const shouldRedirectToVerification = state.emailVerificationRequired && !state.session.emailVerified;
    if (shouldRedirectToVerification && window.location.pathname !== "/verify-email-required") {
      window.history.replaceState({}, "", "/verify-email-required");
      return;
    }

    if (!shouldRedirectToVerification && window.location.pathname === "/verify-email-required") {
      window.history.replaceState({}, "", "/");
    }
  }, [state.emailVerificationRequired, state.session?.emailVerified, state.session?.id]);

  if (isVerifyEmailRoute) {
    return <VerifyEmailTokenScreen language={state.language} />;
  }

  if (!state.session) {
    return (
      <AuthScreen
        language={state.language}
        currency={state.currency}
        heroImage={heroImage}
        onHeroFallback={handleHeroFallback}
        onLanguageChange={(language) => {
          setState((current) => ({
            ...current,
            language
          }));
        }}
        onCurrencyChange={(currency) => {
          setState((current) => ({
            ...current,
            currency
          }));
        }}
        onLogin={({ user, token, emailVerificationRequired }) => {
          setProfileSyncReady(false);
          setState((current) => ({
            ...current,
            session: user,
            authToken: token,
            emailVerificationRequired
          }));
        }}
      />
    );
  }

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
          if (window.location.pathname === "/verify-email-required") {
            window.history.replaceState({}, "", "/");
          }
          setProfileSyncReady(false);
          setState(defaultState);
        }}
      />
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
    return (
      <IntakeScreen
        user={state.session}
        language={state.language}
        onComplete={async (answers) => {
          if (!state.authToken) {
            throw new Error("No se encontro sesion autenticada");
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

            setState((current) => ({
              ...current,
              intake: {
                completed: true,
                completedAt: response.intake.completedAt,
                riskLevel,
                riskBlocked: riskLevel !== "low",
                answers
              }
            }));
          } catch (requestError) {
            if (requestError instanceof Error && requestError.message.includes("Intake already completed")) {
              setState((current) => ({
                ...current,
                intake: {
                  completed: true,
                  completedAt: new Date().toISOString(),
                  riskLevel: current.intake?.riskLevel ?? "low",
                  riskBlocked: (current.intake?.riskLevel ?? "low") !== "low",
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
      sessionTimezone={sessionTimezone}
      onStateChange={updateState}
      onLogout={() => {
        setProfileSyncReady(false);
        setState(defaultState);
      }}
    />
  );
}
