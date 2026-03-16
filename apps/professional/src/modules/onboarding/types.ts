export interface OnboardingDiplomaDraft {
  institution: string;
  degree: string;
  startYear: number;
  graduationYear: number;
  documentUrl: string | null;
}

export interface OnboardingPatchDraft {
  bio: string | null;
  therapeuticApproach: string | null;
  yearsExperience: number | null;
  professionalTitle: string | null;
  specialization: string | null;
  experienceBand: string | null;
  practiceBand: string | null;
  gender: string | null;
  birthCountry: string | null;
  focusPrimary: string | null;
  languages: string[] | null;
  shortDescription: string | null;
  sessionPriceUsd: number | null;
  discount4: number | null;
  discount12: number | null;
  discount24: number | null;
  photoUrl: string | null;
  videoUrl: string | null;
  videoCoverUrl: string | null;
  stripeDocUrl: string | null;
  stripeVerified: boolean;
  stripeVerificationStarted: boolean;
  visible: boolean;
  diplomas: OnboardingDiplomaDraft[];
}

export interface ProfessionalWebOnboardingPayload {
  fullName: string;
  email: string;
  password: string;
  professionalTitle: string;
  specialization: string;
  experienceBand: string;
  practiceBand: string;
  gender: string;
  birthCountry: string;
  focusPrimary: string;
  languages: string[];
  yearsExperience: number | null;
  bio: string;
  shortDescription: string;
  therapeuticApproach: string;
  sessionPriceUsd: number | null;
  discount4: number | null;
  discount12: number | null;
  discount24: number | null;
  photoUrl: string | null;
  videoUrl: string | null;
  videoCoverUrl: string | null;
  stripeDocUrl: string | null;
  stripeVerified: boolean;
  stripeVerificationStarted: boolean;
  diplomas: OnboardingDiplomaDraft[];
}

export interface ProfessionalMobileOnboardingInputs {
  aboutText: string;
  therapyDescriptionText: string;
  selectedSpecialization: string;
  selectedExperience: string;
  selectedPracticeHours: string;
  workLanguages: string[];
  summaryText: string;
  priceData: {
    sessionPrice: string;
    discount4: string;
    discount12: string;
    discount24: string;
  };
  personalData: {
    yearsExperience: string;
    gender: string;
    birthCountry: string;
  };
  educationData: {
    institution: string;
    specialty: string;
    startYear: string;
    graduationYear: string;
  };
}
