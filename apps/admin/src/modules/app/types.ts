export type Role = "PATIENT" | "PROFESSIONAL" | "ADMIN";
export type PatientStatus = "active" | "pause" | "cancelled" | "trial";
export type RiskTriageDecision = "pending" | "approved" | "cancelled";
export type RoleFilter = Role | "ALL";
export type PortalPath =
  | "/"
  | "/patients"
  | "/professionals"
  | "/sessions"
  | "/finances"
  | "/calendar"
  | "/library"
  | "/imports"
  | "/settings"
  | "/ai";

export interface AuthApiUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  patientProfileId: string | null;
  professionalProfileId: string | null;
}

export interface AuthApiResponse {
  token: string;
  user: AuthApiUser;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: "ADMIN";
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  /** Foto de perfil a nivel cuenta (paciente / cualquier rol con User.avatarUrl). */
  avatarUrl?: string | null;
  role: Role;
  isActive: boolean;
  isTestUser: boolean;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  patientProfile: {
    id: string;
    timezone: string;
    status: string;
  } | null;
  professionalProfile: {
    id: string;
    visible: boolean;
    cancellationHours: number;
    bio: string | null;
    therapeuticApproach: string | null;
    yearsExperience: number | null;
    photoUrl: string | null;
    videoUrl: string | null;
  } | null;
  adminProfile: {
    id: string;
  } | null;
}

export interface UsersResponse {
  users: AdminUser[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasPrev: boolean;
    hasNext: boolean;
  };
}

export interface KpisResponse {
  kpis: {
    activePatients: number;
    activeProfessionals: number;
    scheduledSessions: number;
    /** Comisión plataforma (mes UTC), sesiones completadas */
    monthlyRevenueCents: number;
    /** Ingreso bruto pacientes: paquetes comprados en el mes (snapshot) */
    packagePurchasesMonthCents: number;
    packagePurchasesMonthCount: number;
    /** Comisión plataforma imputada al mes según cada compra (precio × % snapshot) */
    packagePlatformFeeFromPurchasesMonthCents?: number;
    /** Neto profesional asignado por compras del mes (bruto paquete − comisión) */
    packageProfessionalNetFromPurchasesMonthCents?: number;
    /** Sesiones de prueba con inicio en el mes (confirmadas o completadas sin fila de finanzas aún): bruto = precio sesión del pro; % comisión = trialPlatformPercent (reglas). */
    trialSessionsMonthCount?: number;
    trialGrossMonthCents?: number;
    trialPlatformFeeMonthCents?: number;
    trialProfessionalNetMonthCents?: number;
    trialPlatformPercentApplied?: number;
    platformFeeMonthCents: number;
    professionalNetMonthCents: number;
    grossSessionsMonthCents: number;
    completedSessionsMonthCount: number;
    platformFeeAllTimeCents: number;
    /** Neto profesional acumulado sin asignar a un payout run */
    professionalNetUnpaidCents: number;
    unpaidSessionRecordsCount: number;
    /** Comisión plataforma devengada en filas sin línea de payout (mismas filas que neto pendiente) */
    platformFeeUnpaidCents?: number;
    /** Estimado mes: sesiones REQUESTED/CONFIRMED con inicio en el mes UTC */
    plannedMonetizableSessionsMonthCount?: number;
    plannedGrossMonthCents?: number;
    plannedPlatformFeeMonthCents?: number;
    plannedProfessionalNetMonthCents?: number;
  };
  period?: {
    /** YYYY-MM (calendario UTC) */
    month?: string;
    monthStart: string;
    monthEnd: string;
  };
}

export interface LandingSettingsResponse {
  settings: {
    patientHeroImageUrl: string | null;
    patientDesktopImageUrl?: string | null;
    patientMobileImageUrl?: string | null;
    professionalDesktopImageUrl?: string | null;
    professionalMobileImageUrl?: string | null;
  };
  updatedAt: string | null;
}

export interface WebLandingSettings {
  patientHeroImageUrl: string | null;
  patientDesktopImageUrl: string | null;
  patientMobileImageUrl: string | null;
  professionalDesktopImageUrl: string | null;
  professionalMobileImageUrl: string | null;
}

export interface AdminReview {
  id: string;
  name: string;
  role: string;
  reviewDate?: string;
  relativeDate: string;
  text: string;
  rating: number;
  avatar: string;
  accent: string;
}

