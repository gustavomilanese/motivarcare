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
  clearPendingWebOnboardingAuth,
  clearResumeWebOnboardingStep,
  readContinueWebOnboardingAfterEmailVerify,
  readPendingWebOnboardingAuth,
  readResumeWebOnboardingStep,
  WEB_ONBOARDING_STEP_AFTER_EMAIL_VERIFY
} from "../onboarding/webOnboardingResumeStorage.js";
import { ProfessionalAuthFlow } from "./pages/ProfessionalAuthFlow";
import { ForgotPasswordScreen } from "./pages/ForgotPasswordScreen";
import { ProfessionalPortal } from "./pages/ProfessionalPortal";
import { ResetPasswordScreen } from "./pages/ResetPasswordScreen";
import { VerifyEmailRequiredScreen } from "./pages/VerifyEmailRequiredScreen";
import { VerifyEmailTokenScreen } from "./pages/VerifyEmailTokenScreen";
import { professionalSurfaceMessage } from "./lib/friendlyProfessionalSurfaceMessages";
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
  setProfessionalApiUnauthorizedHandler
} from "./services/api";
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

export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState<string>(() => window.localStorage.getItem(TOKEN_KEY) ?? "");
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(readStoredEmailVerificationRequired);
  const [authSyncReady, setAuthSyncReady] = useState(() => !window.localStorage.getItem(TOKEN_KEY) || !readStoredUser());
  const [pendingOnboardingSync, setPendingOnboardingSync] = useState(false);
  const [onboardingPatchDraft, setOnboardingPatchDraft] = useState<OnboardingPatchDraft>(
    createDefaultOnboardingPatchDraft()
  );
  const [showCalendarOnboarding, setShowCalendarOnboarding] = useState(() =>
    readCalendarOnboardingPendingForSession(
      readStoredUser(),
      window.localStorage.getItem(TOKEN_KEY) ?? ""
    )
  );
  const [calendarOnboardingLoading, setCalendarOnboardingLoading] = useState(false);
  const [calendarOnboardingError, setCalendarOnboardingError] = useState("");
  const sessionTimezone = useMemo(() => detectBrowserTimezone(), []);
  const isVerifyEmailRoute = useMemo(() => location.pathname === "/verify-email", [location.pathname]);
  const resumeWebOnboarding = useMemo(
    () => new URLSearchParams(location.search).get("resumeWebOnboarding") === "1",
    [location.search]
  );
  const [language, setLanguage] = useState<AppLanguage>(() => {
    const saved = window.localStorage.getItem(LANGUAGE_KEY);
    return (SUPPORTED_LANGUAGES as readonly string[]).includes(saved ?? "") ? (saved as AppLanguage) : "es";
  });
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
      navigate("/", { replace: true });
    });
    return () => setProfessionalApiUnauthorizedHandler(undefined);
  }, [navigate]);

  const handleAuthSuccess = (params: { token: string; user: AuthUser; emailVerificationRequired: boolean }) => {
    window.localStorage.setItem(TOKEN_KEY, params.token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(params.user));
    persistEmailVerificationRequired(params.emailVerificationRequired);
    setToken(params.token);
    setUser(params.user);
    setEmailVerificationRequired(params.emailVerificationRequired);
    setAuthSyncReady(true);
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
    clearCalendarOnboardingPending();
    if (location.pathname === "/verify-email-required") {
      navigate("/", { replace: true });
    }
    setToken("");
    setUser(null);
    setEmailVerificationRequired(false);
    setAuthSyncReady(true);
    setShowCalendarOnboarding(false);
  };

  const handlePrepareOnboardingSync = (draft: OnboardingPatchDraft) => {
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
          body: JSON.stringify({ clientOrigin: window.location.origin, returnPath: "/" })
        }
      );
      try {
        window.sessionStorage.setItem(PROFESSIONAL_CALENDAR_OAUTH_RETURN_PATH_KEY, "/");
      } catch {
        // ignore
      }
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
        const response = await apiRequest<{
          user: {
            id: string;
            fullName: string;
            email: string;
            role: "PATIENT" | "PROFESSIONAL" | "ADMIN";
            emailVerified: boolean;
            professionalProfileId: string | null;
            avatarUrl?: string | null;
          };
          emailVerificationRequired: boolean;
        }>("/api/auth/me", token);

        if (cancelled) {
          return;
        }

        if (response.user.role !== "PROFESSIONAL" || !response.user.professionalProfileId) {
          handleLogout();
          return;
        }

        const nextUser: AuthUser = {
          id: response.user.id,
          fullName: response.user.fullName,
          email: response.user.email,
          emailVerified: response.user.emailVerified,
          role: "PROFESSIONAL",
          professionalProfileId: response.user.professionalProfileId,
          avatarUrl: response.user.avatarUrl ?? null
        };

        window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
        setUser(nextUser);
        setEmailVerificationRequired(response.emailVerificationRequired);
        persistEmailVerificationRequired(response.emailVerificationRequired);
      } catch (error) {
        console.error("Could not sync professional auth state", error);
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
  }, [token]);

  useEffect(() => {
    if (!pendingOnboardingSync || !token || !user?.professionalProfileId) {
      return;
    }

    let ignore = false;

    const syncOnboarding = async () => {
      try {
        await apiRequest(
          `/api/profiles/professional/${user.professionalProfileId}/public-profile`,
          token,
          {
            method: "PATCH",
            body: JSON.stringify(onboardingPatchDraft)
          }
        );
      } catch (error) {
        console.error("Could not sync onboarding profile draft", error);
      } finally {
        if (!ignore) {
          setPendingOnboardingSync(false);
        }
      }
    };

    void syncOnboarding();

    return () => {
      ignore = true;
    };
  }, [pendingOnboardingSync, token, user?.professionalProfileId, onboardingPatchDraft]);

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
        if (!cancelled && response.connected) {
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
        onRegistrationAuthSuccess={(userId) => {
          persistCalendarOnboardingPending(userId);
          setShowCalendarOnboarding(true);
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
        onRegistrationAuthSuccess={(userId) => {
          persistCalendarOnboardingPending(userId);
          setShowCalendarOnboarding(true);
        }}
        onPrepareOnboardingSync={handlePrepareOnboardingSync}
      />
    );
  }

  if (!authSyncReady) {
    return (
      <div className="pro-auth-shell">
        <section className="pro-auth-card">
          <p>Cargando tu perfil...</p>
        </section>
      </div>
    );
  }

  /** Antes de Calendar: verificación de email primero (evita que /verify-email-required quede tapada). */
  if (emailVerificationRequired && !user.emailVerified) {
    return (
      <VerifyEmailRequiredScreen language={language} token={token} email={user.email} onLogout={handleLogout} />
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
