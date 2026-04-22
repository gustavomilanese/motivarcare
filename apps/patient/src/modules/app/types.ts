import type { AppLanguage, SupportedCurrency } from "@therapy/i18n-config";
import type { Market } from "@therapy/types";

export type RiskLevel = "low" | "medium" | "high";
export type PackageId = string;
export type SenderRole = "patient" | "professional";
export type ProfileTab = "data" | "cards" | "subscription" | "settings" | "support";
export type PackagePurchaseSource = "checkout_button";

export interface SessionUser {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  emailVerified: boolean;
  /** Foto de perfil (URL o data URL); la ven profesionales y apps móviles. */
  avatarUrl?: string | null;
}

export interface AuthApiUser {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  avatarUrl?: string | null;
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
  /** Viene de GET /me; no persistir en localStorage (se renueva en cada sync). */
  googleCalendarConnected?: boolean;
}

export interface ProfileMeApiResponse {
  role: "PATIENT" | "PROFESSIONAL" | "ADMIN";
  profile: {
    id?: string;
    /** Mercado comercial del paciente (catálogo de paquetes). */
    market?: Market;
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
    recentPackages?: Array<{
      id: string;
      name: string;
      credits: number;
      purchasedAt: string;
      priceCents?: number | null;
      currency?: string | null;
    }>;
    activeProfessional?: {
      id: string;
      userId: string;
      firstName?: string;
      lastName?: string;
      fullName: string;
      email: string;
      photoUrl?: string | null;
    } | null;
  } | null;
}

export interface PurchasePackageApiResponse {
  purchase: {
    id: string;
    packageId: string;
    packageName: string;
    packagePriceCents?: number;
    packageCurrency?: string;
    totalCredits: number;
    remainingCredits: number;
    purchasedAt: string;
  };
}

export interface SubmitIntakeApiResponse {
  intake: {
    id: string;
    riskLevel: "low" | "medium" | "high";
    completedAt: string;
  };
  market?: Market;
  residencyCountry?: string;
}

export interface BookingsMineApiResponse {
  bookings: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    status: string;
    bookingMode?: "credit" | "trial";
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
  /** Permite elegir varias opciones a la vez (valor guardado unido con saltos de línea). */
  allowMultiple?: boolean;
  /** Paso opcional (no bloquea continuar / enviar). */
  optional?: boolean;
  /** Subida de foto de perfil; no se incluye en el body de intake (se envía aparte con PATCH /me). */
  profilePhoto?: boolean;
  /** Texto bajo cada opción (mismo orden y longitud que `options`). */
  optionSubtexts?: string[];
  /** Con `allowMultiple`: si se elige esta opción (texto en ES), se limpian el resto de chips del paso. */
  exclusiveOptionEs?: string;
  /** Con `allowMultiple`: abre textarea cuando esta opción está entre las elegidas. */
  otherFollowupOption?: string;
  /** Si es true, la última opción de la lista abre pantalla de crisis al intentar avanzar. */
  crisisLastOption?: boolean;
  /** Paso 3 preferencias: UI compuesta (desplegables + “No tengo preferencias”), no chips de `options`. */
  therapistPreferenceComposite?: boolean;
}

export interface IntakeState {
  completed: boolean;
  completedAt: string;
  riskLevel: RiskLevel;
  riskBlocked: boolean;
  triageDecision?: "pending" | "approved" | "cancelled" | null;
  answers: Record<string, string>;
}

export type IntakeCompletionPayload = {
  answers: Record<string, string>;
  /** ISO 3166-1 alpha-2; define mercado comercial en API. */
  residencyCountry: string;
};

export interface Professional {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
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
  purchaseHistory: Array<{
    id: string;
    name: string;
    credits: number;
    purchasedAt: string;
    priceCents?: number | null;
    currency?: string | null;
  }>;
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
  /** Conexión Google Calendar (servidor); no hidratar desde localStorage. */
  googleCalendarConnected: boolean;
  emailVerificationRequired: boolean;
  language: AppLanguage;
  currency: SupportedCurrency;
  /** Mercado (AR por defecto); alineado con `PatientProfile.market` en API. */
  patientMarket: Market;
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
  counterpartPhotoUrl?: string | null;
  lastMessage: {
    id: string;
    body: string;
    createdAt: string;
    senderUserId: string;
  } | null;
  unreadCount: number;
}

export interface ApiChatThreadsResponse {
  threads: ApiChatThread[];
  availableProfessionalIds?: string[];
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
  market?: Market;
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
