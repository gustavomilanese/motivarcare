export type UserRole = "PATIENT" | "PROFESSIONAL" | "ADMIN";

export type BookingStatus =
  | "REQUESTED"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

export type PackageSize = "4" | "8" | "12";

export {
  avatarInitialsFromNameParts,
  joinFirstLastToFullName,
  professionalListingFromFullNameOnly,
  professionalPublicListingLabel,
  resolvedFirstLastFromUserRecord,
  splitFullNameToFirstLast,
  userNamePartsFromFullNameString
} from "./userName.js";

export { MARKETS, isMarket, billingCurrencyCodeForMarket, majorCurrencyCodeForMarket, CANONICAL_BILLING_CURRENCY, type Market } from "./market.js";

export {
  RESIDENCY_COUNTRY_OPTIONS,
  PATIENT_PORTAL_RESIDENCY_CODES,
  filterResidencyOptionsForPatientPortal,
  marketFromResidencyCountry,
  residencyCountryLabel,
  type ResidencyCountryOption
} from "./residencyMarket.js";

export type {
  LandingPackagesSlotId,
  SessionPackagesVisibilityPayload
} from "./sessionPackageVisibility.js";

export {
  getEmergencyResources,
  renderEmergencyResourcesText,
  __emergencyResourcesInternals,
  type CountryEmergencyResources,
  type EmergencyResource
} from "./emergencyResources.js";

export {
  EMOTIONAL_DIARY_WHAT_HAPPENED_MAX_LENGTH
} from "./emotionalDiary.js";
export type {
  EmotionalDiaryEntry,
  EmotionalDiaryEntryStatus,
  EmotionalDiaryInsight,
  EmotionalDiaryMood,
  EmotionalDiaryMoodTrendPoint,
  EmotionalDiaryPatientListItem,
  EmotionalDiarySessionSummary,
  EmotionalDiarySettings,
  EmotionalDiaryStats
} from "./emotionalDiary.js";

export {
  MIN_COMPLETED_SESSIONS_FOR_PROFESSIONAL_REVIEW
} from "./professionalReviews.js";
export type {
  CreateProfessionalReviewPayload,
  PendingProfessionalReviewPrompt,
  ProfessionalReviewPublicItem,
  ProfessionalReviewStats
} from "./professionalReviews.js";

export interface CancellationPolicy {
  freeCancellationHours: number;
  lateCancellationPenalty: "none" | "partial_credit" | "full_credit";
  noShowPenalty: "none" | "partial_credit" | "full_credit";
}
