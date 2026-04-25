import type { AppLanguage, LocalizedText } from "@therapy/i18n-config";
import type { SyntheticEvent } from "react";
import type { Market } from "@therapy/types";

export interface ProfessionalDirectoryApiItem {
  id: string;
  userId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  title: string;
  specialization: string | null;
  focusPrimary: string | null;
  /** (Opcional) áreas declaradas; alimenta matching de tópicos y LGBTIQ+. */
  focusAreas?: string[];
  birthCountry: string | null;
  /** (Opcional) género del profesional; alimenta matching de `therapistPreferences.gender`. */
  gender?: string | null;
  /** (Opcional) año de egreso del título; alimenta matching de `therapistPreferences.age`. */
  graduationYear?: number | null;
  bio: string | null;
  therapeuticApproach: string | null;
  languages: string[];
  yearsExperience: number | null;
  sessionPriceUsd: number | null;
  photoUrl: string | null;
  videoUrl: string | null;
  stripeVerified: boolean;
  cancellationHours: number;
  compatibility: number;
  sessionDurationMinutes: number;
  activePatientsCount: number;
  completedSessionsCount: number;
  sessionsCount: number;
  ratingAverage: number | null;
  reviewsCount: number;
  matchScore?: number;
  matchReasons?: string[];
  matchedTopics?: string[];
  suggestedSlots?: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
  }>;
  slots: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
  }>;
}

export interface ProfessionalDirectoryApiResponse {
  professionals: ProfessionalDirectoryApiItem[];
}

export interface MatchCardProfessional {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  title: string;
  specialization: string | null;
  focusPrimary: string | null;
  /** (Opcional) áreas declaradas; alimenta matching de tópicos y LGBTIQ+. */
  focusAreas?: string[];
  bio: string | null;
  therapeuticApproach: string | null;
  languages: string[];
  yearsExperience: number;
  sessionPriceArs: number | null;
  sessionPriceUsd: number | null;
  photoUrl: string | null;
  birthCountry: string | null;
  /** (Opcional) género del profesional; alimenta matching de `therapistPreferences.gender`. */
  gender?: string | null;
  /** (Opcional) año de egreso del título; alimenta matching de `therapistPreferences.age`. */
  graduationYear?: number | null;
  stripeVerified: boolean;
  ratingAverage: number | null;
  reviewsCount: number;
  matchScore?: number;
  matchReasons?: string[];
  matchedTopics?: string[];
  suggestedSlots?: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
  }>;
  sessionDurationMinutes: number;
  activePatientsCount: number;
  completedSessionsCount: number;
  sessionsCount: number;
  compatibilityBase: number;
  slots: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
  }>;
}

export interface MatchTimeSlot {
  id: string;
  startsAt: string;
  endsAt: string;
}

export interface MatchingPageProps {
  language: AppLanguage;
  /** Mercado del paciente (precio mostrado / ordenación por lista). */
  patientMarket: Market;
  authToken?: string | null;
  mode?: "portal" | "onboarding-final";
  intakeAnswers: Record<string, string>;
  isFirstSelectionRequired: boolean;
  showOnlyFavorites?: boolean;
  favoriteProfessionalIds: string[];
  selectedProfessionalId: string;
  onSelectProfessional: (professionalId: string) => void;
  onToggleFavorite: (professionalId: string) => void;
  onToggleFavoritesView?: (showOnlyFavorites: boolean) => void;
  onCompleteFirstSelection: (payload: { professionalId: string; professionalName: string }) => void;
  /** Onboarding: omitir asignación y entrar al portal sin profesional activo. */
  onDeferTherapistSelection?: () => void | Promise<void>;
  onCreateBooking: (professionalId: string, slot: MatchTimeSlot) => Promise<void> | void;
  onReserve: (professionalId: string) => void;
  onChat: (professionalId: string) => void;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
}

export interface FilterOption {
  value: string;
  label: string;
}

export type SortMode = "match" | "price-asc" | "price-desc" | "rating-desc" | "reviews-desc";

export interface SortOption {
  value: SortMode;
  label: string;
}

export interface MatchingCopy {
  heading: string;
  description: string;
  countLabel: string;
  emptyLabel: string;
  continueLabel: string;
  continueHint: string;
  searchPlaceholder: string;
  noResults: string;
}

export type TranslationFn = (values: LocalizedText) => string;
