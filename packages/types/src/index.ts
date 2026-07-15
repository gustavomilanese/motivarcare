export {
  PROFESSIONAL_KIND_OPTIONS_ES,
  DEFAULT_PROFESSIONAL_KIND_ES,
  isKnownProfessionalKind,
  resolveProfessionalKindLabel,
  type ProfessionalKindEs
} from "./professionalKind.js";

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

export {
  DLOCAL_GO_PAYER_COUNTRIES,
  DLOCAL_CHECKOUT_UNAVAILABLE_ERROR,
  normalizeResidencyCountryIso2,
  isDlocalGoPayerCountry,
  resolveDlocalPayerCountry,
  isDlocalGoCheckoutAvailable
} from "./dlocalGoCoverage.js";

export {
  RESIDENCY_DISPLAY_CURRENCY,
  PATIENT_LIVE_FX_CURRENCY_CODES,
  displayCurrencyCodeForResidencyCountry,
  defaultDisplayCurrencyCodeForPatient,
  type PatientLiveFxCurrencyCode
} from "./patientDisplayCurrency.js";

export {
  PATIENT_INTAKE_COUPLES_THERAPY_OPTION_ES,
  PROFESSIONAL_ATTENTION_AREA_COUPLES_ES,
  PATIENT_INTAKE_COUPLES_THERAPY_FOCUS_ANSWER_ID,
  focusAreasIncludeCouplesTherapy,
  isCouplesIntakeActive,
  patientSeeksCouplesTherapy
} from "./therapyModality.js";

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

export type {
  ProfessionalPayoutAdminData,
  ProfessionalPayoutBankAccount,
  ProfessionalPayoutBankTransferType,
  ProfessionalPayoutProvider,
  ProfessionalPayoutStatus
} from "./professionalPayoutProfile.js";

export {
  DLOCAL_PAYOUT_COUNTRY_CODES,
  DLOCAL_PAYOUT_CURRENCY,
  DLOCAL_PAYOUT_PURPOSE,
  normalizePayoutCountry,
  isDlocalPayoutCountry,
  getDlocalPayoutCountryConfig,
  dlocalPayoutCurrencyForCountry,
  dlocalPayoutCountryOptions,
  normalizeDlocalField,
  normalizeDlocalAccountValue,
  resolveDlocalAccountRule,
  validateDlocalPayoutProfile,
  isDlocalPayoutProfileComplete
} from "./dlocalPayouts.js";
export type {
  DlocalPayoutCountry,
  DlocalPayoutFlowType,
  DlocalPayoutAccountType,
  DlocalPayoutPurpose,
  DlocalDocumentTypeOption,
  DlocalFieldKind,
  DlocalFieldRule,
  DlocalPayoutCountryConfig,
  DlocalPayoutProfileInput,
  DlocalPayoutValidationError
} from "./dlocalPayouts.js";

export {
  DLOCAL_PAYOUT_BANK_CODES,
  dlocalPayoutBankCodes,
  dlocalPayoutBankCodeMode,
  isKnownDlocalBankCode
} from "./dlocalPayoutBankCodes.js";
export type { DlocalBankCode } from "./dlocalPayoutBankCodes.js";

export interface CancellationPolicy {
  freeCancellationHours: number;
  lateCancellationPenalty: "none" | "partial_credit" | "full_credit";
  noShowPenalty: "none" | "partial_credit" | "full_credit";
}
