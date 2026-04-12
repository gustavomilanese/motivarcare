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
  /** Áreas de atención (preferido sobre `focusPrimary`). */
  focusAreas: string[] | null;
  languages: string[] | null;
  graduationYear: number | null;
  shortDescription: string | null;
  sessionPriceUsd: number | null;
  discount4: number | null;
  discount8: number | null;
  discount12: number | null;
  photoUrl: string | null;
  videoUrl: string | null;
  videoCoverUrl: string | null;
  stripeDocUrl: string | null;
  stripeVerified: boolean;
  stripeVerificationStarted: boolean;
  visible: boolean;
  diplomas: OnboardingDiplomaDraft[];
}

/** Sesión creada al registrar al inicio del onboarding web (validación de correo antes de seguir). */
export type ProfessionalWebOnboardingFinishMeta = {
  token: string;
  emailVerificationRequired: boolean;
  user: {
    id: string;
    fullName: string;
    email: string;
    emailVerified: boolean;
    professionalProfileId: string;
    avatarUrl?: string | null;
  };
};

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
  focusAreas: string[];
  languages: string[];
  /** Año de egreso del título principal (onboarding). */
  graduationYear: number | null;
  /** Derivado del año de egreso para scoring / compatibilidad. */
  yearsExperience: number | null;
  bio: string;
  shortDescription: string;
  therapeuticApproach: string;
  sessionPriceUsd: number | null;
  discount4: number | null;
  discount8: number | null;
  discount12: number | null;
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
    discount8: string;
    discount12: string;
  };
  personalData: {
    /** Año de egreso del título (paso identidad móvil). */
    graduationYear: string;
    gender: string;
    birthCountry: string;
  };
  educationData: {
    institution: string;
    specialty: string;
    startYear: string;
    graduationYear: string;
  };
  /** Foto de perfil (p. ej. data URL) capturada en el paso de carga móvil. */
  photoUrl?: string | null;
}
