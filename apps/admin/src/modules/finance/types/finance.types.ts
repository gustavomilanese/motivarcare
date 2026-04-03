export interface FinanceRules {
  platformCommissionPercent: number;
  trialPlatformPercent: number;
  defaultSessionPriceCents: number;
  sessionPriceMinUsd: number;
  sessionPriceMaxUsd: number;
}

export interface FinanceOverviewResponse {
  page: number;
  pageSize: number;
  total: number;
  nextCursor?: string | null;
  totals: {
    sessions: number;
    grossCents: number;
    platformFeeCents: number;
    professionalNetCents: number;
  };
  /** REQUESTED/CONFIRMED con startsAt entre dateFrom y dateTo (mismo rango que filtros); estimación aprox. */
  plannedInRange?: {
    sessions: number;
    grossCents: number;
    platformFeeCents: number;
    professionalNetCents: number;
  } | null;
  records: Array<{
    id: string;
    bookingId: string;
    bookingStatus: "REQUESTED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
    bookingStartsAt: string;
    bookingCompletedAt: string | null;
    isTrial: boolean;
    currency: string;
    sessionPriceCents: number;
    platformCommissionPercent: number;
    platformFeeCents: number;
    professionalNetCents: number;
    patient: { id: string; fullName: string; email: string };
    professional: { id: string; fullName: string; email: string };
    package: { id: string; name: string; credits: number; priceCents: number; currency: string } | null;
  }>;
  byProfessional: Array<{
    professionalId: string;
    professionalName: string;
    professionalEmail: string;
    sessions: number;
    grossCents: number;
    platformFeeCents: number;
    professionalNetCents: number;
  }>;
  byPatient: Array<{
    patientId: string;
    patientName: string;
    patientEmail: string;
    sessions: number;
    grossCents: number;
    platformFeeCents: number;
    professionalNetCents: number;
  }>;
  byPackage: Array<{
    packageId: string | null;
    packageName: string;
    sessions: number;
    grossCents: number;
    platformFeeCents: number;
    professionalNetCents: number;
  }>;
  /** Opciones de filtro amplias (sin profesional/paciente/búsqueda) para que los combos no queden vacíos. */
  filterPicklist?: {
    professionals: Array<{ professionalId: string; professionalName: string; professionalEmail: string }>;
    patients: Array<{ patientId: string; patientName: string; patientEmail: string }>;
    packages: Array<{ packageId: string | null; packageName: string }>;
  };
}

export interface FinancePayoutRunSummary {
  id: string;
  idempotencyKey?: string | null;
  periodStart: string;
  periodEnd: string;
  status: "DRAFT" | "CLOSED";
  totalGrossCents: number;
  totalFeeCents: number;
  totalNetCents: number;
  notes: string | null;
  createdAt: string;
  closedAt: string | null;
  payoutLinesCount: number;
}

export interface FinancePayoutRunsResponse {
  page: number;
  pageSize: number;
  total: number;
  nextCursor?: string | null;
  runs: FinancePayoutRunSummary[];
}

export interface FinancePayoutRunDetailResponse {
  run: {
    id: string;
    idempotencyKey?: string | null;
    periodStart: string;
    periodEnd: string;
    status: "DRAFT" | "CLOSED";
    totalGrossCents: number;
    totalFeeCents: number;
    totalNetCents: number;
    notes: string | null;
    createdAt: string;
    closedAt: string | null;
    payoutLines: Array<{
      id: string;
      professionalId: string;
      professionalName: string;
      professionalEmail: string;
      sessionsCount: number;
      grossCents: number;
      platformFeeCents: number;
      professionalNetCents: number;
      status: "PENDING" | "PAID";
      paidAt: string | null;
      payoutReference: string | null;
      sessionRecords: Array<{
        id: string;
        bookingId: string;
        bookingStartsAt: string;
        bookingCompletedAt: string | null;
        isTrial: boolean;
        patientId: string;
        patientName: string;
        patientEmail: string;
        packageId: string | null;
        packageName: string | null;
        sessionPriceCents: number;
        platformFeeCents: number;
        professionalNetCents: number;
      }>;
    }>;
  };
}

export interface FinanceFilters {
  dateFrom: string;
  dateTo: string;
  professionalId: string;
  patientId: string;
  packageId: string;
  isTrial: string;
  bookingStatus: string;
  search: string;
}

export interface CreatePayoutDraft {
  periodStart: string;
  periodEnd: string;
  notes: string;
}

export type StripeEventStatus = "PENDING" | "PROCESSING" | "PROCESSED" | "DEAD_LETTER" | "UNKNOWN";

export interface FinanceStripeEvent {
  id: string;
  dedupeKey: string | null;
  eventType: string;
  aggregateType: string;
  aggregateId: string | null;
  status: StripeEventStatus;
  attempts: number;
  availableAt: string;
  processedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceStripeOpsSummary {
  pending: number;
  processing: number;
  processed: number;
  deadLetter: number;
  total: number;
  oldestPendingCreatedAt: string | null;
}

export interface FinanceStripeOpsResponse {
  page: number;
  pageSize: number;
  total: number;
  summary: FinanceStripeOpsSummary;
  events: FinanceStripeEvent[];
}

export interface FinanceStripeFilters {
  status: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}

export const EMPTY_FINANCE_FILTERS: FinanceFilters = {
  dateFrom: "",
  dateTo: "",
  professionalId: "",
  patientId: "",
  packageId: "",
  isTrial: "",
  bookingStatus: "",
  search: ""
};

export const EMPTY_CREATE_PAYOUT_DRAFT: CreatePayoutDraft = {
  periodStart: "",
  periodEnd: "",
  notes: ""
};

export const EMPTY_STRIPE_FILTERS: FinanceStripeFilters = {
  status: "",
  dateFrom: "",
  dateTo: "",
  search: ""
};