export interface AdminBlogPost {
  id: string;
  title: string;
  subtitle?: string;
  slug: string;
  excerpt: string;
  category: string;
  coverImage: string;
  authorName: string;
  authorRole: string;
  authorAvatar: string;
  publishedAt: string;
  readTime: number;
  likes: number;
  tags: string[];
  status: "draft" | "published";
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  body: string;
}

export interface WebContentResponse {
  settings: WebLandingSettings;
  reviews: AdminReview[];
  blogPosts: AdminBlogPost[];
  updatedAt: {
    settings: string | null;
    reviews: string | null;
    blogPosts: string | null;
  };
}

export interface AdminSessionPackage {
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
  purchasesCount: number;
  landingPublished: boolean;
  patientPublished: boolean;
}

export interface SessionPackagesResponse {
  sessionPackages: AdminSessionPackage[];
  visibility: {
    landing: string[];
    patient: string[];
    featuredLanding: string | null;
    featuredPatient: string | null;
  };
}

export interface AdminPatientOps {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  /** Foto de perfil del usuario (demo: URLs Unsplash en seed). */
  avatarUrl?: string | null;
  timezone: string;
  status: string;
  intakeRiskLevel?: "low" | "medium" | "high" | null;
  intakeCompletedAt?: string | null;
  intakeAnswers?: Record<string, string> | null;
  riskTriageDecision?: RiskTriageDecision | null;
  riskBlocked?: boolean;
  activeProfessionalId?: string | null;
  activeProfessionalName?: string | null;
  assignmentStatus?: "assigned" | "pending";
  latestPurchase: {
    id: string;
    packageId?: string;
    packageName: string;
    totalCredits: number;
    remainingCredits: number;
    purchasedAt: string;
  } | null;
  bookingsCount: number;
  creditBalance: number;
}

export interface PatientsResponse {
  patients: AdminPatientOps[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasPrev: boolean;
    hasNext: boolean;
  };
}

export interface PatientManagementResponse {
  patient: AdminPatientOps & {
    confirmedBookings: AdminBookingOps[];
  };
}

export interface AdminPatientRiskTriageItem {
  patientId: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  patientStatus: string;
  intakeRiskLevel: "medium" | "high";
  intakeCompletedAt: string | null;
  triageDecision: RiskTriageDecision;
  triageUpdatedAt: string | null;
  triageNote: string | null;
  riskBlocked: boolean;
}

export interface PatientRiskTriageResponse {
  items: AdminPatientRiskTriageItem[];
  total: number;
  pending: number;
}

export interface AdminProfessionalOps {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  visible: boolean;
  registrationApproval: "PENDING" | "APPROVED";
  cancellationHours: number;
  bio: string | null;
  therapeuticApproach: string | null;
  yearsExperience: number | null;
  birthCountry: string | null;
  sessionPriceUsd: number | null;
  ratingAverage: number | null;
  reviewsCount: number;
  sessionDurationMinutes: number | null;
  activePatientsCount: number | null;
  sessionsCount: number | null;
  completedSessionsCount: number | null;
  photoUrl: string | null;
  videoUrl: string | null;
  bookingsCount: number;
  slots: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    isBlocked: boolean;
    source: string;
  }>;
}

export interface ProfessionalsResponse {
  professionals: AdminProfessionalOps[];
}

export interface AdminBookingOps {
  id: string;
  patientId: string;
  patientName: string;
  professionalId: string;
  professionalName: string;
  startsAt: string;
  endsAt: string;
  status: "REQUESTED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  consumedCredits: number;
  consumedPurchaseId?: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
}

export interface AdminBookingsResponse {
  bookings: AdminBookingOps[];
}

export interface CreateUserFormState {
  role: Role;
  isTestUser: boolean;
  fullName: string;
  email: string;
  password: string;
  timezone: string;
  patientStatus: PatientStatus;
  professionalVisible: boolean;
  professionalCancellationHours: string;
  professionalBio: string;
  professionalTherapeuticApproach: string;
  professionalYearsExperience: string;
  professionalPhotoUrl: string;
  professionalVideoUrl: string;
}

export interface EditUserDraft {
  role: Role;
  isTestUser: boolean;
  fullName: string;
  password: string;
  /** Foto de perfil del usuario (paciente): URL o data URL. */
  patientAvatarUrl: string;
  patientStatus: PatientStatus;
  patientTimezone: string;
  professionalVisible: boolean;
  professionalCancellationHours: string;
  professionalBio: string;
  professionalTherapeuticApproach: string;
  professionalYearsExperience: string;
  professionalPhotoUrl: string;
  professionalVideoUrl: string;
}
