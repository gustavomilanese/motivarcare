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

export { MARKETS, isMarket, majorCurrencyCodeForMarket, type Market } from "./market.js";

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

export interface CancellationPolicy {
  freeCancellationHours: number;
  lateCancellationPenalty: "none" | "partial_credit" | "full_credit";
  noShowPenalty: "none" | "partial_credit" | "full_credit";
}
