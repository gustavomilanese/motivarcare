export type AppRole = "PATIENT" | "PROFESSIONAL" | "ADMIN";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  /** Foto de perfil (https). Null hasta que el usuario suba una; seed demo trae URL de prueba. */
  avatarUrl: string | null;
  role: AppRole;
  emailVerified: boolean;
  patientProfileId: string | null;
  professionalProfileId: string | null;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
  emailVerificationRequired: boolean;
};

export type RegisterResponse = {
  token: string;
  user: AuthUser;
  verificationEmailSent: boolean;
  emailVerificationRequired: boolean;
};

export type AuthMeResponse = {
  user: AuthUser;
  emailVerificationRequired: boolean;
};

export type PatientProfilePayload = {
  id?: string;
  /** Misma que `AuthUser.avatarUrl`; viene del perfil para que RN la tenga tras cargar `/profiles/me`. */
  avatarUrl?: string | null;
  timezone?: string;
  lastSeenTimezone?: string | null;
  status?: string;
  intakeRiskLevel?: string | null;
  intakeTriageDecision?: string | null;
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
  }>;
  activeProfessional?: {
    id: string;
    userId: string;
    fullName: string;
    email: string;
    /** Foto pública del profesional (misma fuente que matching / sesiones). */
    photoUrl?: string | null;
  } | null;
};

export type ProfileMeResponse = {
  role: AppRole;
  profile: PatientProfilePayload | null;
};

export type BookingItem = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: "confirmed" | "cancelled" | "requested" | "completed" | "no_show";
  bookingMode?: "credit" | "trial";
  professionalId?: string;
  counterpartName?: string;
  counterpartEmail?: string;
  counterpartPhotoUrl?: string | null;
  joinUrl?: string | null;
  patientTimezoneAtBooking?: string;
  professionalTimezoneAtBooking?: string;
  createdAt: string;
};

export type BookingsMineResponse = {
  role: AppRole;
  bookings: BookingItem[];
};

export type SessionPackage = {
  id: string;
  professionalId: string | null;
  professionalName: string | null;
  stripePriceId: string;
  name: string;
  credits: number;
  priceCents: number;
  discountPercent: number;
  marketingLabel?: string | null;
  currency: string;
  active: boolean;
  createdAt: string;
};

export type SessionPackagesResponse = {
  featuredPackageId: string | null;
  sessionPackages: SessionPackage[];
};

export type PurchasePackageResponse = {
  purchase: {
    id: string;
    packageId: string;
    packageName: string;
    packagePriceCents: number;
    packageDiscountPercent: number;
    totalCredits: number;
    remainingCredits: number;
    purchasedAt: string;
  };
};

export type ChatThread = {
  id: string;
  patientId: string;
  professionalId: string;
  counterpartName: string;
  counterpartUserId: string;
  /** Foto del profesional (vista paciente); viene del API para no depender solo de matching. */
  counterpartPhotoUrl?: string | null;
  unreadCount: number;
  createdAt: string;
  lastMessage: {
    id: string;
    body: string;
    createdAt: string;
    senderUserId: string;
  } | null;
};

export type ChatThreadsResponse = {
  threads: ChatThread[];
  availableProfessionalIds?: string[];
};

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  senderUserId: string;
  senderName: string;
  senderRole: AppRole;
};

export type ChatMessagesResponse = {
  threadId: string;
  messages: ChatMessage[];
};

export type SendChatMessageResponse = {
  message: {
    id: string;
    threadId: string;
    body: string;
    createdAt: string;
    senderUserId: string;
    senderName: string;
    senderRole: AppRole;
  };
};

export type MatchingSlot = {
  id: string;
  startsAt: string;
  endsAt: string;
};

export type MatchingProfessional = {
  id: string;
  userId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  title: string;
  specialization: string | null;
  focusPrimary: string | null;
  bio: string | null;
  therapeuticApproach: string | null;
  languages: string[];
  yearsExperience: number | null;
  sessionPriceUsd: number | null;
  photoUrl: string | null;
  ratingAverage: number | null;
  reviewsCount: number;
  matchScore: number;
  matchReasons: string[];
  matchedTopics: string[];
  suggestedSlots: MatchingSlot[];
  slots: MatchingSlot[];
  sessionDurationMinutes: number;
};

export type MatchingResponse = {
  professionals: MatchingProfessional[];
};

export type GoogleCalendarStatusResponse = {
  connected: boolean;
  connection: {
    provider: string;
    providerEmail: string | null;
    calendarId: string | null;
    connectedAt: string | null;
    updatedAt: string;
  } | null;
};

export type CreateBookingResponse = {
  booking: {
    id: string;
    startsAt: string;
    endsAt: string;
    status: string;
    joinUrlPatient: string | null;
    threadId: string;
    professionalName?: string;
  };
};
