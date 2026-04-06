import { useState } from "react";
import {
  type AppLanguage,
  type SupportedCurrency
} from "@therapy/i18n-config";
import {
  buildPatchDraftFromMobileInputs,
  buildPatchDraftFromWebPayload,
  type OnboardingPatchDraft
} from "../../onboarding";
import {
  ProfessionalAboutInfoIntroStep,
  ProfessionalAboutStep,
  ProfessionalAvatarAdjustStep,
  ProfessionalAverageClientsStep,
  ProfessionalEarningsCalculatorStep,
  ProfessionalEarningsPlanStep,
  ProfessionalEducationInfoStep,
  ProfessionalEducationStep,
  ProfessionalEmailStep,
  ProfessionalExperienceStep,
  ProfessionalFirstClientsStep,
  ProfessionalPasswordStep,
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
  ProfessionalVideoCoverStep,
  ProfessionalVideoInfoStep,
  ProfessionalWelcomeGate,
  ProfessionalWorkAreasByClientProblemStep,
  ProfessionalWorkAreasStep,
  ProfessionalWorkLanguagesStep
} from "../../onboarding/components/MobileOnboardingSteps";
import { ProfessionalWebOnboardingWizard } from "../../onboarding/components/ProfessionalWebOnboardingWizard";
import { AuthScreen } from "./AuthScreen";
import type { AuthUser } from "../types";

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
  | "register-password"
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
  | "register-video-cover"
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
  onLanguageChange: (language: AppLanguage) => void;
  onCurrencyChange: (currency: SupportedCurrency) => void;
  onAuthSuccess: (params: { token: string; user: AuthUser; emailVerificationRequired: boolean }) => void;
  onRegistrationAuthSuccess?: (userId: string) => void;
  onPrepareOnboardingSync: (draft: OnboardingPatchDraft) => void;
}) {
  const [authEntryMode, setAuthEntryMode] = useState<AuthEntryMode>("welcome");
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
    discount12: "10",
    discount24: "20"
  });
  const [profilePhotoLoaded, setProfilePhotoLoaded] = useState(false);
  const [videoCoverSelected, setVideoCoverSelected] = useState(false);
  const [educationData, setEducationData] = useState({
    institution: "Colegio Manuel Belgrano",
    specialty: "Psicologo social",
    startYear: "2014",
    graduationYear: "2018",
    diplomaUploaded: true
  });
  const [personalData, setPersonalData] = useState({
    publicName: "",
    firstName: "",
    fullName: "",
    practiceHours: "",
    yearsExperience: "",
    gender: "",
    birthYear: "",
    birthCountry: ""
  });

  const buildMobileDraft = () => buildPatchDraftFromMobileInputs({
    aboutText,
    therapyDescriptionText,
    selectedSpecialization,
    selectedExperience,
    selectedPracticeHours,
    workLanguages,
    summaryText,
    priceData,
    personalData: {
      yearsExperience: personalData.yearsExperience,
      gender: personalData.gender,
      birthCountry: personalData.birthCountry
    },
    educationData: {
      institution: educationData.institution,
      specialty: educationData.specialty,
      startYear: educationData.startYear,
      graduationYear: educationData.graduationYear
    }
  });

  const handleRegisterStart = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setRegisterBackMode("register-web");
      setAuthEntryMode("register-web");
      return;
    }
    setRegisterBackMode("register-profile-full");
    setAuthEntryMode("register-intro");
  };

  if (authEntryMode === "welcome") {
    return (
      <ProfessionalWelcomeGate
        language={props.language}
        onLanguageChange={props.onLanguageChange}
        onLogin={() => setAuthEntryMode("login")}
        onRegister={handleRegisterStart}
      />
    );
  }

  if (authEntryMode === "register-web") {
    return (
      <ProfessionalWebOnboardingWizard
        language={props.language}
        onBack={() => setAuthEntryMode("welcome")}
        onSwitchToMobile={() => {
          setRegisterBackMode("register-profile-full");
          setAuthEntryMode("register-intro");
        }}
        onFinish={(payload) => {
          setRegisterEmail(payload.email);
          setRegisterPassword(payload.password);
          setPersonalData((current) => ({ ...current, fullName: payload.fullName }));
          props.onPrepareOnboardingSync(buildPatchDraftFromWebPayload(payload));
          setRegisterBackMode("register-web");
          setAuthEntryMode("register");
        }}
      />
    );
  }

  if (authEntryMode === "register-intro") {
    return (
      <ProfessionalRegisterIntro
        language={props.language}
        onBack={() => setAuthEntryMode("welcome")}
        onContinue={() => setAuthEntryMode("register-specialization")}
      />
    );
  }

  if (authEntryMode === "register-specialization") {
    return (
      <ProfessionalSpecializationStep
        language={props.language}
        value={selectedSpecialization}
        onSelect={setSelectedSpecialization}
        onBack={() => setAuthEntryMode("register-intro")}
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
        onContinue={() => setAuthEntryMode("register-email")}
      />
    );
  }

  if (authEntryMode === "register-email") {
    return (
      <ProfessionalEmailStep
        language={props.language}
        value={registerEmail}
        onChange={setRegisterEmail}
        onBack={() => setAuthEntryMode("register-terms")}
        onContinue={() => setAuthEntryMode("register-password")}
      />
    );
  }

  if (authEntryMode === "register-password") {
    return (
      <ProfessionalPasswordStep
        language={props.language}
        value={registerPassword}
        onChange={setRegisterPassword}
        onBack={() => setAuthEntryMode("register-email")}
        onContinue={() => setAuthEntryMode("register-profile-intro")}
      />
    );
  }

  if (authEntryMode === "register-profile-intro") {
    return (
      <ProfessionalProfileIntroStep
        language={props.language}
        onBack={() => setAuthEntryMode("register-password")}
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
        onContinue={() => setAuthEntryMode("register-about-info-intro")}
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
        onContinue={() => setAuthEntryMode("register-video-cover")}
      />
    );
  }

  if (authEntryMode === "register-video-cover") {
    return (
      <ProfessionalVideoCoverStep
        language={props.language}
        coverSelected={videoCoverSelected}
        onSelectCover={(_file) => setVideoCoverSelected(true)}
        onBack={() => setAuthEntryMode("register-video-info")}
        onContinue={() => setAuthEntryMode("register-education-info")}
      />
    );
  }

  if (authEntryMode === "register-education-info") {
    return (
      <ProfessionalEducationInfoStep
        language={props.language}
        onBack={() => setAuthEntryMode("register-video-cover")}
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
          props.onPrepareOnboardingSync(buildMobileDraft());
          setRegisterBackMode("register-success-info");
          setAuthEntryMode("register");
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
          props.onPrepareOnboardingSync(buildMobileDraft());
          setAuthEntryMode("register");
        }}
      />
    );
  }

  return (
    <AuthScreen
      language={props.language}
      currency={props.currency}
      onLanguageChange={props.onLanguageChange}
      onCurrencyChange={props.onCurrencyChange}
      onAuthSuccess={(params) => {
        props.onAuthSuccess(params);
        if (authEntryMode === "register") {
          props.onRegistrationAuthSuccess?.(params.user.id);
        }
      }}
      initialMode={authEntryMode}
      initialEmail={registerEmail}
      initialPassword={registerPassword}
      initialFullName={personalData.fullName}
      onBack={() => setAuthEntryMode((mode) => (mode === "register" ? registerBackMode : "welcome"))}
    />
  );
}
