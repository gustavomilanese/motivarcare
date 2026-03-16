import type { AppLanguage } from "@therapy/i18n-config";

export type PortalSection =
  | "/"
  | "/agenda"
  | "/horarios"
  | "/disponibilidad"
  | "/pacientes"
  | "/chat"
  | "/ingresos"
  | "/admin"
  | "/perfil"
  | "/ajustes";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  emailVerified: boolean;
  role: "PROFESSIONAL";
  professionalProfileId: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    emailVerified: boolean;
    role: "PATIENT" | "PROFESSIONAL" | "ADMIN";
    professionalProfileId: string | null;
  };
  emailVerificationRequired: boolean;
  devEmailVerificationBypassEnabled?: boolean;
  verificationEmailSent?: boolean;
}

export interface DashboardResponse {
  kpis: {
    activePatients: number;
    sessionsCompleted: number;
    sessionsScheduled: number;
    conversionRate: number;
    hoursAvailable: number;
    weeklySessions: number;
    pendingPayoutCents: number;
  };
  trialSession: {
    id: string;
    patientId: string;
    patientName: string;
    patientEmail: string;
    startsAt: string;
    endsAt: string;
    status: string;
  } | null;
  upcomingSessions: Array<{
    id: string;
    patientId: string;
    patientName: string;
    patientEmail: string;
    startsAt: string;
    endsAt: string;
    status: string;
    joinUrl: string | null;
  }>;
}

export interface AvailabilitySlot {
  id: string;
  startsAt: string;
  endsAt: string;
  isBlocked: boolean;
  source: string;
}

export interface ProfessionalBookingsResponse {
  bookings: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    status: string;
    createdAt?: string;
    patientId?: string;
    counterpartName?: string;
    counterpartEmail?: string;
    joinUrl?: string | null;
  }>;
}

export interface PatientsResponse {
  patients: Array<{
    patientId: string;
    patientName: string;
    patientEmail: string;
    totalSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    daysSinceLastSession: number;
    status: "active" | "pause" | "cancelled" | "trial";
  }>;
}

export interface EarningsResponse {
  summary: {
    totalCents: number;
    currentPeriodCents: number;
    totalSessions: number;
    currentPeriodSessions: number;
    sessionFeeCents: number;
  };
  movements: Array<{
    bookingId: string;
    patientName: string;
    startsAt: string;
    amountCents: number;
    status: string;
  }>;
}

export interface ThreadSummary {
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
  createdAt: string;
}

export interface ThreadMessage {
  id: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  senderUserId: string;
  senderName: string;
  senderRole: "PATIENT" | "PROFESSIONAL" | "ADMIN";
}

export interface ProfessionalProfile {
  id: string;
  fullName: string;
  email: string;
  visible: boolean;
  professionalTitle: string | null;
  specialization: string | null;
  experienceBand: string | null;
  practiceBand: string | null;
  gender: string | null;
  birthCountry: string | null;
  focusPrimary: string | null;
  languages: string[];
  bio: string | null;
  shortDescription: string | null;
  therapeuticApproach: string | null;
  yearsExperience: number | null;
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
  cancellationHours: number;
  timezone: string;
  lastSeenTimezone?: string | null;
  diplomas?: Array<{
    id?: string;
    institution: string;
    degree: string;
    startYear: number;
    graduationYear: number;
    documentUrl: string | null;
  }>;
}

export interface AdminData {
  taxId?: string;
  payoutMethod?: string;
  payoutAccount?: string;
  legalAcceptedAt?: string | null;
  acceptedDocuments?: string[];
  notes?: string;
}

export interface ProfessionalSummaryCardData {
  id: string;
  fullName: string;
  title: string;
  yearsExperience: number;
  specialization: string;
  profileImage: string | null;
  profileUrl: string | null;
  currentPatients: number;
  recentBookingsCount: number;
}

export interface ProfessionalOnboardingProfilePayload {
  language: AppLanguage;
  currency: "USD" | "ARS" | "BRL" | "EUR";
  profile: ProfessionalProfile;
}
