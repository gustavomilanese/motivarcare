import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  textByLanguage
} from "@therapy/i18n-config";
import { detectBrowserTimezone, syncUserTimezone } from "@therapy/auth";
import {
  createDefaultOnboardingPatchDraft,
  type OnboardingPatchDraft
} from "../onboarding";
import {
  clearPendingOnboardingDisplayFullName,
  clearPendingWebOnboardingAuth,
  clearResumeWebOnboardingStep,
  readContinueWebOnboardingAfterEmailVerify,
  readPendingOnboardingDisplayFullName,
  readPendingWebOnboardingAuth,
  readResumeWebOnboardingStep,
  savePendingOnboardingDisplayFullName,
  WEB_ONBOARDING_STEP_AFTER_EMAIL_VERIFY
} from "../onboarding/webOnboardingResumeStorage.js";
import { ProfessionalAuthFlow } from "./pages/ProfessionalAuthFlow";
import { ForgotPasswordScreen } from "./pages/ForgotPasswordScreen";
import { ProfessionalPortal } from "./pages/ProfessionalPortal";
import { ResetPasswordScreen } from "./pages/ResetPasswordScreen";
import { VerifyEmailRequiredScreen } from "./pages/VerifyEmailRequiredScreen";
import { VerifyEmailTokenScreen } from "./pages/VerifyEmailTokenScreen";
import { professionalSurfaceMessage, friendlyCalendarOAuthReturnMessage } from "./lib/friendlyProfessionalSurfaceMessages";
import { ProPageLoader } from "./components/ProPageLoader";
import { ProfessionalRegistrationApprovalScreen } from "./components/ProfessionalRegistrationApprovalScreen";
import {
  API_BASE,
  CALENDAR_ONBOARDING_PENDING_USER_ID_KEY,
  CURRENCY_KEY,
  EMAIL_VERIFICATION_REQUIRED_KEY,
  LANGUAGE_KEY,
  PROFESSIONAL_CALENDAR_OAUTH_RETURN_PATH_KEY,
  TOKEN_KEY,
  USER_KEY,
  apiRequest,
  backupProfessionalLocalStorageForCalendarOAuth,
  rememberProfessionalAuthCalendarConnectedSession,
  restoreProfessionalPortalAfterCalendarOAuth,
  setProfessionalApiUnauthorizedHandler
} from "./services/api";
import { resolveProfessionalPortalLanguage } from "../../professionalPortalDefaultLanguage";
import {
  PROFESSIONAL_GOOGLE_CALENDAR_SCOPE_POINTS
} from "../onboarding/constants/professionalProfileGuidanceCopy";
import { ProfessionalGuidanceList } from "../onboarding/components/ProfessionalGuidanceBanner";
import type { AuthUser } from "./types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function readStoredUser(): AuthUser | null {
  const token = window.localStorage.getItem(TOKEN_KEY);
  const rawUser = window.localStorage.getItem(USER_KEY);
  if (!token || !rawUser) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawUser) as AuthUser;
    const user: AuthUser = {
      ...parsed,
      emailVerified:
        typeof (parsed as { emailVerified?: unknown }).emailVerified === "boolean"
          ? Boolean((parsed as { emailVerified?: unknown }).emailVerified)
          : true
    };
    if (!user?.professionalProfileId || user.role !== "PROFESSIONAL") {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

type AuthMeUserPayload = {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  emailVerified: boolean;
  role: "PATIENT" | "PROFESSIONAL" | "ADMIN";
  professionalProfileId: string | null;
  avatarUrl?: string | null;
  registrationApproval?: "PENDING" | "APPROVED" | "REJECTED";
  profileCreatedAt?: string | null;
};

function buildProfessionalAuthUser(payload: AuthMeUserPayload): AuthUser | null {
  if (payload.role !== "PROFESSIONAL" || !payload.professionalProfileId) {
    return null;
  }
  return {
    id: payload.id,
    fullName: payload.fullName,
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    emailVerified: payload.emailVerified,
    role: "PROFESSIONAL",
    professionalProfileId: payload.professionalProfileId,
    avatarUrl: payload.avatarUrl ?? null,
    registrationApproval: payload.registrationApproval,
    profileCreatedAt: payload.profileCreatedAt ?? null
  };
}

function isRegistrationPortalBlocked(user: AuthUser | null): boolean {
  return user?.registrationApproval === "PENDING" || user?.registrationApproval === "REJECTED";
}

function readStoredEmailVerificationRequired(): boolean {
  try {
    return window.localStorage.getItem(EMAIL_VERIFICATION_REQUIRED_KEY) === "1";
  } catch {
    return false;
  }
}

function persistEmailVerificationRequired(value: boolean): void {
  try {
    if (value) {
      window.localStorage.setItem(EMAIL_VERIFICATION_REQUIRED_KEY, "1");
    } else {
      window.localStorage.removeItem(EMAIL_VERIFICATION_REQUIRED_KEY);
    }
  } catch {
    // ignore quota / private mode
  }
}

function readCalendarOnboardingPendingForSession(user: AuthUser | null, token: string): boolean {
  if (!token || !user?.id) {
    return false;
  }
  try {
    return window.localStorage.getItem(CALENDAR_ONBOARDING_PENDING_USER_ID_KEY) === user.id;
  } catch {
    return false;
  }
}

function persistCalendarOnboardingPending(userId: string): void {
  try {
    window.localStorage.setItem(CALENDAR_ONBOARDING_PENDING_USER_ID_KEY, userId);
  } catch {
    // ignore
  }
}

function clearCalendarOnboardingPending(): void {
  try {
    window.localStorage.removeItem(CALENDAR_ONBOARDING_PENDING_USER_ID_KEY);
  } catch {
    // ignore
  }
}

const PRO_AUTH_ME_SYNC_TIMEOUT_MS = 45_000;

/**
 * Lista de userIds para los que el profesional ya cerró el modal "Conectar Calendar"
 * con "Lo hago después". Persiste en localStorage para no molestar entre sesiones.
 * El modal sigue accesible desde Configuración → Conexiones, así que un dismiss
 * permanente acá no bloquea reconexión voluntaria.
 */
const PROFESSIONAL_CALENDAR_PROMPT_DISMISSED_KEY = "professional_calendar_prompt_dismissed_users";

function readDismissedProfessionalCalendarPromptUsers(): string[] {
  try {
    const raw = window.localStorage.getItem(PROFESSIONAL_CALENDAR_PROMPT_DISMISSED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string" && value.length > 0);
  } catch {
    return [];
  }
}

function writeDismissedProfessionalCalendarPromptUsers(values: string[]): void {
  try {
    window.localStorage.setItem(PROFESSIONAL_CALENDAR_PROMPT_DISMISSED_KEY, JSON.stringify(values));
  } catch {
    // ignore
  }
}

function rejectAfterMs(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

export function App() {
  restoreProfessionalPortalAfterCalendarOAuth();

  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState<string>(() => window.localStorage.getItem(TOKEN_KEY) ?? "");
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(readStoredEmailVerificationRequired);
  const [emailDeliveryConfigured, setEmailDeliveryConfigured] = useState<boolean | undefined>(undefined);
  const [authSyncReady, setAuthSyncReady] = useState(() => !window.localStorage.getItem(TOKEN_KEY) || !readStoredUser());
  const [pendingOnboardingSync, setPendingOnboardingSync] = useState(false);
  /** Nombre legible desde onboarding (no el placeholder de registro); se persiste con PATCH /api/auth/me. */
  const [pendingOnboardingDisplayFullName, setPendingOnboardingDisplayFullName] = useState<string | null>(
    () => readPendingOnboardingDisplayFullName()
  );
  const [onboardingPatchDraft, setOnboardingPatchDraft] = useState<OnboardingPatchDraft>(
    createDefaultOnboardingPatchDraft()
  );
  const [pendingOnboardingTaxId, setPendingOnboardingTaxId] = useState<string | null>(null);
  const [showCalendarOnboarding, setShowCalendarOnboarding] = useState(() =>
    readCalendarOnboardingPendingForSession(
      readStoredUser(),
      window.localStorage.getItem(TOKEN_KEY) ?? ""
    )
  );
  const [calendarOnboardingLoading, setCalendarOnboardingLoading] = useState(false);
  const [calendarOnboardingError, setCalendarOnboardingError] = useState("");
  /**
   * Estado de la conexión a Google Calendar del usuario actual.
   * `null` = aún no se sincronizó con el backend; evita disparar el modal antes de tiempo.
   */
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState<boolean | null>(null);
  const [calendarPromptDismissedUserIds, setCalendarPromptDismissedUserIds] = useState<string[]>(
    () => readDismissedProfessionalCalendarPromptUsers()
  );
  const sessionTimezone = useMemo(() => detectBrowserTimezone(), []);
  const isVerifyEmailRoute = useMemo(() => location.pathname === "/verify-email", [location.pathname]);
  const resumeWebOnboarding = useMemo(
    () => new URLSearchParams(location.search).get("resumeWebOnboarding") === "1",
    [location.search]
  );
  const [language, setLanguage] = useState<AppLanguage>(() =>
    resolveProfessionalPortalLanguage(window.localStorage.getItem(LANGUAGE_KEY))
  );
  const [currency, setCurrency] = useState<SupportedCurrency>(() => {
    const saved = window.localStorage.getItem(CURRENCY_KEY);
    return (SUPPORTED_CURRENCIES as readonly string[]).includes(saved ?? "") ? (saved as SupportedCurrency) : "USD";
  });

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    window.localStorage.setItem(CURRENCY_KEY, currency);
  }, [currency]);

  useEffect(() => {
    document.title = "MotivarCare | Professional Portal";

    const faviconHref = "/brand/motivarcare-mark.png?v=20260409";
    let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;

    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      favicon.type = "image/png";
      document.head.appendChild(favicon);
    }

    if (favicon.href !== `${window.location.origin}${faviconHref}`) {
      favicon.href = faviconHref;
    }
  }, []);

  useEffect(() => {
    setProfessionalApiUnauthorizedHandler(() => {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
      window.localStorage.removeItem(EMAIL_VERIFICATION_REQUIRED_KEY);
      clearPendingWebOnboardingAuth();
      clearResumeWebOnboardingStep();
      clearCalendarOnboardingPending();
      setToken("");
      setUser(null);
      setEmailVerificationRequired(false);
      setAuthSyncReady(true);
      setShowCalendarOnboarding(false);
      setGoogleCalendarConnected(null);
      navigate("/", { replace: true });
    });
    return () => setProfessionalApiUnauthorizedHandler(undefined);
  }, [navigate]);

  const handleAuthSuccess = (params: {
    token: string;
    user: AuthMeUserPayload;
    emailVerificationRequired: boolean;
    emailDeliveryConfigured?: boolean;
    googleCalendarConnected?: boolean;
  }) => {
    const uid = String(params.user.id).trim();
    const nextDismissed =
      uid.length > 0
        ? readDismissedProfessionalCalendarPromptUsers().filter((id) => id !== uid)
        : readDismissedProfessionalCalendarPromptUsers();
    writeDismissedProfessionalCalendarPromptUsers(nextDismissed);
    setCalendarPromptDismissedUserIds(nextDismissed);
    setShowCalendarOnboarding(false);
    clearCalendarOnboardingPending();

    const calFromLogin = params.googleCalendarConnected;
    if (typeof calFromLogin === "boolean") {
      setGoogleCalendarConnected(calFromLogin);
      if (uid.length > 0) {
        rememberProfessionalAuthCalendarConnectedSession(uid, calFromLogin);
        if (!calFromLogin) {
          setCalendarPromptDismissedUserIds((ids) => {
            if (!ids.includes(uid)) {
              return ids;
            }
            const nextIds = ids.filter((id) => id !== uid);
            writeDismissedProfessionalCalendarPromptUsers(nextIds);
            return nextIds;
          });
        }
      }
    } else {
      setGoogleCalendarConnected(null);
    }

    const nextUser = buildProfessionalAuthUser(params.user);
    if (!nextUser) {
      return;
    }

    window.localStorage.setItem(TOKEN_KEY, params.token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    persistEmailVerificationRequired(params.emailVerificationRequired);
    setToken(params.token);
    setUser(nextUser);
    setEmailVerificationRequired(params.emailVerificationRequired);
    if (typeof params.emailDeliveryConfigured === "boolean") {
      setEmailDeliveryConfigured(params.emailDeliveryConfigured);
    }
  };

  const handleUserChange = (nextUser: AuthUser) => {
    window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const handleLogout = () => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    window.localStorage.removeItem(EMAIL_VERIFICATION_REQUIRED_KEY);
    clearPendingWebOnboardingAuth();
    clearResumeWebOnboardingStep();
    clearPendingOnboardingDisplayFullName();
    clearCalendarOnboardingPending();
    if (location.pathname === "/verify-email-required") {
      navigate("/", { replace: true });
    }
    setToken("");
    setUser(null);
    setEmailVerificationRequired(false);
    setEmailDeliveryConfigured(undefined);
    setAuthSyncReady(true);
    setShowCalendarOnboarding(false);
    setGoogleCalendarConnected(null);
  };

  const handlePrepareOnboardingSync = (
    draft: OnboardingPatchDraft,
    meta?: { displayFullName?: string; taxId?: string }
  ) => {
    const trimmed = meta?.displayFullName?.trim() ?? "";
    if (trimmed.length >= 2) {
      setPendingOnboardingDisplayFullName(trimmed);
      savePendingOnboardingDisplayFullName(trimmed);
    } else {
      setPendingOnboardingDisplayFullName(null);
    }
    const taxTrimmed = meta?.taxId?.trim() ?? "";
    setPendingOnboardingTaxId(taxTrimmed.length >= 6 ? taxTrimmed : null);
    setOnboardingPatchDraft(draft);
    setPendingOnboardingSync(true);
  };

  const handleConnectCalendarFromOnboarding = async () => {
    if (!token) {
      return;
    }
    setCalendarOnboardingLoading(true);
    setCalendarOnboardingError("");
    try {
      const response = await apiRequest<{ authUrl: string }>(
        "/api/auth/google/calendar/connect",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            clientOrigin: window.location.origin,
            returnPath: "/",
            language
          })
        }
      );
      try {
        window.sessionStorage.setItem(PROFESSIONAL_CALENDAR_OAUTH_RETURN_PATH_KEY, "/");
      } catch {
        // ignore
      }
      backupProfessionalLocalStorageForCalendarOAuth();
      window.location.href = response.authUrl;
    } catch (error) {
      console.error("Could not start calendar onboarding OAuth", error);
      const raw = error instanceof Error ? error.message : "";
      const notConfigured =
        /not configured/i.test(raw) || /GOOGLE_CALENDAR_OAUTH_NOT_CONFIGURED/i.test(raw);
      setCalendarOnboardingError(
        notConfigured
          ? professionalSurfaceMessage("calendar-onboarding-not-configured", language)
          : professionalSurfaceMessage("calendar-onboarding", language, raw)
      );
    } finally {
      setCalendarOnboardingLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !user) {
      return;
    }

    void syncUserTimezone({
      baseUrl: API_BASE,
      token,
      timezone: sessionTimezone,
      persistPreference: false
    }).catch((error) => {
      console.error("Could not sync professional timezone from session", error);
    });
  }, [sessionTimezone, token, user]);

  useEffect(() => {
    if (!token || !user) {
      setAuthSyncReady(true);
      return;
    }

    let cancelled = false;
    setAuthSyncReady(false);

    const syncAuthState = async () => {
      try {
        const response = await Promise.race([
          apiRequest<{
            user: AuthMeUserPayload;
            emailVerificationRequired: boolean;
            emailDeliveryConfigured?: boolean;
            googleCalendarConnected?: boolean;
          }>("/api/auth/me", token),
          rejectAfterMs(PRO_AUTH_ME_SYNC_TIMEOUT_MS, "Professional auth sync timed out waiting for API")
        ]);

        if (cancelled) {
          return;
        }

        const nextUser = buildProfessionalAuthUser(response.user);
        if (!nextUser) {
          handleLogout();
          return;
        }

        window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
        setUser(nextUser);
        setEmailVerificationRequired(response.emailVerificationRequired);
        persistEmailVerificationRequired(response.emailVerificationRequired);
        if (typeof response.emailDeliveryConfigured === "boolean") {
          setEmailDeliveryConfigured(response.emailDeliveryConfigured);
        }

        const calConnected =
          typeof response.googleCalendarConnected === "boolean" ? response.googleCalendarConnected : false;
        const calUid = String(nextUser.id).trim();
        if (calUid.length > 0) {
          rememberProfessionalAuthCalendarConnectedSession(calUid, calConnected);
          /**
           * Sin Calendar en servidor: limpiar dismiss para que el modal pueda mostrarse
           * (login fresco, sesión desde localStorage, o prep staging que borró la conexión).
           */
          if (!calConnected) {
            setCalendarPromptDismissedUserIds((ids) => {
              if (!ids.includes(calUid)) {
                return ids;
              }
              const nextIds = ids.filter((id) => id !== calUid);
              writeDismissedProfessionalCalendarPromptUsers(nextIds);
              return nextIds;
            });
          }
        }
        setGoogleCalendarConnected(calConnected);
      } catch (error) {
        console.error("Could not sync professional auth state", error);
        if (!cancelled) {
          setGoogleCalendarConnected(false);
        }
      } finally {
        if (!cancelled) {
          setAuthSyncReady(true);
        }
      }
    };

    void syncAuthState();

    return () => {
      cancelled = true;
    };
  }, [token, user?.id]);

  const refreshRegistrationApproval = async () => {
    if (!token) {
      return;
    }
    const response = await apiRequest<{ user: AuthMeUserPayload }>("/api/auth/me", token);
    const nextUser = buildProfessionalAuthUser(response.user);
    if (!nextUser) {
      handleLogout();
      return;
    }
    window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  };

  useEffect(() => {
    if (!pendingOnboardingSync || !token || !user?.professionalProfileId) {
      return;
    }

    let ignore = false;

    const syncOnboarding = async () => {
      const displayFullName = pendingOnboardingDisplayFullName;

      const profilePromise = apiRequest(
        `/api/profiles/professional/${user.professionalProfileId}/public-profile`,
        token,
        {
          method: "PATCH",
          body: JSON.stringify(onboardingPatchDraft)
        }
      ).catch((error) => {
        console.error("Could not sync onboarding profile draft", error);
        return null;
      });

      const taxPromise =
        pendingOnboardingTaxId
          ? apiRequest("/api/professional/admin", token, {
              method: "PUT",
              body: JSON.stringify({ taxId: pendingOnboardingTaxId })
            }).catch((error) => {
              console.error("Could not sync onboarding tax id", error);
              return null;
            })
          : Promise.resolve(null);

      const namePromise =
        displayFullName && displayFullName.length >= 2
          ? apiRequest<{
              user: {
                id: string;
                fullName: string;
                firstName?: string;
                lastName?: string;
                email: string;
                emailVerified: boolean;
                role: string;
                professionalProfileId: string | null;
                avatarUrl?: string | null;
              };
            }>("/api/auth/me", token, {
              method: "PATCH",
              body: JSON.stringify({ fullName: displayFullName })
            })
              .then((patchMe) => {
                if (!ignore && patchMe.user) {
                  const nextUser = buildProfessionalAuthUser(patchMe.user as AuthMeUserPayload);
                  if (nextUser) {
                    window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
                    setUser(nextUser);
                  }
                }
                return true;
              })
              .catch((nameError) => {
                console.error("Could not sync professional display name after onboarding", nameError);
                return false;
              })
          : Promise.resolve(true);

      const [, , nameOk] = await Promise.all([profilePromise, taxPromise, namePromise]);

      if (!ignore) {
        setPendingOnboardingSync(false);
        setPendingOnboardingTaxId(null);
        if (nameOk) {
          setPendingOnboardingDisplayFullName(null);
          clearPendingOnboardingDisplayFullName();
        }
      }
    };

    void syncOnboarding();

    return () => {
      ignore = true;
    };
  }, [
    pendingOnboardingSync,
    pendingOnboardingDisplayFullName,
    token,
    user?.professionalProfileId,
    onboardingPatchDraft,
    pendingOnboardingTaxId
  ]);

  /**
   * Recuperación: si el usuario entra al portal con `fullName` en placeholder ("Profesional")
   * y todavía tenemos el nombre real guardado en localStorage (p. ej. porque el PATCH /me
   * quedó a medias en un intento anterior), reintentamos el PATCH /api/auth/me solo.
   */
  useEffect(() => {
    if (pendingOnboardingSync || !token || !user) {
      return;
    }
    const pendingName = pendingOnboardingDisplayFullName ?? readPendingOnboardingDisplayFullName();
    if (!pendingName || pendingName.length < 2) {
      return;
    }
    const currentName = (user.fullName ?? "").trim();
    const looksLikePlaceholder =
      currentName === "" ||
      currentName.toLowerCase() === "profesional" ||
      currentName.toLowerCase() === "professional" ||
      currentName.toLowerCase() === "profissional";
    if (!looksLikePlaceholder || currentName === pendingName) {
      if (currentName === pendingName) {
        setPendingOnboardingDisplayFullName(null);
        clearPendingOnboardingDisplayFullName();
      }
      return;
    }

    let cancelled = false;
    void apiRequest<{
      user: AuthMeUserPayload;
    }>("/api/auth/me", token, {
      method: "PATCH",
      body: JSON.stringify({ fullName: pendingName })
    })
      .then((patchMe) => {
        if (cancelled || !patchMe.user) {
          return;
        }
        const nextUser = buildProfessionalAuthUser(patchMe.user);
        if (!nextUser) {
          return;
        }
        window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
        setUser(nextUser);
        setPendingOnboardingDisplayFullName(null);
        clearPendingOnboardingDisplayFullName();
      })
      .catch((error) => {
        console.error("Could not recover professional display name", error);
      });

    return () => {
      cancelled = true;
    };
  }, [pendingOnboardingSync, pendingOnboardingDisplayFullName, token, user]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    try {
      const raw = window.localStorage.getItem(CALENDAR_ONBOARDING_PENDING_USER_ID_KEY);
      if (raw && raw !== user.id) {
        clearCalendarOnboardingPending();
        setShowCalendarOnboarding(false);
      }
    } catch {
      // ignore
    }
  }, [user?.id]);

  useEffect(() => {
    if (!showCalendarOnboarding || !token || !user) {
      return;
    }

    let cancelled = false;
    void apiRequest<{ connected: boolean }>("/api/auth/google/calendar/status", token)
      .then((response) => {
        if (cancelled) return;
        setGoogleCalendarConnected(response.connected);
        if (response.connected) {
          clearCalendarOnboardingPending();
          setShowCalendarOnboarding(false);
        }
      })
      .catch(() => {
      });

    return () => {
      cancelled = true;
    };
  }, [showCalendarOnboarding, token, user]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const query = new URLSearchParams(location.search);
    const calendarSync = query.get("calendar_sync");
    if (!calendarSync) {
      return;
    }

    const callbackUserId = query.get("calendar_user_id");
    const calendarReason = query.get("calendar_reason");
    const calendarDetail = query.get("calendar_detail");

    const stripCalendarQuery = (extraSearch?: string) => {
      navigate(
        {
          pathname: location.pathname || "/",
          search: extraSearch ?? ""
        },
        { replace: true }
      );
    };

    if (callbackUserId && callbackUserId !== user.id) {
      setCalendarOnboardingLoading(false);
      setShowCalendarOnboarding(true);
      setCalendarOnboardingError(
        friendlyCalendarOAuthReturnMessage(language, { status: "error", reason: "session_mismatch" })
      );
      stripCalendarQuery();
      return;
    }

    if (calendarSync === "connected" && (!callbackUserId || callbackUserId === user.id)) {
      setGoogleCalendarConnected(true);
      rememberProfessionalAuthCalendarConnectedSession(user.id, true);
      setCalendarOnboardingLoading(false);
      setCalendarOnboardingError("");
      clearCalendarOnboardingPending();
      setShowCalendarOnboarding(false);
      stripCalendarQuery(location.pathname === "/" ? "?meet_hint=1" : "");
      return;
    }

    if (
      (calendarSync === "error" || calendarSync === "cancelled")
      && (!callbackUserId || callbackUserId === user.id)
    ) {
      setCalendarOnboardingLoading(false);
      setShowCalendarOnboarding(true);
      setCalendarOnboardingError(
        friendlyCalendarOAuthReturnMessage(language, {
          status: calendarSync === "cancelled" ? "cancelled" : "error",
          reason: calendarReason,
          detail: calendarDetail
        })
      );
      stripCalendarQuery();
      return;
    }

    stripCalendarQuery();
  }, [location.pathname, location.search, navigate, language, user?.id]);

  /**
   * Post-login: si el profesional entra al portal con cuenta activa pero sin
   * Google Calendar conectado, abrimos el modal automáticamente. Pensado para
   * que el reviewer de Google App Verification vea el consent screen sin tener
   * que ir a Configuración. Para usuarios reales: si pinchan "Lo hago después"
   * persistimos el dismiss y no vuelve a abrirse solo.
   */
  useEffect(() => {
    if (!token || !user || !authSyncReady) {
      return;
    }
    /** Igual que el redirect a verify: solo bloquear si el usuario aún no verificó el mail. */
    if (!user.emailVerified) {
      return;
    }
    if (isRegistrationPortalBlocked(user)) {
      return;
    }
    if (showCalendarOnboarding) {
      return;
    }
    if (googleCalendarConnected !== false) {
      /** null = aún no sincronizamos; true = ya conectado. Solo disparamos cuando es `false`. */
      return;
    }
    if (calendarPromptDismissedUserIds.includes(user.id)) {
      return;
    }
    /** Evitar disparar el modal mientras se está navegando el callback OAuth. */
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("calendar_sync")) {
        return;
      }
    } catch {
      // ignore
    }
    setShowCalendarOnboarding(true);
  }, [
    token,
    user,
    authSyncReady,
    showCalendarOnboarding,
    googleCalendarConnected,
    calendarPromptDismissedUserIds
  ]);

  useEffect(() => {
    if (!user || location.pathname === "/verify-email") {
      return;
    }

    const shouldRedirectToVerification = emailVerificationRequired && !user.emailVerified;
    if (shouldRedirectToVerification && location.pathname !== "/verify-email-required") {
      navigate("/verify-email-required", { replace: true });
      return;
    }

    if (!shouldRedirectToVerification && location.pathname === "/verify-email-required") {
      navigate("/", { replace: true });
    }
  }, [emailVerificationRequired, user?.emailVerified, user?.id, location.pathname, navigate]);

  if (isVerifyEmailRoute) {
    return <VerifyEmailTokenScreen language={language} />;
  }

  const resumeWizardStep = readResumeWebOnboardingStep();
  const continueWebAfterVerify = readContinueWebOnboardingAfterEmailVerify();
  const effectiveResumeWizardStep =
    resumeWizardStep ?? (continueWebAfterVerify ? WEB_ONBOARDING_STEP_AFTER_EMAIL_VERIFY : null);
  const pendingWebOnboarding = readPendingWebOnboardingAuth();
  // No guardar la condición en un boolean suelto: TS no estrecha `user` y falla el build (TS18047).
  if (
    token &&
    user &&
    user.emailVerified &&
    resumeWebOnboarding &&
    effectiveResumeWizardStep !== null
  ) {
    if (!pendingWebOnboarding || pendingWebOnboarding.user.id !== user.id) {
      clearResumeWebOnboardingStep();
      return <Navigate to="/" replace />;
    }
    return (
      <ProfessionalAuthFlow
        language={language}
        currency={currency}
        onAuthSuccess={handleAuthSuccess}
        onRegistrationAuthSuccess={() => {
          /** Calendar y portal quedan bloqueados hasta aprobación manual del admin. */
        }}
        onPrepareOnboardingSync={handlePrepareOnboardingSync}
        webOnboardingResume={{
          initialWizardStep: effectiveResumeWizardStep!,
          onResumeConsumed: () => {
            navigate("/", { replace: true });
          }
        }}
        onAbandonWebOnboardingResume={() => {
          clearPendingWebOnboardingAuth();
          clearResumeWebOnboardingStep();
          handleLogout();
          navigate("/", { replace: true });
        }}
      />
    );
  }

  if (!token || !user) {
    if (location.pathname === "/forgot-password") {
      return <ForgotPasswordScreen language={language} />;
    }
    if (location.pathname === "/reset-password") {
      return <ResetPasswordScreen language={language} />;
    }
  }

  if (!token || !user) {
    return (
      <ProfessionalAuthFlow
        language={language}
        currency={currency}
        onAuthSuccess={handleAuthSuccess}
        onRegistrationAuthSuccess={() => {
          /** Calendar y portal quedan bloqueados hasta aprobación manual del admin. */
        }}
        onPrepareOnboardingSync={handlePrepareOnboardingSync}
      />
    );
  }

  if (!authSyncReady) {
    return (
      <div className="pro-auth-shell pro-auth-shell--loader">
        <ProPageLoader language={language} layout="block" />
      </div>
    );
  }

  /** Antes de Calendar: verificación de email primero (evita que /verify-email-required quede tapada). */
  if (emailVerificationRequired && !user.emailVerified) {
    return (
      <VerifyEmailRequiredScreen
        language={language}
        token={token}
        email={user.email}
        emailDeliveryConfigured={emailDeliveryConfigured}
        onLogout={handleLogout}
      />
    );
  }

  if (isRegistrationPortalBlocked(user)) {
    return (
      <ProfessionalRegistrationApprovalScreen
        language={language}
        status={user.registrationApproval === "REJECTED" ? "REJECTED" : "PENDING"}
        profileCreatedAt={user.profileCreatedAt}
        email={user.email}
        onLogout={handleLogout}
        onRefreshStatus={refreshRegistrationApproval}
      />
    );
  }

  if (showCalendarOnboarding) {
    return (
      <div className="intake-shell calendar-consent-shell">
        <section className="intake-card calendar-consent-card">
          <div className="calendar-consent-header">
            <strong>{t(language, { es: "Google Calendar", en: "Google Calendar", pt: "Google Calendar" })}</strong>
          </div>
          <div className="calendar-consent-body">
            <div className="calendar-consent-visual" aria-hidden="true" />
            <h2>
              {t(language, {
                es: "Integrá tu agenda con Google Calendar",
                en: "Connect your practice calendar to Google Calendar",
                pt: "Integre sua agenda ao Google Calendar"
              })}
            </h2>
            <p>
              {t(language, {
                es: "Mantené tu consulta organizada: reservas, cambios y cancelaciones reflejados donde ya trabajás.",
                en: "Keep your practice organized—bookings, changes, and cancellations reflected where you already work.",
                pt: "Mantenha sua consulta organizada: reservas, alteracoes e cancelamentos refletidos onde voce ja trabalha."
              })}
            </p>
            <p className="calendar-consent-note">
              {t(language, {
                es: "Cuando confirmes o reprogrames una sesión, podés mantener tu disponibilidad y recordatorios en un solo lugar, con menos pasos manuales.",
                en: "When you confirm or reschedule a session, you can keep reminders and availability in one place with fewer manual steps.",
                pt: "Quando confirmar ou reagendar uma sessao, voce pode manter lembretes e disponibilidade num so lugar, com menos passos manuais."
              })}
            </p>
            <ProfessionalGuidanceList language={language} items={PROFESSIONAL_GOOGLE_CALENDAR_SCOPE_POINTS} />
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
                ? t(language, { es: "Conectando...", en: "Connecting...", pt: "Conectando..." })
                : t(language, { es: "Conectar ahora", en: "Connect now", pt: "Conectar agora" })}
            </button>
            <button
              type="button"
              onClick={() => {
                setCalendarOnboardingError("");
                clearCalendarOnboardingPending();
                setShowCalendarOnboarding(false);
                if (user?.id) {
                  setCalendarPromptDismissedUserIds((current) => {
                    if (current.includes(user.id)) return current;
                    const next = [...current, user.id];
                    writeDismissedProfessionalCalendarPromptUsers(next);
                    return next;
                  });
                }
              }}
              disabled={calendarOnboardingLoading}
            >
              {t(language, { es: "Lo hago después", en: "I'll do it later", pt: "Depois eu faço" })}
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <ProfessionalPortal
      token={token}
      user={user}
      onLogout={handleLogout}
      language={language}
      currency={currency}
      onUserChange={handleUserChange}
    />
  );
}
