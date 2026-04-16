import { useCallback, useState } from "react";
import { detectBrowserTimezone } from "@therapy/auth";
import {
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  textByLanguage
} from "@therapy/i18n-config";
import {
  buildPatchDraftFromMobileInputs,
  buildPatchDraftFromWebPayload,
  type OnboardingPatchDraft,
  type ProfessionalWebOnboardingFinishMeta
} from "../../onboarding";
import { professionalProblemSelectionIsComplete } from "../../onboarding/constants/professionalClientProblemQuestionnaire";
import {
  ProfessionalAboutInfoIntroStep,
  ProfessionalAboutStep,
  ProfessionalAvatarAdjustStep,
  ProfessionalAverageClientsStep,
  ProfessionalEarningsCalculatorStep,
  ProfessionalEarningsPlanStep,
  ProfessionalEducationInfoStep,
  ProfessionalEducationStep,
  ProfessionalEmailPasswordStep,
  ProfessionalMobileEmailVerificationStep,
  ProfessionalExperienceStep,
  ProfessionalFirstClientsStep,
  ProfessionalPersonalDataStep,
  ProfessionalPhotoInfoStep,
  ProfessionalPhotoStep,
  ProfessionalPhotoUploadStep,
  ProfessionalPracticeHoursStep,
  ProfessionalPriceStep,
  ProfessionalProfileCardCheckStep,
  ProfessionalProfileFullCheckStep,
  ProfessionalProfileIntroStep,
  ProfessionalProfileSpecializationStep,
  ProfessionalRegisterIntro,
  ProfessionalSpecializationStep,
  ProfessionalStripeVerificationStep,
  ProfessionalSuccessInfoStep,
  ProfessionalSummaryInfoStep,
  ProfessionalSummaryStep,
  ProfessionalTermsStep,
  ProfessionalTherapyDescriptionInfoStep,
  ProfessionalTherapyDescriptionStep,
  ProfessionalVideoInfoStep,
  ProfessionalWelcomeGate,
  ProfessionalWorkAreasByClientProblemStep,
  ProfessionalWorkAreasStep,
  ProfessionalWorkLanguagesStep
} from "../../onboarding/components/MobileOnboardingSteps";
import { ProfessionalWebOnboardingWizard } from "../../onboarding/components/ProfessionalWebOnboardingWizard";
import {
  clearPendingWebOnboardingAuth,
  clearResumeWebOnboardingStep,
  readPendingWebOnboardingAuth,
  savePendingWebOnboardingAuth
} from "../../onboarding/webOnboardingResumeStorage.js";
import { professionalAuthSurfaceMessage } from "../lib/friendlyProfessionalSurfaceMessages";
import { apiRequest } from "../services/api";
import { checkProfessionalEmailAvailable } from "../services/checkProfessionalEmail";
import { PROFESSIONAL_AUTH_HERO_IMAGE, professionalAuthHeroFallback } from "../data/authHero";
import { AuthScreen } from "./AuthScreen";
import type { AuthResponse, AuthUser } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function placeholderFullNameFromEmail(email: string): string {
  const local = email.trim().split("@")[0]?.trim() ?? "";
  if (local.length >= 2) {
    return local.slice(0, 120);
  }
  return "Profesional";
}

type AuthEntryMode =
  | "welcome"
  | "login"
  | "register-web"
  | "register-intro"
  | "register-specialization"
  | "register-first-clients"
  | "register-experience"
  | "register-average-clients"
  | "register-practice-hours"
  | "register-earnings-plan"
  | "register-earnings-calculator"
  | "register-terms"
  | "register-email"
  | "register-email-verify"
  | "register-profile-intro"
  | "register-photo"
  | "register-profile-specialization"
  | "register-personal-data"
  | "register-work-areas"
  | "register-work-languages"
  | "register-work-areas-by-problem"
  | "register-about-info-intro"
  | "register-about"
  | "register-therapy-description-info"
  | "register-therapy-description"
  | "register-summary-info"
  | "register-summary"
  | "register-price"
  | "register-photo-info"
  | "register-photo-upload"
  | "register-avatar-adjust"
  | "register-video-info"
  | "register-education-info"
  | "register-education"
  | "register-stripe"
  | "register-success-info"
  | "register-profile-card"
  | "register-profile-full"
  | "register";

