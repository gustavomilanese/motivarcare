import type {
  OnboardingPatchDraft,
  ProfessionalMobileOnboardingInputs,
  ProfessionalWebOnboardingPayload
} from "./types";

function trimOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseNumericOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function yearsExperienceFromGraduationYear(graduationYear: number): number {
  const y = new Date().getFullYear() - graduationYear;
  return Math.max(0, Math.min(80, y));
}

export function createDefaultOnboardingPatchDraft(): OnboardingPatchDraft {
  return {
    bio: null,
    therapeuticApproach: null,
    yearsExperience: null,
    professionalTitle: null,
    specialization: null,
    experienceBand: null,
    practiceBand: null,
    gender: null,
    birthCountry: null,
    residencyCountry: null,
    focusPrimary: null,
    focusAreas: null,
    languages: null,
    graduationYear: null,
    shortDescription: null,
    sessionPriceArs: null,
    sessionPriceUsd: null,
    discount4: null,
    discount8: null,
    discount12: null,
    photoUrl: null,
    videoUrl: null,
    videoCoverUrl: null,
    stripeDocUrl: null,
    stripeVerified: false,
    stripeVerificationStarted: false,
    visible: false,
    diplomas: []
  };
}

export function buildPatchDraftFromWebPayload(payload: ProfessionalWebOnboardingPayload): OnboardingPatchDraft {
  return {
    bio: trimOrNull(payload.bio) ?? null,
    therapeuticApproach: trimOrNull(payload.therapeuticApproach) ?? null,
    yearsExperience: payload.yearsExperience,
    graduationYear: payload.graduationYear,
    professionalTitle: trimOrNull(payload.professionalTitle),
    specialization: trimOrNull(payload.specialization),
    experienceBand: trimOrNull(payload.experienceBand),
    practiceBand: trimOrNull(payload.practiceBand),
    gender: trimOrNull(payload.gender),
    birthCountry: trimOrNull(payload.birthCountry),
    residencyCountry: (() => {
      const v = payload.residencyCountry?.trim().toUpperCase();
      return v && /^[A-Z]{2}$/.test(v) ? v : null;
    })(),
    focusPrimary:
      payload.focusAreas.length > 0
        ? payload.focusAreas.join(", ").slice(0, 500)
        : null,
    focusAreas: payload.focusAreas.length ? payload.focusAreas : [],
    languages: payload.languages.length ? payload.languages : [],
    shortDescription: trimOrNull(payload.shortDescription),
    sessionPriceArs: payload.sessionPriceArs,
    sessionPriceUsd: payload.sessionPriceUsd,
    discount4: payload.discount4,
    discount8: payload.discount8,
    discount12: payload.discount12,
    photoUrl: payload.photoUrl,
    videoUrl: payload.videoUrl,
    videoCoverUrl: payload.videoCoverUrl,
    stripeDocUrl: payload.stripeDocUrl,
    stripeVerified: payload.stripeVerified,
    stripeVerificationStarted: payload.stripeVerificationStarted,
    visible: false,
    diplomas: payload.diplomas
  };
}

export function buildPatchDraftFromMobileInputs(inputs: ProfessionalMobileOnboardingInputs): OnboardingPatchDraft {
  const gyPersonal = parseNumericOrNull(inputs.personalData.graduationYear);
  const gyEdu = parseNumericOrNull(inputs.educationData.graduationYear);
  const graduationYear = gyPersonal ?? gyEdu;
  const yearsExperience =
    graduationYear !== null ? yearsExperienceFromGraduationYear(graduationYear) : null;

  return {
    bio: trimOrNull(inputs.aboutText),
    therapeuticApproach: trimOrNull(inputs.therapyDescriptionText),
    yearsExperience,
    graduationYear,
    professionalTitle: null,
    specialization: trimOrNull(inputs.selectedSpecialization),
    experienceBand: trimOrNull(inputs.selectedExperience),
    practiceBand: trimOrNull(inputs.selectedPracticeHours),
    gender: trimOrNull(inputs.personalData.gender),
    birthCountry: trimOrNull(inputs.personalData.birthCountry),
    residencyCountry: (() => {
      const v = inputs.personalData.residencyCountry?.trim().toUpperCase();
      return v && /^[A-Z]{2}$/.test(v) ? v : null;
    })(),
    focusPrimary:
      inputs.problemFocusSelections && inputs.problemFocusSelections.length > 0
        ? inputs.problemFocusSelections.join(", ").slice(0, 500)
        : null,
    focusAreas:
      inputs.problemFocusSelections && inputs.problemFocusSelections.length > 0
        ? inputs.problemFocusSelections
        : null,
    languages: inputs.workLanguages.length ? inputs.workLanguages : [],
    shortDescription: trimOrNull(inputs.summaryText),
    sessionPriceArs: parseNumericOrNull(inputs.priceData.sessionPriceArs ?? ""),
    sessionPriceUsd: parseNumericOrNull(inputs.priceData.sessionPrice),
    discount4: parseNumericOrNull(inputs.priceData.discount4),
    discount8: parseNumericOrNull(inputs.priceData.discount8),
    discount12: parseNumericOrNull(inputs.priceData.discount12),
    photoUrl: inputs.photoUrl?.trim() ? inputs.photoUrl.trim() : null,
    videoUrl: null,
    videoCoverUrl: null,
    stripeDocUrl: null,
    stripeVerified: false,
    stripeVerificationStarted: false,
    visible: false,
    diplomas: [
      {
        institution: inputs.educationData.institution.trim(),
        degree: inputs.educationData.specialty.trim(),
        startYear: Number(inputs.educationData.startYear),
        graduationYear: Number(inputs.educationData.graduationYear),
        documentUrl: null
      }
    ]
  };
}
