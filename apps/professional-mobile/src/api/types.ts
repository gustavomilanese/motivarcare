export type AppRole = "PATIENT" | "PROFESSIONAL" | "ADMIN";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  role: AppRole;
  emailVerified: boolean;
  professionalProfileId: string | null;
  registrationApproval?: "PENDING" | "APPROVED" | "REJECTED";
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
  emailVerificationRequired: boolean;
};

export type AuthMeResponse = {
  user: AuthUser;
  emailVerificationRequired: boolean;
};

export type DashboardSession = {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientAvatarUrl?: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  joinUrl?: string | null;
  canUncomplete?: boolean;
  submittedForPayout?: boolean;
  payoutPaid?: boolean;
  netDisplayCents?: number | null;
};

export type DashboardResponse = {
  kpis: {
    activePatients: number;
    sessionsCompleted: number;
    sessionsScheduled: number;
  };
  display?: {
    currency: string;
    executedGrossCents: number;
    pendingToCollectCents: number;
    readyToSendCents?: number;
  };
  upcomingSessions: DashboardSession[];
  pendingExecutionSessions?: DashboardSession[];
};

export type AvailabilitySlot = {
  id: string;
  startsAt: string;
  endsAt: string;
  isBlocked: boolean;
  source: string;
};

export type PatientListItem = {
  patientId: string;
  patientName: string;
  patientEmail: string;
  avatarUrl?: string | null;
  totalSessions: number;
  completedSessions: number;
  status: "active" | "pause" | "cancelled" | "trial";
};

export type EarningsMovement = {
  bookingId: string;
  patientId?: string;
  patientName: string;
  startsAt: string;
  endsAt?: string;
  isTrial?: boolean;
  pricingSource?: "package" | "list";
  packageCredits?: number | null;
  packageSessionNumber?: number | null;
  packageDiscountPercent?: number | null;
  grossCents: number;
  platformFeeCents: number;
  amountCents: number;
  submittedForPayout?: boolean;
  payoutPaid?: boolean;
  currency: string;
  status: string;
};

export type EarningsResponse = {
  display?: {
    currency: string;
    summary: {
      grossCents: number;
      professionalNetCents: number;
      pendingToCollectCents?: number;
    };
  };
  movements: EarningsMovement[];
  movementsPagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type ThreadSummary = {
  id: string;
  counterpartName: string;
  counterpartUserId: string;
  counterpartPhotoUrl?: string | null;
  lastMessage: { id: string; body: string; createdAt: string; senderUserId: string } | null;
  unreadCount: number;
  createdAt: string;
};

export type ThreadMessage = {
  id: string;
  body: string;
  createdAt: string;
  senderUserId: string;
  senderName: string;
  senderRole: AppRole;
};

export type PatientDetailResponse = {
  patient: {
    patientId: string;
    patientName: string;
    patientEmail: string;
    avatarUrl?: string | null;
    totalSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    daysSinceLastSession: number;
    status: PatientListItem["status"];
    firstSessionAt: string | null;
    lastCompletedSessionAt: string | null;
    lifetimeTotals?: Array<{ currency: string; netCents: number; sessions: number }>;
  };
  paymentMovements: Array<{
    bookingId: string;
    patientName: string;
    startsAt: string;
    completedAt: string | null;
    grossCents: number;
    platformFeeCents: number;
    amountCents: number;
    status: string;
    submittedForPayout?: boolean;
    payoutPaid?: boolean;
    currency: string;
  }>;
};

export type ProfessionalProfile = {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  professionalTitle: string | null;
  specialization: string | null;
  bio: string | null;
  photoUrl: string | null;
  sessionPriceUsd: number | null;
  cancellationHours: number;
  timezone: string;
};

export type TreatmentReportListItem = {
  patientId: string;
  patientName: string;
  patientAvatarUrl: string | null;
  messageCount: number;
  lastUserMessageAt: string | null;
  safetyFlagged: boolean;
  lastSafetyEventAt: string | null;
  summaryAvailableAt: string | null;
};

export type TreatmentReportSummarySection = {
  moodSummary: string;
  topics: string[];
  signalsToWatch: string[];
  narrative: string;
};

export type TreatmentReportDetail = {
  patientId: string;
  chatId: string;
  summary: {
    generatedAt: string;
    model: string;
    messageCountAtGeneration: number;
    weekly: TreatmentReportSummarySection | null;
    overall: TreatmentReportSummarySection;
  };
  safetyFlagged: boolean;
  lastSafetyEventAt: string | null;
  lastUserMessageAt: string | null;
  messageCount: number;
};

export type CalendarStatus = {
  connected: boolean;
  connection: { providerEmail: string | null } | null;
};
