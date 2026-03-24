import type { AppLanguage, SupportedCurrency } from "@therapy/i18n-config";

export type RiskLevel = "low" | "medium" | "high";
export type PackageId = string;
export type SenderRole = "patient" | "professional";
export type ProfileTab = "data" | "cards" | "subscription" | "settings" | "support";
export type PackagePurchaseSource = "checkout_button";

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  emailVerified: boolean;
}

export interface AuthApiUser {
  id: string;
  fullName: string;
  email: string;
  role: "PATIENT" | "PROFESSIONAL" | "ADMIN";
  emailVerified: boolean;
  patientProfileId: string | null;
  professionalProfileId: string | null;
}

export interface AuthApiResponse {
  token: string;
  user: AuthApiUser;
  emailVerificationRequired: boolean;
  devEmailVerificationBypassEnabled?: boolean;
  verificationEmailSent?: boolean;
}

export interface AuthMeApiResponse {
  user: AuthApiUser;
  emailVerificationRequired: boolean;
  devEmailVerificationBypassEnabled?: boolean;
}

export interface ProfileMeApiResponse {
  role: "PATIENT" | "PROFESSIONAL" | "ADMIN";
  profile: {
    id?: string;
    timezone?: string;
    lastSeenTimezone?: string | null;
    status?: string;
    intakeRiskLevel?: "low" | "medium" | "high" | null;
    intakeTriageDecision?: "pending" | "approved" | "cancelled" | null;
    intakeRiskBlocked?: boolean;
    intakeCompletedAt?: string | null;
    latestPackage?: {
      id: string;
      name: string;
      remainingCredits: number;
      totalCredits: number;
      purchasedAt: string;
    } | null;
    activeProfessional?: {
      id: string;
      userId: string;
      fullName: string;
      email: string;
    } | null;
  } | null;
}

export interface SubmitIntakeApiResponse {
  intake: {
    id: string;
    riskLevel: "low" | "medium" | "high";
    completedAt: string;
  };
}

export interface BookingsMineApiResponse {
  bookings: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    status: string;
    professionalId?: string;
    joinUrl?: string | null;
    patientTimezoneAtBooking?: string;
    professionalTimezoneAtBooking?: string;
    createdAt: string;
  }>;
}

export interface AvailabilitySlotsApiResponse {
  professionalId: string;
  slots: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
  }>;
}

export interface IntakeQuestion {
  id: string;
  title: string;
  help: string;
  options?: string[];
  multiline?: boolean;
}

export interface IntakeState {
  completed: boolean;
  completedAt: string;
  riskLevel: RiskLevel;
  riskBlocked: boolean;
  triageDecision?: "pending" | "approved" | "cancelled" | null;
  answers: Record<string, string>;
}

export interface Professional {
  id: string;
  fullName: string;
  title: string;
  yearsExperience: number;
  compatibility: number;
  specialties: string[];
  languages: string[];
  approach: string;
  bio: string;
  rating: number;
  reviewsCount?: number;
  verified?: boolean;
  sessionPriceUsd?: number;
  activePatients: number;
  introVideoUrl: string;
  slots: TimeSlot[];
}

export interface TimeSlot {
  id: string;
  startsAt: string;
  endsAt: string;
}

export interface Booking {
  id: string;
  professionalId: string;
  startsAt: string;
  endsAt: string;
  status: "confirmed" | "cancelled";
  joinUrl: string;
  createdAt: string;
  patientTimezoneAtBooking?: string;
  professionalTimezoneAtBooking?: string;
  bookingMode?: "credit" | "trial";
}

export interface Message {
  id: string;
  professionalId: string;
  sender: SenderRole;
  text: string;
  read: boolean;
  createdAt: string;
}

export interface SubscriptionState {
  packageId: PackageId | null;
  packageName: string;
  creditsTotal: number;
  creditsRemaining: number;
  purchasedAt?: string;
}

export interface PaymentCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: string;
  expYear: string;
}

export interface PatientProfile {
  timezone: string;
  phone: string;
  emergencyContact: string;
  notificationsEmail: boolean;
  notificationsReminder: boolean;
  dashboardPhotoDataUrl: string;
  cards: PaymentCard[];
}

export interface PatientAppState {
  session: SessionUser | null;
  authToken: string | null;
  emailVerificationRequired: boolean;
  language: AppLanguage;
  currency: SupportedCurrency;
  intake: IntakeState | null;
  onboardingFinalCompleted: boolean;
  therapistSelectionCompleted: boolean;
  selectedProfessionalId: string;
  assignedProfessionalId: string | null;
  assignedProfessionalName: string | null;
  activeChatProfessionalId: string;
  bookedSlotIds: string[];
  favoriteProfessionalIds: string[];
  bookings: Booking[];
  trialUsedProfessionalIds: string[];
  messages: Message[];
  subscription: SubscriptionState;
  profile: PatientProfile;
}

export interface ApiChatThread {
  id: string;
  patientId: string;
  professionalId: string;
  counterpartName: string;
  counterpartUserId: string;
  lastMessage: {
    id: string;
    body: string;
    createdAt: string;
    senderUserId: string;
  } | null;
  unreadCount: number;
}

export interface ApiChatMessage {
  id: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  senderUserId: string;
  senderName: string;
  senderRole: "PATIENT" | "PROFESSIONAL" | "ADMIN";
}

export interface PackagePlan {
  id: PackageId;
  name: string;
  credits: number;
  priceCents: number;
  currency: string;
  discountPercent: number;
  description: string;
  professionalId?: string | null;
  professionalName?: string | null;
  stripePriceId?: string;
}

export interface PublicSessionPackagesResponse {
  featuredPackageId: string | null;
  sessionPackages: Array<{
    id: string;
    professionalId: string | null;
    professionalName: string | null;
    stripePriceId: string;
    name: string;
    credits: number;
    priceCents: number;
    discountPercent: number;
    currency: string;
    active: boolean;
    createdAt: string;
  }>;
}

export interface PublicPackageCatalog {
  plans: PackagePlan[];
  featuredPackageId: string | null;
}