type RegisterBackMode = "register-web" | "register-profile-full" | "register-success-info";

export function ProfessionalAuthFlow(props: {
  language: AppLanguage;
  currency: SupportedCurrency;
  onAuthSuccess: (params: { token: string; user: AuthUser; emailVerificationRequired: boolean }) => void;
  onRegistrationAuthSuccess?: (userId: string) => void;
  onPrepareOnboardingSync: (draft: OnboardingPatchDraft) => void;
  /** Reanudar onboarding web tras verificar el mail (mismo navegador). */
  webOnboardingResume?: {
    initialWizardStep: number;
    onResumeConsumed: () => void;
  } | null;
  onAbandonWebOnboardingResume?: () => void;
}) {
  const [authEntryMode, setAuthEntryMode] = useState<AuthEntryMode>(() =>
    props.webOnboardingResume ? "register-web" : "welcome"
  );
  const [registerBackMode, setRegisterBackMode] = useState<RegisterBackMode>("register-profile-full");
  const [selectedSpecialization, setSelectedSpecialization] = useState("");
  const [selectedExperience, setSelectedExperience] = useState("");
  const [selectedPracticeHours, setSelectedPracticeHours] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [profileSpecializations, setProfileSpecializations] = useState<string[]>([]);
  const [workAreas, setWorkAreas] = useState<string[]>([]);
  const [workLanguages, setWorkLanguages] = useState<string[]>([]);
  const [workAreasByProblem, setWorkAreasByProblem] = useState<string[]>([]);
  const [aboutText, setAboutText] = useState("");
  const [therapyDescriptionText, setTherapyDescriptionText] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [priceData, setPriceData] = useState({
    sessionPrice: "",
    discount4: "0",
    discount8: "0",
    discount12: "0"
  });
  const [profilePhotoLoaded, setProfilePhotoLoaded] = useState(false);
  const [registerProfilePhotoDataUrl, setRegisterProfilePhotoDataUrl] = useState<string | null>(null);
  const [educationData, setEducationData] = useState({
    institution: "",
    specialty: "",
    startYear: "",
    graduationYear: "",
    diplomaUploaded: false
  });
  const [personalData, setPersonalData] = useState({
    publicName: "",
    firstName: "",
    fullName: "",
    practiceHours: "",
    graduationYear: "",
    gender: "",
    birthYear: "",
    birthCountry: ""
  });
  const [mobilePreAuthSession, setMobilePreAuthSession] = useState<ProfessionalWebOnboardingFinishMeta | null>(null);
  const [mobileRegisterError, setMobileRegisterError] = useState("");

  const completeMobileOnboardingWithSession = () => {
    if (!mobilePreAuthSession) {
      return;
    }
    const displayName = personalData.fullName.trim() || mobilePreAuthSession.user.fullName;
    props.onPrepareOnboardingSync(buildMobileDraft());
    props.onAuthSuccess({
      token: mobilePreAuthSession.token,
      user: {
        id: mobilePreAuthSession.user.id,
        fullName: displayName,
        email: mobilePreAuthSession.user.email,
        emailVerified: mobilePreAuthSession.user.emailVerified,
        role: "PROFESSIONAL",
        professionalProfileId: mobilePreAuthSession.user.professionalProfileId,
        avatarUrl: mobilePreAuthSession.user.avatarUrl ?? null
      },
      emailVerificationRequired: mobilePreAuthSession.emailVerificationRequired
    });
    props.onRegistrationAuthSuccess?.(mobilePreAuthSession.user.id);
  };

  const handleMobileEmailPasswordContinue = useCallback(async () => {
    setMobileRegisterError("");
    if (mobilePreAuthSession?.user.emailVerified) {
      setAuthEntryMode("register-specialization");
      return;
    }
    if (
      mobilePreAuthSession
      && mobilePreAuthSession.emailVerificationRequired
      && !mobilePreAuthSession.user.emailVerified
    ) {
      setAuthEntryMode("register-email-verify");
      return;
    }

    const email = registerEmail.trim().toLowerCase();
    try {
      const available = await checkProfessionalEmailAvailable(email);
      if (!available) {
        setMobileRegisterError(
          t(props.language, {
            es: "Este correo ya está registrado. Iniciá sesión o usá otro email.",
            en: "This email is already registered. Sign in or use another email.",
            pt: "Este e-mail ja esta cadastrado. Faca login ou use outro endereco."
          })
        );
        return;
      }
    } catch {
      setMobileRegisterError(
        t(props.language, {
          es: "No pudimos verificar el correo. Revisá tu conexión e intentá de nuevo.",
          en: "We couldn't verify the email. Check your connection and try again.",
          pt: "Nao foi possivel verificar o e-mail. Verifique a conexao e tente de novo."
        })
      );
      return;
    }

    try {
      const response = await apiRequest<AuthResponse>("/api/auth/register", undefined, {
        method: "POST",
        body: JSON.stringify({
          email,
          password: registerPassword,
          fullName: placeholderFullNameFromEmail(email),
          role: "PROFESSIONAL",
          timezone: detectBrowserTimezone()
        })
      });

      if (response.user.role !== "PROFESSIONAL" || !response.user.professionalProfileId) {
        setMobileRegisterError(
          t(props.language, {
            es: "No pudimos crear la cuenta profesional. Probá de nuevo o contactá soporte.",
            en: "We could not create your professional account. Try again or contact support.",
            pt: "Nao foi possivel criar a conta profissional. Tente de novo ou fale com o suporte."
          })
        );
        return;
      }

      const meta: ProfessionalWebOnboardingFinishMeta = {
        token: response.token,
        emailVerificationRequired: response.emailVerificationRequired,
        user: {
          id: response.user.id,
          fullName: response.user.fullName,
          email: response.user.email,
          emailVerified: response.user.emailVerified,
          professionalProfileId: response.user.professionalProfileId,
          avatarUrl: response.user.avatarUrl ?? null
        }
      };
      setMobilePreAuthSession(meta);

      if (response.emailVerificationRequired && !response.user.emailVerified) {
        setAuthEntryMode("register-email-verify");
        return;
      }
      setAuthEntryMode("register-specialization");
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setMobileRegisterError(professionalAuthSurfaceMessage(raw || " ", props.language));
    }
  }, [mobilePreAuthSession, registerEmail, registerPassword, props.language]);

  /** El portal profesional es web: siempre el wizard web: el flujo “móvil” por pasos queda solo vía “Versión móvil” dentro del wizard. */
  const startProfessionalWebRegistration = useCallback(() => {
    setRegisterBackMode("register-web");
    setAuthEntryMode("register-web");
  }, []);

  const buildMobileDraft = () => buildPatchDraftFromMobileInputs({
    aboutText,
    therapyDescriptionText,
    selectedSpecialization,
    selectedExperience,
    selectedPracticeHours,
    problemFocusSelections: workAreasByProblem,
    workLanguages,
    summaryText,
    priceData,
    personalData: {
      graduationYear: personalData.graduationYear,
      gender: personalData.gender,
      birthCountry: personalData.birthCountry
    },
    educationData: {
      institution: educationData.institution,
      specialty: educationData.specialty,
      startYear: educationData.startYear,
      graduationYear: educationData.graduationYear
    },
    photoUrl: registerProfilePhotoDataUrl
  });

  if (authEntryMode === "welcome") {
    return (
      <ProfessionalWelcomeGate
        language={props.language}
        onLogin={() => setAuthEntryMode("login")}
        onRegister={startProfessionalWebRegistration}
      />
    );
  }

  if (authEntryMode === "register-web") {
    const resume = props.webOnboardingResume;
    const pendingResume = resume ? readPendingWebOnboardingAuth() : null;
    const initialWebSession =
      resume && pendingResume
        ? {
            token: pendingResume.token,
            emailVerificationRequired: pendingResume.emailVerificationRequired,
            user: {
              id: pendingResume.user.id,
              email: pendingResume.user.email,
              emailVerified: pendingResume.user.emailVerified,
              fullName: pendingResume.user.fullName,
              professionalProfileId: pendingResume.user.professionalProfileId,
              avatarUrl: pendingResume.user.avatarUrl ?? undefined
            }
          }
        : null;
    const credentialsSeed =
      resume && pendingResume
        ? {
            email: pendingResume.user.email,
            password: pendingResume.password,
            fullName: pendingResume.user.fullName
          }
        : null;

    return (
      <ProfessionalWebOnboardingWizard
        language={props.language}
        initialWizardStep={resume?.initialWizardStep}
        initialWebSession={initialWebSession}
        credentialsSeed={credentialsSeed}
        onAfterRegisterPendingAuth={resume ? undefined : savePendingWebOnboardingAuth}
        onBack={() => {
          if (resume) {
            props.onAbandonWebOnboardingResume?.();
            return;
          }
          setAuthEntryMode("welcome");
        }}
        onSwitchToMobile={() => {
          setRegisterBackMode("register-profile-full");
          setAuthEntryMode("register-intro");
        }}
        onFinish={(payload, meta) => {
          clearPendingWebOnboardingAuth();
          clearResumeWebOnboardingStep();
          resume?.onResumeConsumed();
          setRegisterEmail(payload.email);
          setRegisterPassword(payload.password);
          setPersonalData((current) => ({ ...current, fullName: payload.fullName }));
          props.onPrepareOnboardingSync(buildPatchDraftFromWebPayload(payload));
          setRegisterBackMode("register-web");
          const displayName = payload.fullName.trim() || meta.user.fullName;
          props.onAuthSuccess({
            token: meta.token,
            user: {
              id: meta.user.id,
              fullName: displayName,
              email: meta.user.email,
              emailVerified: meta.user.emailVerified,
              role: "PROFESSIONAL",
              professionalProfileId: meta.user.professionalProfileId,
              avatarUrl: meta.user.avatarUrl ?? null
            },
            emailVerificationRequired: meta.emailVerificationRequired
          });
          props.onRegistrationAuthSuccess?.(meta.user.id);
        }}
      />
    );
  }

  if (authEntryMode === "register-intro") {
    return (
      <ProfessionalRegisterIntro
        language={props.language}
        onBack={() => {
          setMobilePreAuthSession(null);
          setMobileRegisterError("");
          setAuthEntryMode("welcome");
        }}
        onContinue={() => setAuthEntryMode("register-email")}
      />
    );
  }

  if (authEntryMode === "register-email") {
    return (
      <ProfessionalEmailPasswordStep
        language={props.language}
        email={registerEmail}
        password={registerPassword}
        onEmailChange={(value) => {
          setRegisterEmail(value);
          setMobileRegisterError("");
        }}
        onPasswordChange={(value) => {
          setRegisterPassword(value);
          setMobileRegisterError("");
        }}
        onBack={() => {
          setMobilePreAuthSession(null);
          setMobileRegisterError("");
          setAuthEntryMode("register-intro");
        }}
        submitError={mobileRegisterError}
        onContinue={handleMobileEmailPasswordContinue}
      />
    );
  }

  if (authEntryMode === "register-email-verify" && mobilePreAuthSession) {
    return (
      <ProfessionalMobileEmailVerificationStep
        language={props.language}
        token={mobilePreAuthSession.token}
        email={mobilePreAuthSession.user.email}
        onBack={() => {
          setMobilePreAuthSession(null);
          setMobileRegisterError("");
          setAuthEntryMode("register-email");
        }}
        onVerified={() => {
          setMobilePreAuthSession((prev) =>
            prev ? { ...prev, user: { ...prev.user, emailVerified: true } } : prev
          );
          setAuthEntryMode("register-specialization");
        }}
      />
    );
  }

  if (authEntryMode === "register-specialization") {
    return (
      <ProfessionalSpecializationStep
        language={props.language}
        value={selectedSpecialization}
        onSelect={setSelectedSpecialization}
        onBack={() => setAuthEntryMode("register-email")}
        onContinue={() => setAuthEntryMode("register-first-clients")}
      />
    );
  }

  if (authEntryMode === "register-first-clients") {
    return (
      <ProfessionalFirstClientsStep
        language={props.language}
        onBack={() => setAuthEntryMode("register-specialization")}
        onContinue={() => setAuthEntryMode("register-experience")}
      />
    );
  }

  if (authEntryMode === "register-experience") {
    return (
      <ProfessionalExperienceStep
        language={props.language}
        value={selectedExperience}
        onSelect={setSelectedExperience}
        onBack={() => setAuthEntryMode("register-first-clients")}
        onContinue={() => setAuthEntryMode("register-average-clients")}
      />
    );
  }

  if (authEntryMode === "register-average-clients") {
    return (
      <ProfessionalAverageClientsStep
        language={props.language}
        onBack={() => setAuthEntryMode("register-experience")}
        onContinue={() => setAuthEntryMode("register-practice-hours")}
      />
    );
  }

  if (authEntryMode === "register-practice-hours") {
    return (
      <ProfessionalPracticeHoursStep
        language={props.language}
        value={selectedPracticeHours}
        onSelect={setSelectedPracticeHours}
        onBack={() => setAuthEntryMode("register-average-clients")}
        onContinue={() => setAuthEntryMode("register-earnings-plan")}
      />
    );
  }

  if (authEntryMode === "register-earnings-plan") {
    return (
      <ProfessionalEarningsPlanStep
        language={props.language}
        onContinue={() => setAuthEntryMode("register-earnings-calculator")}
      />
    );
  }

  if (authEntryMode === "register-earnings-calculator") {
    return (
      <ProfessionalEarningsCalculatorStep
        language={props.language}
        onBack={() => setAuthEntryMode("register-earnings-plan")}
        onContinue={() => setAuthEntryMode("register-terms")}
      />
    );
  }

  if (authEntryMode === "register-terms") {
    return (
      <ProfessionalTermsStep
        language={props.language}
        onBack={() => setAuthEntryMode("register-earnings-calculator")}
        onContinue={() => setAuthEntryMode("register-profile-intro")}
      />
    );
  }

  if (authEntryMode === "register-profile-intro") {
    return (
      <ProfessionalProfileIntroStep
        language={props.language}
        onBack={() => setAuthEntryMode("register-terms")}
        onContinue={() => setAuthEntryMode("register-photo")}
      />
    );
  }

  if (authEntryMode === "register-photo") {
    return (
      <ProfessionalPhotoStep
        language={props.language}
        onBack={() => setAuthEntryMode("register-profile-intro")}
        onContinue={() => setAuthEntryMode("register-profile-specialization")}
      />
    );
  }

  if (authEntryMode === "register-profile-specialization") {
    return (
      <ProfessionalProfileSpecializationStep
        language={props.language}
        values={profileSpecializations}
        onChange={setProfileSpecializations}
        onBack={() => setAuthEntryMode("register-photo")}
        onContinue={() => setAuthEntryMode("register-personal-data")}
      />
    );
  }

  if (authEntryMode === "register-personal-data") {
    return (
      <ProfessionalPersonalDataStep
        language={props.language}
        value={personalData}
        onChange={setPersonalData}
        onBack={() => setAuthEntryMode("register-profile-specialization")}
        onContinue={() => setAuthEntryMode("register-work-areas")}
      />
    );
  }

  if (authEntryMode === "register-work-areas") {
    return (
      <ProfessionalWorkAreasStep
        language={props.language}
        values={workAreas}
        onChange={setWorkAreas}
        onBack={() => setAuthEntryMode("register-personal-data")}
        onContinue={() => setAuthEntryMode("register-work-languages")}
      />
    );
  }

  if (authEntryMode === "register-work-languages") {
    return (
      <ProfessionalWorkLanguagesStep
        language={props.language}
        values={workLanguages}
        onChange={setWorkLanguages}
        onBack={() => setAuthEntryMode("register-work-areas")}
        onContinue={() => setAuthEntryMode("register-work-areas-by-problem")}
      />
    );
  }

  if (authEntryMode === "register-work-areas-by-problem") {
    return (
      <ProfessionalWorkAreasByClientProblemStep
        language={props.language}
        values={workAreasByProblem}
        onChange={setWorkAreasByProblem}
        onBack={() => setAuthEntryMode("register-work-languages")}
        onContinue={() => {
          if (!professionalProblemSelectionIsComplete(workAreasByProblem)) {
            return;
          }
          setAuthEntryMode("register-about-info-intro");
        }}
      />
    );
  }

  if (authEntryMode === "register-about-info-intro") {
    return (
      <ProfessionalAboutInfoIntroStep
        language={props.language}
        onBack={() => setAuthEntryMode("register-work-areas-by-problem")}
        onContinue={() => setAuthEntryMode("register-about")}
      />
    );
  }

  if (authEntryMode === "register-about") {
    return (
      <ProfessionalAboutStep
        language={props.language}
        value={aboutText}
        onChange={setAboutText}
        onBack={() => setAuthEntryMode("register-about-info-intro")}
        onContinue={() => setAuthEntryMode("register-therapy-description-info")}
      />
    );
  }

  if (authEntryMode === "register-therapy-description-info") {
    return (
      <ProfessionalTherapyDescriptionInfoStep
        language={props.language}
        onBack={() => setAuthEntryMode("register-about")}
        onContinue={() => setAuthEntryMode("register-therapy-description")}
      />
    );
  }

  if (authEntryMode === "register-therapy-description") {
    return (
      <ProfessionalTherapyDescriptionStep
        language={props.language}
        value={therapyDescriptionText}
        onChange={setTherapyDescriptionText}
        onBack={() => setAuthEntryMode("register-therapy-description-info")}
        onContinue={() => setAuthEntryMode("register-summary-info")}
      />
    );
  }

  if (authEntryMode === "register-summary-info") {
    return (
      <ProfessionalSummaryInfoStep
        language={props.language}
        onBack={() => setAuthEntryMode("register-therapy-description")}
        onContinue={() => setAuthEntryMode("register-summary")}
      />
    );
  }

  if (authEntryMode === "register-summary") {
    return (
      <ProfessionalSummaryStep
        language={props.language}
        value={summaryText}
        onChange={setSummaryText}
        onBack={() => setAuthEntryMode("register-summary-info")}
        onContinue={() => setAuthEntryMode("register-price")}
      />
    );
  }

  if (authEntryMode === "register-price") {
    return (
      <ProfessionalPriceStep
        language={props.language}
        currency={props.currency}
        value={priceData}
        onChange={setPriceData}
        onBack={() => setAuthEntryMode("register-summary")}
        onContinue={() => setAuthEntryMode("register-photo-info")}
      />
    );
  }

  if (authEntryMode === "register-photo-info") {
    return (
      <ProfessionalPhotoInfoStep
        language={props.language}
        currency={props.currency}
        onBack={() => setAuthEntryMode("register-price")}
        onContinue={() => setAuthEntryMode("register-photo-upload")}
      />
    );
  }

  if (authEntryMode === "register-photo-upload") {
    return (
      <ProfessionalPhotoUploadStep
        language={props.language}
        hasPhoto={profilePhotoLoaded}
        onPhotoDataUrl={(url) => setRegisterProfilePhotoDataUrl(url)}
        onPhotoSaved={() => setProfilePhotoLoaded(true)}
        onBack={() => setAuthEntryMode("register-photo-info")}
        onContinue={() => setAuthEntryMode("register-avatar-adjust")}
      />
    );
  }

  if (authEntryMode === "register-avatar-adjust") {
    return (
      <ProfessionalAvatarAdjustStep
        language={props.language}
        onBack={() => setAuthEntryMode("register-photo-upload")}
        onContinue={() => setAuthEntryMode("register-video-info")}
      />
    );
  }

  if (authEntryMode === "register-video-info") {
    return (
      <ProfessionalVideoInfoStep
        language={props.language}
        onBack={() => setAuthEntryMode("register-avatar-adjust")}
        onContinue={() => setAuthEntryMode("register-education-info")}
      />
    );
  }

  if (authEntryMode === "register-education-info") {
    return (
      <ProfessionalEducationInfoStep
        language={props.language}
        onBack={() => setAuthEntryMode("register-video-info")}
        onContinue={() => setAuthEntryMode("register-education")}
      />
    );
  }

  if (authEntryMode === "register-education") {
    return (
      <ProfessionalEducationStep
        language={props.language}
        value={educationData}
        onChange={setEducationData}
        onBack={() => setAuthEntryMode("register-education-info")}
        onContinue={() => setAuthEntryMode("register-stripe")}
      />
    );
  }

  if (authEntryMode === "register-stripe") {
    return (
      <ProfessionalStripeVerificationStep
        language={props.language}
        onBack={() => setAuthEntryMode("register-education")}
        onContinue={() => setAuthEntryMode("register-success-info")}
      />
    );
  }

  if (authEntryMode === "register-success-info") {
    return (
      <ProfessionalSuccessInfoStep
        language={props.language}
        onBack={() => setAuthEntryMode("register-stripe")}
        onContinue={() => {
          setRegisterBackMode("register-success-info");
          if (mobilePreAuthSession) {
            completeMobileOnboardingWithSession();
          } else {
            props.onPrepareOnboardingSync(buildMobileDraft());
            setAuthEntryMode("register");
          }
        }}
      />
    );
  }

  if (authEntryMode === "register-profile-card") {
    return (
      <ProfessionalProfileCardCheckStep
        language={props.language}
        onBack={() => setAuthEntryMode("register-success-info")}
        onContinue={() => setAuthEntryMode("register-profile-full")}
      />
    );
  }

  if (authEntryMode === "register-profile-full") {
    return (
      <ProfessionalProfileFullCheckStep
        language={props.language}
        onBack={() => setAuthEntryMode("register-profile-card")}
        onContinue={() => {
          if (mobilePreAuthSession) {
            completeMobileOnboardingWithSession();
          } else {
            props.onPrepareOnboardingSync(buildMobileDraft());
            setAuthEntryMode("register");
          }
        }}
      />
    );
  }

  return (
    <AuthScreen
      key={authEntryMode === "register" ? "auth-register" : "auth-login"}
      language={props.language}
      heroImage={PROFESSIONAL_AUTH_HERO_IMAGE}
      onHeroFallback={professionalAuthHeroFallback}
      onCreateAccount={() => {
        startProfessionalWebRegistration();
      }}
      onAuthSuccess={(params) => {
        props.onAuthSuccess(params);
        if (authEntryMode === "register") {
          props.onRegistrationAuthSuccess?.(params.user.id);
        }
      }}
      initialMode={authEntryMode === "register" ? "register" : "login"}
      initialEmail={registerEmail}
      initialPassword={registerPassword}
      initialFullName={personalData.fullName}
      onBack={() => setAuthEntryMode((mode) => (mode === "register" ? registerBackMode : "welcome"))}
    />
  );
}
