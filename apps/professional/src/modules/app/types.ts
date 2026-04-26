import type { AppLanguage } from "@therapy/i18n-config";
import type { Market } from "@therapy/types";

export type PortalSection =
  | "/"
  | "/agenda"
  | "/horarios"
  | "/disponibilidad"
  | "/agenda/ajustes"
  | "/pacientes"
  | "/chat"
  | "/reportes"
  | "/ingresos"
  | "/admin"
  | "/perfil"
  | "/ajustes";

export interface AuthUser {
  id: string;
  fullName: string;
  /** Nombre/apellido estructurados (auth/me); si faltan, el saludo usa fullName con heurística. */
  firstName?: string;
  lastName?: string;
  email: string;
  emailVerified: boolean;
  role: "PROFESSIONAL";
  professionalProfileId: string;
  avatarUrl?: string | null;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    fullName: string;
    firstName?: string;
    lastName?: string;
    email: string;
    emailVerified: boolean;
    role: "PATIENT" | "PROFESSIONAL" | "ADMIN";
    professionalProfileId: string | null;
    avatarUrl?: string | null;
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
  /** Sesiones COMPLETED con filas en finance: precios efectivos por paquete / lista. */
  revenueStats: {
    grossCents: number;
    platformFeeCents: number;
    professionalNetCents: number;
    completedSessions: number;
    range: {
      from: string | null;
      to: string;
      allTime: boolean;
    };
  };
  trialSession: {
    id: string;
    patientId: string;
    patientName: string;
    patientEmail: string;
    patientAvatarUrl?: string | null;
    startsAt: string;
    endsAt: string;
    status: string;
  } | null;
  upcomingSessions: Array<{
    id: string;
    patientId: string;
    patientName: string;
    patientEmail: string;
    patientAvatarUrl?: string | null;
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
    avatarUrl?: string | null;
    totalSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    daysSinceLastSession: number;
    status: "active" | "pause" | "cancelled" | "trial";
  }>;
}

export interface EarningsResponse {
  summary: {
    grossCents: number;
    platformFeeCents: number;
    professionalNetCents: number;
    completedSessions: number;
    averageNetPerSessionCents: number;
    lifetimeProfessionalNetCents: number;
    lifetimeCompletedSessions: number;
    /** Neto en el rango (alias de professionalNetCents) */
    totalCents: number;
    currentPeriodCents: number;
    totalSessions: number;
    currentPeriodSessions: number;
    sessionFeeCents: number;
  };
  range: {
    from: string | null;
    to: string;
    allTime: boolean;
  };
  movements: Array<{
    bookingId: string;
    patientName: string;
    startsAt: string;
    grossCents: number;
    platformFeeCents: number;
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
  counterpartPhotoUrl?: string | null;
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
  firstName: string;
  lastName: string;
  email: string;
  visible: boolean;
  professionalTitle: string | null;
  specialization: string | null;
  experienceBand: string | null;
  practiceBand: string | null;
  gender: string | null;
  birthCountry: string | null;
  residencyCountry?: string | null;
  market?: Market;
  focusPrimary: string | null;
  /** Áreas de atención (API); preferido para edición frente a `focusPrimary` solo texto. */
  focusAreas?: string[];
  languages: string[];
  bio: string | null;
  shortDescription: string | null;
  therapeuticApproach: string | null;
  yearsExperience: number | null;
  sessionPriceArs: number | null;
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
