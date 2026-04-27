import { Router, type Response } from "express";
import { ProfessionalRegistrationApproval, type Market } from "@prisma/client";
import { z } from "zod";
import { hashPassword, requireAuth, requireRole, type AuthenticatedRequest } from "../../lib/auth.js";
import { prismaErrorUserMessage } from "../../lib/prismaUserError.js";
import { ADMIN_USER_DELETE_TX_OPTIONS, hardDeleteUserInTransaction } from "../../lib/hardDeleteUserInTransaction.js";
import { prisma } from "../../lib/prisma.js";
import {
  validateProfessionalSessionListArs,
  validateProfessionalSessionListUsd
} from "../../lib/professionalSessionListPrice.js";
import { marketFromResidencyCountry, userNamePartsFromFullNameString } from "@therapy/types";
import { DEFAULT_BLOG_POSTS } from "../web-content/blogPosts.defaults.js";
import {
  DEFAULT_RELAXATION_PLAYLISTS,
  WEB_RELAXATION_PLAYLISTS_KEY,
  relaxationPlaylistsCollectionSchema,
  relaxationPlaylistsPutSchema
} from "../web-content/relaxationPlaylists.defaults.js";
import { financeRouter } from "../finance/finance.routes.js";
import { getFinanceRules, upsertFinanceRecordForBooking } from "../finance/finance.service.js";
import {
  parseSessionPackagesVisibility,
  sessionPackagesVisibilityPutSchema,
  visibilityPayloadForStorage
} from "../../lib/sessionPackageVisibility.js";

const deleteAdminUserBodySchema = z.object({
  purgeHistoricalData: z.boolean().optional()
});

function purgeHistoricalDataFromRequest(req: Pick<AuthenticatedRequest, "body" | "query">): boolean {
  const bodyParsed = deleteAdminUserBodySchema.safeParse(req.body ?? {});
  if (bodyParsed.success && bodyParsed.data.purgeHistoricalData === true) {
    return true;
  }
  const raw = req.query.purgeHistoricalData;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return s === "true" || s === "1";
}

const ADMIN_USER_SOFT_DELETE_TX_OPTIONS = { maxWait: 10_000, timeout: 30_000 } as const;

const kpisQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
  professionalId: z.string().min(1).optional(),
  patientId: z.string().min(1).optional()
});

const appRoleSchema = z.enum(["PATIENT", "PROFESSIONAL", "ADMIN"]);
const patientStatusSchema = z.enum(["active", "pause", "cancelled", "trial"]);

const imageSourceSchema = z
  .string()
  .trim()
  .max(20_000_000)
  .refine((value) => value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:image/"), {
    message: "Invalid image source"
  });

const listUsersQuerySchema = z.object({
  role: appRoleSchema.optional(),
  search: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional()
});

const patientResidencyCountryIso2Schema = z
  .string()
  .trim()
  .length(2)
  .regex(/^[A-Za-z]{2}$/)
  .transform((value) => value.toUpperCase());

const createUserSchema = z
  .object({
    email: z.string().email(),
    fullName: z.string().min(2).max(120),
    password: z.string().min(8).max(120),
    role: appRoleSchema,
    isTestUser: z.boolean().optional(),
    timezone: z.string().min(2).max(80).optional(),
    patientStatus: patientStatusSchema.optional(),
    /** Obligatorio si role es PACIENTE: define mercado vía `marketFromResidencyCountry`. */
    patientResidencyCountry: patientResidencyCountryIso2Schema.optional(),
    professionalVisible: z.boolean().optional(),
    professionalCancellationHours: z.number().int().min(0).max(168).optional(),
    professionalBio: z.string().max(2000).optional(),
    professionalTherapeuticApproach: z.string().max(500).optional(),
    professionalYearsExperience: z.number().int().min(0).max(80).optional(),
    professionalPhotoUrl: imageSourceSchema.nullable().optional(),
    professionalVideoUrl: z.string().url().nullable().optional()
  })
  .superRefine((data, ctx) => {
    if (data.role === "PATIENT" && !data.patientResidencyCountry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "patientResidencyCountry is required when creating a patient (ISO 3166-1 alpha-2)",
        path: ["patientResidencyCountry"]
      });
    }
  });

const updateUserSchema = z
  .object({
    fullName: z.string().min(2).max(120).optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).max(120).optional(),
    isTestUser: z.boolean().optional(),
    avatarUrl: imageSourceSchema.nullable().optional(),
    patientStatus: patientStatusSchema.optional(),
    patientTimezone: z.string().min(2).max(80).optional(),
    professionalVisible: z.boolean().optional(),
    professionalCancellationHours: z.number().int().min(0).max(168).optional(),
    professionalBio: z.string().max(2000).optional(),
    professionalTherapeuticApproach: z.string().max(500).optional(),
    professionalYearsExperience: z.number().int().min(0).max(80).optional(),
    professionalPhotoUrl: imageSourceSchema.nullable().optional(),
    professionalVideoUrl: z.string().url().nullable().optional(),
    professionalBirthCountry: z.string().trim().max(120).nullable().optional(),
    professionalSessionPriceUsd: z.number().int().min(0).max(10_000_000).nullable().optional(),
    professionalTitle: z.string().trim().max(120).nullable().optional(),
    professionalSpecialization: z.string().trim().max(120).nullable().optional(),
    professionalFocusPrimary: z.string().trim().max(500).nullable().optional(),
    professionalRatingAverage: z.number().min(0).max(5).nullable().optional(),
    professionalReviewsCount: z.number().int().min(0).max(100000).nullable().optional(),
    professionalSessionDurationMinutes: z.number().int().min(15).max(120).nullable().optional(),
    professionalActivePatientsCount: z.number().int().min(0).max(100000).nullable().optional(),
    professionalSessionsCount: z.number().int().min(0).max(1000000).nullable().optional(),
    professionalCompletedSessionsCount: z.number().int().min(0).max(1000000).nullable().optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required"
  });

const LANDING_SETTINGS_KEY = "landing-settings";
const WEB_REVIEWS_KEY = "landing-web-reviews";
const WEB_BLOG_POSTS_KEY = "landing-web-blog-posts";
const WEB_EXERCISES_KEY = "patient-web-exercises";
const PATIENT_ACTIVE_ASSIGNMENTS_KEY = "patient-active-assignments";
const PATIENT_INTAKE_TRIAGE_KEY = "patient-intake-triage";
const PROFESSIONAL_DISPLAY_OVERRIDES_KEY = "professional-display-overrides";
const SESSION_PACKAGES_VISIBILITY_KEY = "session-packages-visibility";
const blogStatusSchema = z.enum(["draft", "published"]);
const exerciseStatusSchema = z.enum(["draft", "published"]);
const exerciseDifficultySchema = z.enum(["principiante", "intermedio", "avanzado"]);
const exerciseCategorySchema = z.enum([
  "respiracion",
  "postura",
  "grounding",
  "movimiento",
  "relajacion",
  "mindfulness"
]);

const landingSettingsSchema = z.object({
  patientHeroImageUrl: imageSourceSchema.nullable(),
  patientDesktopImageUrl: imageSourceSchema.nullable().optional(),
  patientMobileImageUrl: imageSourceSchema.nullable().optional(),
  professionalDesktopImageUrl: imageSourceSchema.nullable().optional(),
  professionalMobileImageUrl: imageSourceSchema.nullable().optional()
});

const reviewSchema = z.object({
  id: z.string().min(2).max(120),
  name: z.string().min(2).max(120),
  role: z.string().min(2).max(80),
  reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  relativeDate: z.string().min(2).max(80),
  text: z.string().min(5).max(2000),
  rating: z.number().int().min(1).max(5),
  avatar: imageSourceSchema,
  accent: z.string().trim().min(4).max(32).optional()
});

const reviewCreateSchema = reviewSchema.omit({ id: true });
const reviewUpdateSchema = reviewCreateSchema.partial().refine((payload) => Object.keys(payload).length > 0, {
  message: "At least one field is required"
});
const reviewsCollectionSchema = z.array(reviewSchema);

const blogPostSchema = z.object({
  id: z.string().min(2).max(120),
  title: z.string().min(5).max(200),
  subtitle: z.string().max(240).optional(),
  slug: z.string().min(3).max(160),
  excerpt: z.string().min(10).max(600),
  category: z.string().min(2).max(80),
  coverImage: imageSourceSchema,
  authorName: z.string().min(2).max(120),
  authorRole: z.string().min(2).max(120),
  authorAvatar: imageSourceSchema,
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  readTime: z.number().int().min(1).max(120),
  likes: z.number().int().min(0).max(1_000_000),
  tags: z.array(z.string().min(1).max(48)).max(24),
  status: blogStatusSchema,
  featured: z.boolean(),
  seoTitle: z.string().min(10).max(220),
  seoDescription: z.string().min(20).max(320),
  body: z.string().min(80).max(100_000),
  /** Audiencias. Si no se manda, se asume visible en ambos canales (legacy compat). */
  showOnPatientPortal: z.boolean().optional().default(true),
  showOnLanding: z.boolean().optional().default(true)
});

const blogPostCreateSchema = blogPostSchema.omit({ id: true });
const blogPostUpdateSchema = blogPostCreateSchema.partial().refine((payload) => Object.keys(payload).length > 0, {
  message: "At least one field is required"
});
const blogPostsCollectionSchema = z.array(blogPostSchema);

const exerciseSchema = z.object({
  id: z.string().min(2).max(120),
  slug: z.string().min(2).max(160),
  title: z.string().min(3).max(160),
  summary: z.string().min(10).max(500),
  description: z.string().min(20).max(2_000),
  category: exerciseCategorySchema,
  durationMinutes: z.number().int().min(1).max(120),
  difficulty: exerciseDifficultySchema,
  emoji: z.string().min(1).max(8),
  steps: z.array(z.string().min(2).max(600)).min(1).max(20),
  tips: z.array(z.string().min(2).max(400)).max(12),
  benefits: z.array(z.string().min(2).max(200)).max(10),
  contraindications: z.string().max(800),
  tags: z.array(z.string().min(1).max(40)).max(12),
  status: exerciseStatusSchema,
  featured: z.boolean(),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sortOrder: z.number().int().min(0).max(100_000)
});

const exerciseCreateSchema = exerciseSchema.omit({ id: true });
const exerciseUpdateSchema = exerciseCreateSchema.partial().refine((payload) => Object.keys(payload).length > 0, {
  message: "At least one field is required"
});
const exercisesCollectionSchema = z.array(exerciseSchema);
const bookingStatusSchema = z.enum(["REQUESTED", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]);

const listPackagesQuerySchema = z.object({
  active: z.enum(["true", "false"]).optional(),
  professionalId: z.string().min(1).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  market: z.enum(["AR", "US", "BR", "ES"]).optional()
});

const createPackageSchema = z.object({
  professionalId: z.string().min(1).nullable().optional(),
  stripePriceId: z.string().trim().min(2).max(120).optional(),
  market: z.enum(["AR", "US", "BR", "ES"]).default("AR"),
  paymentProvider: z.enum(["STRIPE", "MERCADOPAGO"]).default("STRIPE"),
  name: z.string().trim().min(2).max(120),
  credits: z.number().int().min(1).max(200),
  priceCents: z.number().int().min(1).max(100000000),
  discountPercent: z.number().int().min(0).max(100).default(0),
  currency: z.string().trim().min(2).max(8).default("usd"),
  active: z.boolean().default(true)
});

const updatePackageSchema = z
  .object({
    professionalId: z.string().min(1).nullable().optional(),
    stripePriceId: z.string().trim().min(2).max(120).optional(),
    market: z.enum(["AR", "US", "BR", "ES"]).optional(),
    paymentProvider: z.enum(["STRIPE", "MERCADOPAGO"]).optional(),
    name: z.string().trim().min(2).max(120).optional(),
    credits: z.number().int().min(1).max(200).optional(),
    priceCents: z.number().int().min(1).max(100000000).optional(),
    discountPercent: z.number().int().min(0).max(100).optional(),
    currency: z.string().trim().min(2).max(8).optional(),
    active: z.boolean().optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required"
  });

const listBookingsQuerySchema = z.object({
  status: bookingStatusSchema.optional(),
  patientId: z.string().min(1).optional(),
  professionalId: z.string().min(1).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

/** Frase que el admin debe enviar en `adminTrialCancelConfirmation` para cancelar una sesión de prueba. Sincronizar con `ADMIN_TRIAL_BOOKING_CANCEL_PHRASE` en apps/admin. */
const ADMIN_TRIAL_BOOKING_CANCEL_PHRASE = "eliminar sesión de prueba";

const updateBookingSchema = z
  .object({
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    status: bookingStatusSchema.optional(),
    professionalId: z.string().min(1).optional(),
    patientId: z.string().min(1).optional(),
    cancellationReason: z.string().trim().max(400).nullable().optional(),
    consumedCredits: z.number().int().min(0).max(100).optional(),
    adminTrialCancelConfirmation: z.string().optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required"
  });

const listProfessionalsQuerySchema = z.object({
  visible: z.enum(["true", "false"]).optional(),
  registrationApproval: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  search: z.string().trim().min(1).max(120).optional()
});

const updateProfessionalSchema = z
  .object({
    visible: z.boolean().optional(),
    registrationApproval: z.nativeEnum(ProfessionalRegistrationApproval).optional(),
    professionalTitle: z.string().trim().max(120).nullable().optional(),
    specialization: z.string().trim().max(120).nullable().optional(),
    focusPrimary: z.string().trim().max(500).nullable().optional(),
    cancellationHours: z.number().int().min(0).max(168).optional(),
    bio: z.string().trim().max(2000).nullable().optional(),
    therapeuticApproach: z.string().trim().max(500).nullable().optional(),
    yearsExperience: z.number().int().min(0).max(80).nullable().optional(),
    birthCountry: z.string().trim().max(120).nullable().optional(),
    residencyCountry: z
      .string()
      .trim()
      .length(2)
      .regex(/^[A-Za-z]{2}$/)
      .transform((value) => value.toUpperCase())
      .nullable()
      .optional(),
    sessionPriceArs: z.number().int().min(0).max(10_000_000).nullable().optional(),
    sessionPriceUsd: z.number().int().min(0).max(10_000_000).nullable().optional(),
    ratingAverage: z.number().min(0).max(5).nullable().optional(),
    reviewsCount: z.number().int().min(0).max(100000).nullable().optional(),
    sessionDurationMinutes: z.number().int().min(15).max(120).nullable().optional(),
    activePatientsCount: z.number().int().min(0).max(100000).nullable().optional(),
    sessionsCount: z.number().int().min(0).max(1000000).nullable().optional(),
    completedSessionsCount: z.number().int().min(0).max(1000000).nullable().optional(),
    photoUrl: imageSourceSchema.nullable().optional(),
    videoUrl: z.string().url().nullable().optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required"
  });

const createAvailabilitySlotSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  isBlocked: z.boolean().optional(),
  source: z.string().trim().min(2).max(80).optional()
});

const listPatientsQuerySchema = z.object({
  status: patientStatusSchema.optional(),
  search: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional()
});
const intakeRiskLevelSchema = z.enum(["low", "medium", "high"]);
const intakeTriageDecisionSchema = z.enum(["pending", "approved", "cancelled"]);
const intakeTriageRecordSchema = z.object({
  decision: intakeTriageDecisionSchema,
  updatedAt: z.string().datetime(),
  note: z.string().trim().max(500).optional(),
  updatedByAdminId: z.string().trim().min(1).optional()
});
const patientIntakeTriageSchema = z.record(z.string(), intakeTriageRecordSchema);
const listRiskTriageQuerySchema = z.object({
  status: intakeTriageDecisionSchema.optional(),
  search: z.string().trim().min(1).max(120).optional()
});
const updatePatientRiskTriageSchema = z.object({
  decision: intakeTriageDecisionSchema,
  note: z.string().trim().max(500).optional()
});

const creditAdjustmentSchema = z.object({
  amount: z.number().int().min(-100).max(100).refine((value) => value !== 0, "amount must not be 0"),
  note: z.string().trim().max(300).optional()
});

const patientActiveProfessionalSchema = z.object({
  professionalId: z.string().min(1).nullable()
});

const patientSessionsAvailableSchema = z.object({
  remainingCredits: z.number().int().min(0),
  reason: z.string().trim().max(200).optional()
});

const patientSessionsContractedSchema = z.object({
  totalCredits: z.number().int().min(0),
  reason: z.string().trim().max(200).optional()
});

const patientAssignmentsSchema = z.record(z.string(), z.string().min(1).nullable());
const professionalDisplayOverrideSchema = z.object({
  ratingAverage: z.number().min(0).max(5).optional(),
  reviewsCount: z.number().int().min(0).max(100000).optional(),
  sessionDurationMinutes: z.number().int().min(15).max(120).optional(),
  activePatientsCount: z.number().int().min(0).max(100000).optional(),
  sessionsCount: z.number().int().min(0).max(1000000).optional(),
  completedSessionsCount: z.number().int().min(0).max(1000000).optional()
});
const professionalDisplayOverridesSchema = z.record(z.string(), professionalDisplayOverrideSchema);

type AdminUserRecord = {
  id: string;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: "PATIENT" | "PROFESSIONAL" | "ADMIN";
  isActive: boolean;
  isTestUser: boolean;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  patient: {
    id: string;
    timezone: string;
    status: string;
  } | null;
  professional: {
    id: string;
    visible: boolean;
    cancellationHours: number;
    bio: string | null;
    therapeuticApproach: string | null;
    yearsExperience: number | null;
    photoUrl: string | null;
    videoUrl: string | null;
    birthCountry: string | null;
    residencyCountry: string | null;
    market: Market;
    sessionPriceUsd: number | null;
    professionalTitle: string | null;
    specialization: string | null;
    focusPrimary: string | null;
  } | null;
  admin: {
    id: string;
  } | null;
};

function shapeAdminUser(
  user: AdminUserRecord,
  professionalCardDisplay?: {
    ratingAverage?: number;
    reviewsCount?: number;
    sessionDurationMinutes?: number;
    activePatientsCount?: number;
    sessionsCount?: number;
    completedSessionsCount?: number;
  }
) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isActive: user.isActive,
    isTestUser: user.isTestUser,
    deactivatedAt: user.deactivatedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    patientProfile: user.patient
      ? {
          id: user.patient.id,
          timezone: user.patient.timezone,
          status: user.patient.status
        }
      : null,
    professionalProfile: user.professional
      ? {
          id: user.professional.id,
          visible: user.professional.visible,
          cancellationHours: user.professional.cancellationHours,
          bio: user.professional.bio,
          therapeuticApproach: user.professional.therapeuticApproach,
          yearsExperience: user.professional.yearsExperience,
          photoUrl: user.professional.photoUrl,
          videoUrl: user.professional.videoUrl,
          birthCountry: user.professional.birthCountry,
          residencyCountry: user.professional.residencyCountry ?? null,
          market: user.professional.market,
          sessionPriceUsd: user.professional.sessionPriceUsd,
          professionalTitle: user.professional.professionalTitle,
          specialization: user.professional.specialization,
          focusPrimary: user.professional.focusPrimary,
          ratingAverage: professionalCardDisplay?.ratingAverage ?? null,
          reviewsCount: professionalCardDisplay?.reviewsCount ?? 0,
          sessionDurationMinutes: professionalCardDisplay?.sessionDurationMinutes ?? null,
          activePatientsCount: professionalCardDisplay?.activePatientsCount ?? null,
          sessionsCount: professionalCardDisplay?.sessionsCount ?? null,
          completedSessionsCount: professionalCardDisplay?.completedSessionsCount ?? null
        }
      : null,
    adminProfile: user.admin
      ? {
          id: user.admin.id
        }
      : null
  };
}

function buildId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function parsePatientAssignments(value: unknown): Record<string, string | null> {
  const parsed = patientAssignmentsSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

function parseProfessionalDisplayOverrides(value: unknown): Record<string, {
  ratingAverage?: number;
  reviewsCount?: number;
  sessionDurationMinutes?: number;
  activePatientsCount?: number;
  sessionsCount?: number;
  completedSessionsCount?: number;
}> {
  const parsed = professionalDisplayOverridesSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

type ProfessionalDisplayOverrideFields = {
  ratingAverage?: number | null;
  reviewsCount?: number | null;
  sessionDurationMinutes?: number | null;
  activePatientsCount?: number | null;
  sessionsCount?: number | null;
  completedSessionsCount?: number | null;
};

async function applyProfessionalDisplayOverrideDelta(
  professionalId: string,
  patch: ProfessionalDisplayOverrideFields
): Promise<void> {
  const hasAny = Object.values(patch).some((value) => value !== undefined);
  if (!hasAny) {
    return;
  }

  const displayConfig = await prisma.systemConfig.findUnique({
    where: { key: PROFESSIONAL_DISPLAY_OVERRIDES_KEY }
  });
  const overrides = parseProfessionalDisplayOverrides(displayConfig?.value);
  const professionalOverrides = { ...(overrides[professionalId] ?? {}) };

  const keys = [
    "ratingAverage",
    "reviewsCount",
    "sessionDurationMinutes",
    "activePatientsCount",
    "sessionsCount",
    "completedSessionsCount"
  ] as const;

  for (const key of keys) {
    const value = patch[key];
    if (value === undefined) {
      continue;
    }
    if (value === null) {
      delete professionalOverrides[key];
    } else {
      professionalOverrides[key] = value;
    }
  }

  if (Object.keys(professionalOverrides).length === 0) {
    delete overrides[professionalId];
  } else {
    overrides[professionalId] = professionalOverrides;
  }

  await prisma.systemConfig.upsert({
    where: { key: PROFESSIONAL_DISPLAY_OVERRIDES_KEY },
    create: { key: PROFESSIONAL_DISPLAY_OVERRIDES_KEY, value: overrides },
    update: { value: overrides }
  });
}

function parsePatientIntakeTriage(value: unknown): Record<string, {
  decision: "pending" | "approved" | "cancelled";
  updatedAt: string;
  note?: string;
  updatedByAdminId?: string;
}> {
  const parsed = patientIntakeTriageSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

function resolveIntakeTriageDecision(
  triage: Record<string, { decision: "pending" | "approved" | "cancelled" }>,
  patientId: string,
  riskLevel: string | null | undefined
): "pending" | "approved" | "cancelled" | null {
  if (!riskLevel || riskLevel === "low") {
    return null;
  }
  return triage[patientId]?.decision ?? "pending";
}

async function ensureLatestPurchaseForPatient(patientId: string) {
  const latestPurchase = await prisma.patientPackagePurchase.findFirst({
    where: { patientId },
    include: { sessionPackage: { select: { id: true, name: true } } },
    orderBy: { purchasedAt: "desc" }
  });

  if (latestPurchase) {
    return latestPurchase;
  }

  const fallbackPackage =
    (await prisma.sessionPackage.findFirst({
      where: { active: true },
      orderBy: { createdAt: "asc" }
    })) ??
    (await prisma.sessionPackage.findFirst({
      orderBy: { createdAt: "asc" }
    }));

  if (!fallbackPackage) {
    return null;
  }

  const manualSessionId = `manual-admin-${patientId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return prisma.patientPackagePurchase.create({
    data: {
      patientId,
      packageId: fallbackPackage.id,
      stripeCheckoutSessionId: manualSessionId,
      totalCredits: 0,
      remainingCredits: 0
    },
    include: { sessionPackage: { select: { id: true, name: true } } }
  });
}

function parseLandingSettings(value: unknown) {
  const parsed = landingSettingsSchema.safeParse(value);
  if (parsed.success) {
    return {
      patientHeroImageUrl: parsed.data.patientHeroImageUrl,
      patientDesktopImageUrl: parsed.data.patientDesktopImageUrl ?? parsed.data.patientHeroImageUrl,
      patientMobileImageUrl: parsed.data.patientMobileImageUrl ?? parsed.data.patientHeroImageUrl,
      professionalDesktopImageUrl: parsed.data.professionalDesktopImageUrl ?? null,
      professionalMobileImageUrl: parsed.data.professionalMobileImageUrl ?? null
    };
  }

  return {
    patientHeroImageUrl: null,
    patientDesktopImageUrl: null,
    patientMobileImageUrl: null,
    professionalDesktopImageUrl: null,
    professionalMobileImageUrl: null
  };
}

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole(["ADMIN"]));
adminRouter.use("/finance", financeRouter);

function utcMonthRange(reference = new Date()) {
  const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

function utcMonthRangeFromYearMonth(year: number, month1to12: number) {
  const start = new Date(Date.UTC(year, month1to12 - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month1to12, 0, 23, 59, 59, 999));
  return { start, end };
}

adminRouter.get("/kpis", async (req, res) => {
  const parsed = kpisQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params", details: parsed.error.flatten() });
  }

  try {
  let monthStart: Date;
  let monthEnd: Date;
  let monthKey: string;
  if (parsed.data.month) {
    const [yearStr, monthStr] = parsed.data.month.split("-");
    const year = Number(yearStr);
    const monthNum = Number(monthStr);
    ({ start: monthStart, end: monthEnd } = utcMonthRangeFromYearMonth(year, monthNum));
    monthKey = parsed.data.month;
  } else {
    ({ start: monthStart, end: monthEnd } = utcMonthRange());
    monthKey = `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  const scopePro = parsed.data.professionalId;
  const scopePat = parsed.data.patientId;
  const hasEntityScope = Boolean(scopePro || scopePat);
  const financeRecordScope =
    hasEntityScope ?
      {
        ...(scopePro ? { professionalId: scopePro } : {}),
        ...(scopePat ? { patientId: scopePat } : {})
      }
    : {};

  const [
    activePatients,
    activeProfessionals,
    scheduledSessions,
    packagePurchasesMonthRows,
    trialBookingsMonthRows,
    financeFeesMonth,
    financeFeesAllTime,
    unpaidSessionFinanceAgg,
    plannedMonthBookings,
    rules
  ] = await Promise.all([
    hasEntityScope && scopePat
      ? prisma.patientProfile
          .count({ where: { id: scopePat, status: "active" } })
          .then((n) => (n > 0 ? 1 : 0))
      : hasEntityScope && scopePro
        ? prisma.booking
            .groupBy({
              by: ["patientId"],
              where: {
                professionalId: scopePro,
                startsAt: { gte: monthStart, lte: monthEnd }
              }
            })
            .then((rows) => rows.length)
        : prisma.patientProfile.count({ where: { status: "active" } }),
    hasEntityScope && scopePro
      ? prisma.professionalProfile
          .count({ where: { id: scopePro, visible: true } })
          .then((n) => (n > 0 ? 1 : 0))
      : hasEntityScope && scopePat
        ? prisma.booking
            .groupBy({
              by: ["professionalId"],
              where: {
                patientId: scopePat,
                startsAt: { gte: monthStart, lte: monthEnd }
              }
            })
            .then((rows) => rows.length)
        : prisma.professionalProfile.count({ where: { visible: true } }),
    prisma.booking.count({
      where: {
        status: "CONFIRMED",
        startsAt: { gte: monthStart, lte: monthEnd },
        ...(scopePro ? { professionalId: scopePro } : {}),
        ...(scopePat ? { patientId: scopePat } : {})
      }
    }),
    prisma.patientPackagePurchase.findMany({
      where: {
        purchasedAt: { gte: monthStart, lte: monthEnd },
        ...(scopePat ? { patientId: scopePat } : {}),
        ...(scopePro ? { professionalIdSnapshot: scopePro } : {})
      },
      select: {
        packagePriceCentsSnapshot: true,
        platformCommissionPercentSnapshot: true
      }
    }),
    prisma.booking.findMany({
      where: {
        startsAt: { gte: monthStart, lte: monthEnd },
        OR: [{ consumedPurchaseId: null }, { consumedCredits: 0 }],
        AND: [
          { status: { in: ["CONFIRMED", "COMPLETED"] } },
          {
            OR: [
              { status: "CONFIRMED" },
              { AND: [{ status: "COMPLETED" }, { financeRecord: { is: null } }] }
            ]
          }
        ],
        ...(scopePro ? { professionalId: scopePro } : {}),
        ...(scopePat ? { patientId: scopePat } : {})
      },
      select: {
        professional: { select: { sessionPriceUsd: true } }
      }
    }),
    prisma.financeSessionRecord.aggregate({
      where: {
        bookingCompletedAt: { not: null, gte: monthStart, lte: monthEnd },
        ...financeRecordScope
      },
      _sum: {
        platformFeeCents: true,
        professionalNetCents: true,
        sessionPriceCents: true
      },
      _count: { _all: true }
    }),
    prisma.financeSessionRecord.aggregate({
      where: hasEntityScope ? financeRecordScope : {},
      _sum: { platformFeeCents: true },
      _count: { _all: true }
    }),
    prisma.financeSessionRecord.aggregate({
      where: {
        payoutLineId: null,
        ...financeRecordScope
      },
      _sum: { professionalNetCents: true, platformFeeCents: true },
      _count: { _all: true }
    }),
    prisma.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "REQUESTED"] },
        startsAt: { gte: monthStart, lte: monthEnd },
        ...(scopePro ? { professionalId: scopePro } : {}),
        ...(scopePat ? { patientId: scopePat } : {})
      },
      select: { professional: { select: { sessionPriceUsd: true } } }
    }),
    getFinanceRules()
  ]);

  let plannedGrossMonthCents = 0;
  let plannedPlatformFeeMonthCents = 0;
  let plannedProfessionalNetMonthCents = 0;
  for (const row of plannedMonthBookings) {
    const sessionPriceCents =
      row.professional.sessionPriceUsd != null
        ? row.professional.sessionPriceUsd * 100
        : rules.defaultSessionPriceCents;
    const fee = Math.round((sessionPriceCents * rules.platformCommissionPercent) / 100);
    plannedGrossMonthCents += sessionPriceCents;
    plannedPlatformFeeMonthCents += fee;
    plannedProfessionalNetMonthCents += Math.max(0, sessionPriceCents - fee);
  }

  let packagePurchasesMonthCents = 0;
  let packagePlatformFeeFromPurchasesMonthCents = 0;
  let packageProfessionalNetFromPurchasesMonthCents = 0;
  for (const row of packagePurchasesMonthRows) {
    const price = row.packagePriceCentsSnapshot ?? 0;
    packagePurchasesMonthCents += price;
    if (price <= 0) {
      continue;
    }
    const pct = row.platformCommissionPercentSnapshot ?? rules.platformCommissionPercent;
    const fee = Math.round((price * pct) / 100);
    packagePlatformFeeFromPurchasesMonthCents += fee;
    packageProfessionalNetFromPurchasesMonthCents += Math.max(0, price - fee);
  }
  const packagePurchasesMonthCount = packagePurchasesMonthRows.length;

  let trialGrossMonthCents = 0;
  let trialPlatformFeeMonthCents = 0;
  let trialProfessionalNetMonthCents = 0;
  const trialPct = rules.trialPlatformPercent;
  for (const row of trialBookingsMonthRows) {
    const sessionPriceCents =
      row.professional.sessionPriceUsd != null
        ? row.professional.sessionPriceUsd * 100
        : rules.defaultSessionPriceCents;
    const fee = Math.round((sessionPriceCents * trialPct) / 100);
    trialGrossMonthCents += sessionPriceCents;
    trialPlatformFeeMonthCents += fee;
    trialProfessionalNetMonthCents += Math.max(0, sessionPriceCents - fee);
  }
  const trialSessionsMonthCount = trialBookingsMonthRows.length;

  const platformFeeMonthCents = financeFeesMonth._sum.platformFeeCents ?? 0;
  const professionalNetMonthCents = financeFeesMonth._sum.professionalNetCents ?? 0;
  const grossSessionsMonthCents = financeFeesMonth._sum.sessionPriceCents ?? 0;
  const platformFeeAllTimeCents = financeFeesAllTime._sum.platformFeeCents ?? 0;
  const professionalNetUnpaidCents = unpaidSessionFinanceAgg._sum.professionalNetCents ?? 0;
  const platformFeeUnpaidCents = unpaidSessionFinanceAgg._sum.platformFeeCents ?? 0;

  /** @deprecated Use platformFeeMonthCents; kept for older admin bundles */
  const monthlyRevenueCents = platformFeeMonthCents;

  return res.json({
    kpis: {
      activePatients,
      activeProfessionals,
      scheduledSessions,
      monthlyRevenueCents,
      packagePurchasesMonthCents,
      packagePurchasesMonthCount,
      packagePlatformFeeFromPurchasesMonthCents,
      packageProfessionalNetFromPurchasesMonthCents,
      trialSessionsMonthCount,
      trialGrossMonthCents,
      trialPlatformFeeMonthCents,
      trialProfessionalNetMonthCents,
      trialPlatformPercentApplied: trialPct,
      platformFeeMonthCents,
      professionalNetMonthCents,
      grossSessionsMonthCents,
      completedSessionsMonthCount: financeFeesMonth._count._all,
      platformFeeAllTimeCents,
      professionalNetUnpaidCents,
      unpaidSessionRecordsCount: unpaidSessionFinanceAgg._count._all,
      platformFeeUnpaidCents,
      plannedMonetizableSessionsMonthCount: plannedMonthBookings.length,
      plannedGrossMonthCents,
      plannedPlatformFeeMonthCents,
      plannedProfessionalNetMonthCents
    },
    period: {
      month: monthKey,
      monthStart: monthStart.toISOString(),
      monthEnd: monthEnd.toISOString()
    }
  });
  } catch (error) {
    console.error("GET /admin/kpis failed", error);
    return res.status(500).json({ error: prismaErrorUserMessage(error) });
  }
});

adminRouter.get("/users", async (req, res) => {
  const parsed = listUsersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params", details: parsed.error.flatten() });
  }

  const search = parsed.data.search?.toLowerCase();
  const page = parsed.data.page ?? 1;
  const pageSize = parsed.data.pageSize ?? 10;
  const skip = (page - 1) * pageSize;
  const where = {
    role: parsed.data.role,
    ...(search
      ? {
          OR: [
            { email: { contains: search } },
            { fullName: { contains: search } }
          ]
        }
      : {})
  };

  const [total, users, displayOverridesConfig] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            timezone: true,
            status: true
          }
        },
        professional: {
          select: {
            id: true,
            visible: true,
            cancellationHours: true,
            bio: true,
            therapeuticApproach: true,
            yearsExperience: true,
            photoUrl: true,
            videoUrl: true,
            birthCountry: true,
            residencyCountry: true,
            market: true,
            sessionPriceUsd: true,
            professionalTitle: true,
            specialization: true,
            focusPrimary: true
          }
        },
        admin: {
          select: {
            id: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize
    }),
    prisma.systemConfig.findUnique({ where: { key: PROFESSIONAL_DISPLAY_OVERRIDES_KEY } })
  ]);
  const displayOverridesAll = parseProfessionalDisplayOverrides(displayOverridesConfig?.value);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return res.json({
    users: users.map((user: AdminUserRecord) => {
      const display = user.professional?.id ? displayOverridesAll[user.professional.id] : undefined;
      return shapeAdminUser(user, display);
    }),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages
    }
  });
});

adminRouter.post("/users", async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email already in use" });
  }

  const nameParts = userNamePartsFromFullNameString(parsed.data.fullName.trim());

  const created = await prisma.user.create({
    data: {
      email,
      fullName: nameParts.fullName,
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      passwordHash: hashPassword(parsed.data.password),
      role: parsed.data.role,
      isTestUser: parsed.data.isTestUser ?? false,
      patient:
        parsed.data.role === "PATIENT"
          ? {
              create: {
                residencyCountry: parsed.data.patientResidencyCountry,
                market: marketFromResidencyCountry(parsed.data.patientResidencyCountry),
                timezone: parsed.data.timezone ?? "America/New_York",
                status: parsed.data.patientStatus ?? "active"
              }
            }
          : undefined,
      professional:
        parsed.data.role === "PROFESSIONAL"
          ? {
              create: {
                market: marketFromResidencyCountry(undefined),
                visible: parsed.data.professionalVisible ?? true,
                cancellationHours: parsed.data.professionalCancellationHours ?? 24,
                bio: parsed.data.professionalBio?.trim() || null,
                therapeuticApproach: parsed.data.professionalTherapeuticApproach?.trim() || null,
                yearsExperience: parsed.data.professionalYearsExperience ?? null,
                photoUrl: parsed.data.professionalPhotoUrl ?? null,
                videoUrl: parsed.data.professionalVideoUrl ?? null
              }
            }
          : undefined,
      admin: parsed.data.role === "ADMIN" ? { create: {} } : undefined
    },
    include: {
      patient: {
        select: {
          id: true,
          timezone: true,
          status: true
        }
      },
      professional: {
        select: {
          id: true,
          visible: true,
          cancellationHours: true,
          bio: true,
          therapeuticApproach: true,
          yearsExperience: true,
          photoUrl: true,
          videoUrl: true,
          birthCountry: true,
          residencyCountry: true,
          market: true,
          sessionPriceUsd: true,
          professionalTitle: true,
          specialization: true,
          focusPrimary: true
        }
      },
      admin: {
        select: {
          id: true
        }
      }
    }
  });

  return res.status(201).json({
    user: shapeAdminUser(created)
  });
});

const adminUserInclude = {
  patient: {
    select: {
      id: true,
      timezone: true,
      status: true
    }
  },
  professional: {
    select: {
      id: true,
      visible: true,
      cancellationHours: true,
      bio: true,
      therapeuticApproach: true,
      yearsExperience: true,
      photoUrl: true,
      videoUrl: true,
      birthCountry: true,
      residencyCountry: true,
      market: true,
      sessionPriceUsd: true,
      professionalTitle: true,
      specialization: true,
      focusPrimary: true
    }
  },
  admin: {
    select: {
      id: true
    }
  }
} as const;

adminRouter.patch("/users/:userId", async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const existing = await prisma.user.findUnique({
    where: { id: req.params.userId },
    select: {
      id: true,
      role: true
    }
  });

  if (!existing) {
    return res.status(404).json({ error: "User not found" });
  }

  const data: Record<string, unknown> = {};

  if (parsed.data.fullName) {
    const nameParts = userNamePartsFromFullNameString(parsed.data.fullName.trim());
    data.fullName = nameParts.fullName;
    data.firstName = nameParts.firstName;
    data.lastName = nameParts.lastName;
  }

  if (parsed.data.email) {
    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    const existingByEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingByEmail && existingByEmail.id !== existing.id) {
      return res.status(409).json({ error: "Email already in use" });
    }
    data.email = normalizedEmail;
  }

  if (parsed.data.password) {
    data.passwordHash = hashPassword(parsed.data.password);
  }

  if (parsed.data.isTestUser !== undefined) {
    data.isTestUser = parsed.data.isTestUser;
  }

  if (parsed.data.avatarUrl !== undefined) {
    data.avatarUrl = parsed.data.avatarUrl;
  }

  if (existing.role === "PATIENT" && (parsed.data.patientStatus || parsed.data.patientTimezone)) {
    data.patient = {
      upsert: {
        create: {
          timezone: parsed.data.patientTimezone ?? "America/New_York",
          status: parsed.data.patientStatus ?? "active"
        },
        update: {
          ...(parsed.data.patientStatus ? { status: parsed.data.patientStatus } : {}),
          ...(parsed.data.patientTimezone ? { timezone: parsed.data.patientTimezone } : {})
        }
      }
    };
  }

  const hasProfessionalPrismaPatch =
    existing.role === "PROFESSIONAL"
    && (
      parsed.data.professionalVisible !== undefined
      || parsed.data.professionalCancellationHours !== undefined
      || parsed.data.professionalBio !== undefined
      || parsed.data.professionalTherapeuticApproach !== undefined
      || parsed.data.professionalYearsExperience !== undefined
      || parsed.data.professionalPhotoUrl !== undefined
      || parsed.data.professionalVideoUrl !== undefined
      || parsed.data.professionalBirthCountry !== undefined
      || parsed.data.professionalSessionPriceUsd !== undefined
      || parsed.data.professionalTitle !== undefined
      || parsed.data.professionalSpecialization !== undefined
      || parsed.data.professionalFocusPrimary !== undefined
    );

  if (hasProfessionalPrismaPatch) {
    data.professional = {
      upsert: {
        create: {
          visible: parsed.data.professionalVisible ?? true,
          cancellationHours: parsed.data.professionalCancellationHours ?? 24,
          bio: parsed.data.professionalBio?.trim() || null,
          therapeuticApproach: parsed.data.professionalTherapeuticApproach?.trim() || null,
          yearsExperience: parsed.data.professionalYearsExperience ?? null,
          photoUrl: parsed.data.professionalPhotoUrl ?? null,
          videoUrl: parsed.data.professionalVideoUrl ?? null,
          birthCountry: parsed.data.professionalBirthCountry ?? null,
          market: marketFromResidencyCountry(undefined),
          sessionPriceUsd: parsed.data.professionalSessionPriceUsd ?? null,
          professionalTitle: parsed.data.professionalTitle ?? null,
          specialization: parsed.data.professionalSpecialization ?? null,
          focusPrimary: parsed.data.professionalFocusPrimary ?? null
        },
        update: {
          ...(parsed.data.professionalVisible !== undefined ? { visible: parsed.data.professionalVisible } : {}),
          ...(parsed.data.professionalCancellationHours !== undefined
            ? { cancellationHours: parsed.data.professionalCancellationHours }
            : {}),
          ...(parsed.data.professionalBio !== undefined ? { bio: parsed.data.professionalBio.trim() || null } : {}),
          ...(parsed.data.professionalTherapeuticApproach !== undefined
            ? { therapeuticApproach: parsed.data.professionalTherapeuticApproach.trim() || null }
            : {}),
          ...(parsed.data.professionalYearsExperience !== undefined
            ? { yearsExperience: parsed.data.professionalYearsExperience }
            : {}),
          ...(parsed.data.professionalPhotoUrl !== undefined ? { photoUrl: parsed.data.professionalPhotoUrl || null } : {}),
          ...(parsed.data.professionalVideoUrl !== undefined ? { videoUrl: parsed.data.professionalVideoUrl || null } : {}),
          ...(parsed.data.professionalBirthCountry !== undefined ? { birthCountry: parsed.data.professionalBirthCountry } : {}),
          ...(parsed.data.professionalSessionPriceUsd !== undefined
            ? { sessionPriceUsd: parsed.data.professionalSessionPriceUsd }
            : {}),
          ...(parsed.data.professionalTitle !== undefined ? { professionalTitle: parsed.data.professionalTitle } : {}),
          ...(parsed.data.professionalSpecialization !== undefined ? { specialization: parsed.data.professionalSpecialization } : {}),
          ...(parsed.data.professionalFocusPrimary !== undefined ? { focusPrimary: parsed.data.professionalFocusPrimary } : {})
        }
      }
    };
  }

  const hasProfessionalDisplayPatch =
    existing.role === "PROFESSIONAL"
    && (
      parsed.data.professionalRatingAverage !== undefined
      || parsed.data.professionalReviewsCount !== undefined
      || parsed.data.professionalSessionDurationMinutes !== undefined
      || parsed.data.professionalActivePatientsCount !== undefined
      || parsed.data.professionalSessionsCount !== undefined
      || parsed.data.professionalCompletedSessionsCount !== undefined
    );

  let updated: AdminUserRecord | null = null;

  if (
    existing.role === "PROFESSIONAL" &&
    parsed.data.professionalSessionPriceUsd !== undefined &&
    parsed.data.professionalSessionPriceUsd !== null
  ) {
    const financeRules = await getFinanceRules();
    const priceError = validateProfessionalSessionListUsd(parsed.data.professionalSessionPriceUsd, financeRules);
    if (priceError) {
      return res.status(400).json({
        error: priceError.message,
        sessionPriceMin: priceError.sessionPriceMin,
        sessionPriceMax: priceError.sessionPriceMax,
        sessionPriceCurrency: priceError.currencyCode
      });
    }
  }

  if (Object.keys(data).length > 0) {
    updated = await prisma.user.update({
      where: { id: existing.id },
      data: data as any,
      include: adminUserInclude
    });
  } else {
    updated = await prisma.user.findUnique({
      where: { id: existing.id },
      include: adminUserInclude
    });
  }

  if (!updated) {
    return res.status(404).json({ error: "User not found" });
  }

  if (hasProfessionalDisplayPatch && updated.professional?.id) {
    await applyProfessionalDisplayOverrideDelta(updated.professional.id, {
      ratingAverage: parsed.data.professionalRatingAverage,
      reviewsCount: parsed.data.professionalReviewsCount,
      sessionDurationMinutes: parsed.data.professionalSessionDurationMinutes,
      activePatientsCount: parsed.data.professionalActivePatientsCount,
      sessionsCount: parsed.data.professionalSessionsCount,
      completedSessionsCount: parsed.data.professionalCompletedSessionsCount
    });
  }

  const displayConfigAfter = await prisma.systemConfig.findUnique({ where: { key: PROFESSIONAL_DISPLAY_OVERRIDES_KEY } });
  const displayOverridesAfter = parseProfessionalDisplayOverrides(displayConfigAfter?.value);
  const professionalCardDisplay = updated.professional?.id ? displayOverridesAfter[updated.professional.id] : undefined;

  return res.json({
    user: shapeAdminUser(updated, professionalCardDisplay)
  });
});

async function handleAdminDeleteUser(req: AuthenticatedRequest, res: Response) {
  const userId = req.params.userId;

  if (!userId) {
    return res.status(400).json({ error: "User id is required" });
  }

  if (req.auth?.userId && req.auth.userId === userId) {
    return res.status(400).json({ error: "You cannot delete your own admin user" });
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      isActive: true,
      isTestUser: true,
      patient: { select: { id: true } },
      professional: { select: { id: true } },
      admin: { select: { id: true } },
      googleCalendarConnection: {
        select: {
          refreshToken: true
        }
      }
    }
  });

  if (!existing) {
    return res.status(404).json({ error: "User not found" });
  }

  let hasHistoricalActivity = false;

  if (existing.patient?.id) {
    const patientId = existing.patient.id;
    const [patientBookingsCount, purchasesCount] = await Promise.all([
      prisma.booking.count({ where: { patientId } }),
      prisma.patientPackagePurchase.count({ where: { patientId } })
    ]);
    hasHistoricalActivity = hasHistoricalActivity || patientBookingsCount > 0 || purchasesCount > 0;
  }

  if (existing.professional?.id) {
    const professionalId = existing.professional.id;
    const [bookingsCount, financeRecordsCount, payoutLinesCount] = await Promise.all([
      prisma.booking.count({ where: { professionalId } }),
      prisma.financeSessionRecord.count({ where: { professionalId } }),
      prisma.financePayoutLine.count({ where: { professionalId } })
    ]);
    hasHistoricalActivity = hasHistoricalActivity || bookingsCount > 0 || financeRecordsCount > 0 || payoutLinesCount > 0;
  }

  const googleRefreshToken = existing.googleCalendarConnection?.refreshToken?.trim();
  if (googleRefreshToken) {
    // Best effort revocation in Google before local deletion.
    try {
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ token: googleRefreshToken }).toString()
      });
    } catch (error) {
      console.error("Could not revoke Google token while deleting user", error);
    }
  }

  const purgeHistoricalData = purgeHistoricalDataFromRequest(req);

  if (hasHistoricalActivity && !existing.isTestUser && !purgeHistoricalData) {
    if (!existing.isActive) {
      return res.json({
        ok: true,
        action: "deactivated",
        message: "User already disabled. Historical records are preserved."
      });
    }

    await prisma.$transaction(
      async (tx) => {
      if (existing.patient?.id) {
        await tx.patientProfile.update({
          where: { id: existing.patient.id },
          data: { status: "cancelled" }
        });
      }

      if (existing.professional?.id) {
        await tx.professionalProfile.update({
          where: { id: existing.professional.id },
          data: { visible: false }
        });
      }

      await tx.googleCalendarConnection.deleteMany({
        where: { userId: existing.id }
      });

      await tx.user.update({
        where: { id: existing.id },
        data: {
          isActive: false,
          deactivatedAt: new Date()
        }
      });
    },
      ADMIN_USER_SOFT_DELETE_TX_OPTIONS
    );

    return res.json({
      ok: true,
      action: "deactivated",
      message: "User has booking/payment history and was disabled. Historical records were preserved."
    });
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        await hardDeleteUserInTransaction(tx, existing);
      },
      ADMIN_USER_DELETE_TX_OPTIONS
    );
  } catch (error: unknown) {
    console.error("admin delete user transaction failed", error);
    return res.status(500).json({ error: prismaErrorUserMessage(error) });
  }

  return res.json({
    ok: true,
    action: "deleted",
    message: purgeHistoricalData
      ? "Usuario eliminado definitivamente (incluye reservas, finanzas y compras vinculadas)."
      : existing.isTestUser && hasHistoricalActivity
        ? "Test user deleted permanently with all related records."
        : "User deleted permanently because no booking/payment history was found."
  });
}

adminRouter.delete("/users/:userId", handleAdminDeleteUser);
adminRouter.post("/users/:userId/delete", handleAdminDeleteUser);

adminRouter.get("/session-packages", async (req, res) => {
  const parsed = listPackagesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params", details: parsed.error.flatten() });
  }

  const search = parsed.data.search?.toLowerCase();
  const [packages, visibilityConfig] = await Promise.all([
    prisma.sessionPackage.findMany({
      where: {
        ...(parsed.data.active ? { active: parsed.data.active === "true" } : {}),
        ...(parsed.data.professionalId ? { professionalId: parsed.data.professionalId } : {}),
        ...(parsed.data.market ? { market: parsed.data.market } : {}),
        ...(search ? { name: { contains: search } } : {})
      },
      include: {
        professional: { select: { id: true, user: { select: { fullName: true } } } },
        _count: { select: { purchases: true } }
      },
      orderBy: [{ active: "desc" }, { createdAt: "desc" }]
    }),
    prisma.systemConfig.findUnique({ where: { key: SESSION_PACKAGES_VISIBILITY_KEY } })
  ]);
  const visibility = parseSessionPackagesVisibility(visibilityConfig?.value);

  return res.json({
    visibility,
    sessionPackages: packages.map((item) => ({
      id: item.id,
      professionalId: item.professionalId,
      professionalName: item.professional?.user.fullName ?? null,
      stripePriceId: item.stripePriceId,
      market: item.market,
      paymentProvider: item.paymentProvider,
      name: item.name,
      credits: item.credits,
      priceCents: item.priceCents,
      discountPercent: item.discountPercent,
      currency: item.currency,
      active: item.active,
      createdAt: item.createdAt,
      purchasesCount: item._count.purchases,
      landingPublished: visibility.landing.includes(item.id),
      landingPatientV2Published: visibility.landingPatientV2.includes(item.id),
      landingProfessionalPublished: visibility.landingProfessional.includes(item.id),
      patientPublishedAr: visibility.patientByMarket.AR.includes(item.id),
      patientPublishedUs: visibility.patientByMarket.US.includes(item.id),
      patientPublishedBr: visibility.patientByMarket.BR.includes(item.id),
      patientPublishedEs: visibility.patientByMarket.ES.includes(item.id)
    }))
  });
});

adminRouter.put("/session-packages/visibility", async (req, res) => {
  const parsed = sessionPackagesVisibilityPutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const normalized = visibilityPayloadForStorage(parsed.data);
  const requestedIds = Array.from(
    new Set([
      ...normalized.landing,
      ...normalized.landingPatientV2,
      ...normalized.landingProfessional,
      ...normalized.patientByMarket.AR,
      ...normalized.patientByMarket.US,
      ...normalized.patientByMarket.BR,
      ...normalized.patientByMarket.ES
    ])
  );
  const existingPackages = requestedIds.length
    ? await prisma.sessionPackage.findMany({
        where: {
          id: { in: requestedIds },
          active: true
        },
        select: { id: true }
      })
    : [];

  if (existingPackages.length !== requestedIds.length) {
    return res.status(400).json({ error: "Only active packages can be published." });
  }

  const saved = await prisma.systemConfig.upsert({
    where: { key: SESSION_PACKAGES_VISIBILITY_KEY },
    update: { value: normalized as object },
    create: { key: SESSION_PACKAGES_VISIBILITY_KEY, value: normalized as object }
  });

  return res.json({ visibility: parseSessionPackagesVisibility(saved.value) });
});

adminRouter.post("/session-packages", async (req, res) => {
  const parsed = createPackageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const packageData = parsed.data;
  const stripePriceId =
    packageData.stripePriceId?.trim() || `pkg-admin-${packageData.market}-${Date.now().toString(36)}`;

  const created = await prisma.sessionPackage.create({
    data: {
      professionalId: packageData.professionalId ?? null,
      market: packageData.market,
      paymentProvider: packageData.paymentProvider,
      stripePriceId,
      name: packageData.name.trim(),
      credits: packageData.credits,
      priceCents: packageData.priceCents,
      discountPercent: packageData.discountPercent,
      currency: packageData.currency.trim().toLowerCase(),
      active: packageData.active
    }
  });

  return res.status(201).json({ sessionPackage: created });
});

adminRouter.patch("/session-packages/:packageId", async (req, res) => {
  const parsed = updatePackageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const existing = await prisma.sessionPackage.findUnique({ where: { id: req.params.packageId } });
  if (!existing) {
    return res.status(404).json({ error: "Session package not found" });
  }

  const updated = await prisma.sessionPackage.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.professionalId !== undefined ? { professionalId: parsed.data.professionalId } : {}),
      ...(parsed.data.stripePriceId !== undefined ? { stripePriceId: parsed.data.stripePriceId } : {}),
      ...(parsed.data.market !== undefined ? { market: parsed.data.market } : {}),
      ...(parsed.data.paymentProvider !== undefined ? { paymentProvider: parsed.data.paymentProvider } : {}),
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.credits !== undefined ? { credits: parsed.data.credits } : {}),
      ...(parsed.data.priceCents !== undefined ? { priceCents: parsed.data.priceCents } : {}),
      ...(parsed.data.discountPercent !== undefined ? { discountPercent: parsed.data.discountPercent } : {}),
      ...(parsed.data.currency !== undefined ? { currency: parsed.data.currency.trim().toLowerCase() } : {}),
      ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {})
    }
  });

  return res.json({ sessionPackage: updated });
});

adminRouter.delete("/session-packages/:packageId", async (req, res) => {
  const existing = await prisma.sessionPackage.findUnique({
    where: { id: req.params.packageId },
    include: { _count: { select: { purchases: true } } }
  });
  if (!existing) {
    return res.status(404).json({ error: "Session package not found" });
  }

  if (existing._count.purchases > 0) {
    const updated = await prisma.sessionPackage.update({
      where: { id: existing.id },
      data: { active: false }
    });
    return res.json({ sessionPackage: updated, note: "Package has purchases and was deactivated instead of deleted." });
  }

  await prisma.sessionPackage.delete({ where: { id: existing.id } });
  return res.json({ success: true });
});

adminRouter.get("/bookings", async (req, res) => {
  const parsed = listBookingsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params", details: parsed.error.flatten() });
  }

  const dateFrom = parsed.data.dateFrom ? new Date(`${parsed.data.dateFrom}T00:00:00.000Z`) : null;
  const dateTo = parsed.data.dateTo ? new Date(`${parsed.data.dateTo}T23:59:59.999Z`) : null;

  const bookings = await prisma.booking.findMany({
    where: {
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.patientId ? { patientId: parsed.data.patientId } : {}),
      ...(parsed.data.professionalId ? { professionalId: parsed.data.professionalId } : {}),
      ...(dateFrom || dateTo
        ? {
            startsAt: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {})
            }
          }
        : {})
    },
    include: {
      patient: { select: { id: true, user: { select: { fullName: true, email: true } } } },
      professional: { select: { id: true, user: { select: { fullName: true, email: true } } } },
      videoSession: { select: { id: true, joinUrlPatient: true, joinUrlProfessional: true } }
    },
    orderBy: { startsAt: "desc" },
    take: 500
  });

  return res.json({
    bookings: bookings.map((booking) => ({
      id: booking.id,
      patientId: booking.patientId,
      patientName: booking.patient.user.fullName,
      professionalId: booking.professionalId,
      professionalName: booking.professional.user.fullName,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      status: booking.status,
      consumedCredits: booking.consumedCredits,
      consumedPurchaseId: booking.consumedPurchaseId,
      cancellationReason: booking.cancellationReason,
      cancelledAt: booking.cancelledAt,
      completedAt: booking.completedAt,
      joinUrlPatient: booking.videoSession?.joinUrlPatient ?? null,
      joinUrlProfessional: booking.videoSession?.joinUrlProfessional ?? null
    }))
  });
});

adminRouter.patch("/bookings/:bookingId", async (req, res) => {
  const parsed = updateBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const existing = await prisma.booking.findUnique({ where: { id: req.params.bookingId } });
  if (!existing) {
    return res.status(404).json({ error: "Booking not found" });
  }

  const startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : null;
  const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null;
  const nextStatus = parsed.data.status ?? existing.status;
  const now = new Date();
  const isTrialBooking = existing.consumedPurchaseId === null || existing.consumedCredits === 0;
  const nextCancelledAt =
    nextStatus === "CANCELLED"
      ? existing.status === "CANCELLED" && existing.cancelledAt
        ? existing.cancelledAt
        : now
      : null;
  const nextCompletedAt =
    nextStatus === "COMPLETED"
      ? existing.status === "COMPLETED" && existing.completedAt
        ? existing.completedAt
        : now
      : null;

  if (nextStatus === "CANCELLED" && isTrialBooking) {
    const phrase = (parsed.data.adminTrialCancelConfirmation ?? "").trim();
    if (phrase !== ADMIN_TRIAL_BOOKING_CANCEL_PHRASE) {
      return res.status(409).json({
        error:
          "Las sesiones de prueba requieren confirmacion: envie adminTrialCancelConfirmation con la frase exacta acordada en el panel de admin."
      });
    }
  }

  /** Reintegro solo para reservas con crédito de paquete; la fecha de referencia es la de la fila en DB (no el startsAt del body), para no bloquear el reintegro si el formulario admin envía horarios desfasados. */
  const isPackageCreditBooking =
    existing.consumedPurchaseId !== null && existing.consumedCredits > 0;
  const refundCreditsOnAdminCancel =
    nextStatus === "CANCELLED"
    && existing.status !== "CANCELLED"
    && isPackageCreditBooking
    && now.getTime() < existing.startsAt.getTime();

  const updated = await prisma.$transaction(async (tx) => {
    const updatedBooking = await tx.booking.update({
      where: { id: existing.id },
      data: {
        ...(startsAt ? { startsAt } : {}),
        ...(endsAt ? { endsAt } : {}),
        ...(parsed.data.patientId ? { patientId: parsed.data.patientId } : {}),
        ...(parsed.data.professionalId ? { professionalId: parsed.data.professionalId } : {}),
        ...(parsed.data.consumedCredits !== undefined ? { consumedCredits: parsed.data.consumedCredits } : {}),
        ...(parsed.data.cancellationReason !== undefined ? { cancellationReason: parsed.data.cancellationReason } : {}),
        status: nextStatus,
        cancelledAt: nextCancelledAt,
        completedAt: nextCompletedAt
      }
    });

    if (refundCreditsOnAdminCancel) {
      const purchaseToRefund = existing.consumedPurchaseId
        ? await tx.patientPackagePurchase.findFirst({
            where: {
              id: existing.consumedPurchaseId,
              patientId: existing.patientId
            },
            select: { id: true }
          })
        : await tx.patientPackagePurchase.findFirst({
            where: { patientId: existing.patientId },
            orderBy: { purchasedAt: "desc" },
            select: { id: true }
          });

      if (purchaseToRefund) {
        await tx.patientPackagePurchase.update({
          where: { id: purchaseToRefund.id },
          data: {
            remainingCredits: { increment: existing.consumedCredits }
          }
        });
      }

      await tx.creditLedger.create({
        data: {
          patientId: existing.patientId,
          bookingId: existing.id,
          type: "SESSION_REFUND",
          amount: existing.consumedCredits,
          note: `Booking ${existing.id} cancelled by admin with refund`
        }
      });
    }

    return updatedBooking;
  });

  await upsertFinanceRecordForBooking(updated.id);

  return res.json({ booking: updated });
});

adminRouter.get("/professionals", async (req, res) => {
  const parsed = listProfessionalsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params", details: parsed.error.flatten() });
  }

  const search = parsed.data.search?.toLowerCase();
  const [professionals, displayOverridesConfig] = await Promise.all([
    prisma.professionalProfile.findMany({
      where: {
        ...(parsed.data.visible ? { visible: parsed.data.visible === "true" } : {}),
        ...(parsed.data.registrationApproval
          ? { registrationApproval: parsed.data.registrationApproval }
          : {}),
        ...(search
          ? {
              user: {
                OR: [{ fullName: { contains: search } }, { email: { contains: search } }]
              }
            }
          : {})
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        availabilitySlots: {
          where: { startsAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24) } },
          orderBy: { startsAt: "asc" },
          take: 60
        },
        _count: { select: { bookings: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 200
    }),
    prisma.systemConfig.findUnique({ where: { key: PROFESSIONAL_DISPLAY_OVERRIDES_KEY } })
  ]);
  const displayOverrides = parseProfessionalDisplayOverrides(displayOverridesConfig?.value);

  return res.json({
    professionals: professionals.map((item) => ({
      id: item.id,
      userId: item.userId,
      fullName: item.user.fullName,
      email: item.user.email,
      visible: item.visible,
      registrationApproval: item.registrationApproval,
      professionalTitle: item.professionalTitle,
      specialization: item.specialization,
      focusPrimary: item.focusPrimary,
      cancellationHours: item.cancellationHours,
      bio: item.bio,
      therapeuticApproach: item.therapeuticApproach,
      yearsExperience: item.yearsExperience,
      birthCountry: item.birthCountry,
      residencyCountry: item.residencyCountry ?? null,
      market: item.market,
      sessionPriceArs: item.sessionPriceArs,
      sessionPriceUsd: item.sessionPriceUsd,
      ratingAverage: displayOverrides[item.id]?.ratingAverage ?? null,
      reviewsCount: displayOverrides[item.id]?.reviewsCount ?? 0,
      sessionDurationMinutes: displayOverrides[item.id]?.sessionDurationMinutes ?? null,
      activePatientsCount: displayOverrides[item.id]?.activePatientsCount ?? null,
      sessionsCount: displayOverrides[item.id]?.sessionsCount ?? null,
      completedSessionsCount: displayOverrides[item.id]?.completedSessionsCount ?? null,
      photoUrl: item.photoUrl,
      videoUrl: item.videoUrl,
      bookingsCount: item._count.bookings,
      slots: item.availabilitySlots
    }))
  });
});

adminRouter.patch("/professionals/:professionalId", async (req, res) => {
  const parsed = updateProfessionalSchema.safeParse(req.body);
  if (!parsed.success) {
    /**
     * Antes devolvíamos sólo "Invalid payload" + `details` crudos de Zod, lo
     * que en el admin terminaba mostrando el mensaje genérico
     * "No guardamos los datos del profesional. Revisá rangos numéricos…"
     * sin pista de cuál campo había fallado. Ahora exponemos el primer
     * issue de forma legible para que el admin sepa qué corregir
     * (típicamente: foto que no es URL/data:image válida, o un número fuera
     * de rango). Mantenemos `details` para uso programático.
     */
    const firstIssue = parsed.error.issues[0];
    const fieldPath =
      firstIssue && firstIssue.path.length > 0 ? firstIssue.path.join(".") : "payload";
    const errorMessage = firstIssue ? `${fieldPath}: ${firstIssue.message}` : "Invalid payload";
    return res
      .status(400)
      .json({ error: errorMessage, field: fieldPath, details: parsed.error.flatten() });
  }

  const existing = await prisma.professionalProfile.findUnique({ where: { id: req.params.professionalId } });
  if (!existing) {
    return res.status(404).json({ error: "Professional not found" });
  }

  const financeRules = await getFinanceRules();
  if (parsed.data.sessionPriceArs !== undefined && parsed.data.sessionPriceArs !== null) {
    const priceError = validateProfessionalSessionListArs(parsed.data.sessionPriceArs);
    if (priceError) {
      return res.status(400).json({
        error: priceError.message,
        sessionPriceMin: priceError.sessionPriceMin,
        sessionPriceMax: priceError.sessionPriceMax,
        sessionPriceCurrency: priceError.currencyCode
      });
    }
  }
  if (parsed.data.sessionPriceUsd !== undefined && parsed.data.sessionPriceUsd !== null) {
    const priceError = validateProfessionalSessionListUsd(parsed.data.sessionPriceUsd, financeRules);
    if (priceError) {
      return res.status(400).json({
        error: priceError.message,
        sessionPriceMin: priceError.sessionPriceMin,
        sessionPriceMax: priceError.sessionPriceMax,
        sessionPriceCurrency: priceError.currencyCode
      });
    }
  }

  let updated;
  try {
    updated = await prisma.professionalProfile.update({
      where: { id: existing.id },
      data: {
        ...(parsed.data.visible !== undefined ? { visible: parsed.data.visible } : {}),
        ...(parsed.data.registrationApproval !== undefined ? { registrationApproval: parsed.data.registrationApproval } : {}),
        ...(parsed.data.professionalTitle !== undefined ? { professionalTitle: parsed.data.professionalTitle } : {}),
        ...(parsed.data.specialization !== undefined ? { specialization: parsed.data.specialization } : {}),
        ...(parsed.data.focusPrimary !== undefined ? { focusPrimary: parsed.data.focusPrimary } : {}),
        ...(parsed.data.cancellationHours !== undefined ? { cancellationHours: parsed.data.cancellationHours } : {}),
        ...(parsed.data.bio !== undefined ? { bio: parsed.data.bio } : {}),
        ...(parsed.data.therapeuticApproach !== undefined ? { therapeuticApproach: parsed.data.therapeuticApproach } : {}),
        ...(parsed.data.yearsExperience !== undefined ? { yearsExperience: parsed.data.yearsExperience } : {}),
        ...(parsed.data.birthCountry !== undefined ? { birthCountry: parsed.data.birthCountry } : {}),
        ...(parsed.data.residencyCountry !== undefined
          ? {
              residencyCountry: parsed.data.residencyCountry,
              market: marketFromResidencyCountry(parsed.data.residencyCountry ?? undefined)
            }
          : {}),
        ...(parsed.data.sessionPriceArs !== undefined ? { sessionPriceArs: parsed.data.sessionPriceArs } : {}),
        ...(parsed.data.sessionPriceUsd !== undefined ? { sessionPriceUsd: parsed.data.sessionPriceUsd } : {}),
        ...(parsed.data.photoUrl !== undefined ? { photoUrl: parsed.data.photoUrl } : {}),
        ...(parsed.data.videoUrl !== undefined ? { videoUrl: parsed.data.videoUrl } : {})
      }
    });
  } catch (error) {
    /**
     * Sin try/catch, un fallo de Prisma (por ejemplo `photoUrl` que pisa un
     * límite de columna en MySQL, o un timeout) caía en el handler global
     * como 500 sin info útil para el admin. Ahora devolvemos el mensaje
     * traducido de Prisma para que se vea en la consola.
     */
    console.error("[admin/professionals/PATCH] update failed", {
      professionalId: existing.id,
      payloadKeys: Object.keys(parsed.data),
      photoUrlLength: typeof parsed.data.photoUrl === "string" ? parsed.data.photoUrl.length : null,
      error
    });
    return res.status(500).json({ error: prismaErrorUserMessage(error) });
  }

  await applyProfessionalDisplayOverrideDelta(existing.id, {
    ratingAverage: parsed.data.ratingAverage,
    reviewsCount: parsed.data.reviewsCount,
    sessionDurationMinutes: parsed.data.sessionDurationMinutes,
    activePatientsCount: parsed.data.activePatientsCount,
    sessionsCount: parsed.data.sessionsCount,
    completedSessionsCount: parsed.data.completedSessionsCount
  });

  return res.json({ professional: updated });
});

adminRouter.post("/professionals/:professionalId/slots", async (req, res) => {
  const parsed = createAvailabilitySlotSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);
  if (endsAt <= startsAt) {
    return res.status(400).json({ error: "endsAt must be after startsAt" });
  }

  const professionalExists = await prisma.professionalProfile.findUnique({ where: { id: req.params.professionalId } });
  if (!professionalExists) {
    return res.status(404).json({ error: "Professional not found" });
  }

  const created = await prisma.availabilitySlot.create({
    data: {
      professionalId: req.params.professionalId,
      startsAt,
      endsAt,
      isBlocked: parsed.data.isBlocked ?? false,
      source: parsed.data.source ?? "admin"
    }
  });

  return res.status(201).json({ slot: created });
});

adminRouter.delete("/professionals/:professionalId/slots/:slotId", async (req, res) => {
  const slot = await prisma.availabilitySlot.findUnique({ where: { id: req.params.slotId } });
  if (!slot || slot.professionalId !== req.params.professionalId) {
    return res.status(404).json({ error: "Slot not found" });
  }

  await prisma.availabilitySlot.delete({ where: { id: slot.id } });
  return res.json({ success: true });
});

adminRouter.get("/patients", async (req, res) => {
  const parsed = listPatientsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params", details: parsed.error.flatten() });
  }

  const rawSearch = parsed.data.search?.toLowerCase().trim();
  const isWildcardSearch = rawSearch === "*";
  const search = rawSearch && !isWildcardSearch ? rawSearch : undefined;

  const page = parsed.data.page ?? 1;
  const defaultPageSize = isWildcardSearch ? 10 : 250;
  const pageSize = parsed.data.pageSize ?? defaultPageSize;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(parsed.data.status ? { status: parsed.data.status } : {}),
    ...(search
      ? {
          user: {
            OR: [{ fullName: { contains: search } }, { email: { contains: search } }]
          }
        }
      : {})
  };

  const [total, patients] = await Promise.all([
    prisma.patientProfile.count({ where }),
    prisma.patientProfile.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        intake: {
          select: {
            riskLevel: true,
            createdAt: true
          }
        },
        purchases: {
          include: { sessionPackage: { select: { id: true, name: true } } },
          orderBy: { purchasedAt: "desc" },
          take: 10
        },
        bookings: {
          orderBy: { startsAt: "desc" },
          take: 10
        },
        creditLedger: {
          orderBy: { createdAt: "desc" },
          take: 20
        }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize
    })
  ]);
  const triageConfig = await prisma.systemConfig.findUnique({ where: { key: PATIENT_INTAKE_TRIAGE_KEY } });
  const triageByPatient = parsePatientIntakeTriage(triageConfig?.value);
  const patientIds = patients.map((patient) => patient.id);
  const purchaseSummaries = patientIds.length > 0
    ? await prisma.patientPackagePurchase.groupBy({
        by: ["patientId"],
        where: {
          patientId: { in: patientIds }
        },
        _sum: {
          totalCredits: true,
          remainingCredits: true
        }
      })
    : [];
  const purchaseSummaryByPatient = new Map(
    purchaseSummaries.map((summary) => [
      summary.patientId,
      {
        totalCredits: summary._sum.totalCredits ?? 0,
        remainingCredits: summary._sum.remainingCredits ?? 0
      }
    ])
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return res.json({
    patients: patients.map((patient) => ({
      id: patient.id,
      userId: patient.userId,
      fullName: patient.user.fullName,
      email: patient.user.email,
      avatarUrl: patient.user.avatarUrl ?? null,
      timezone: patient.timezone,
      status: patient.status,
      intakeRiskLevel: patient.intake?.riskLevel ?? null,
      intakeCompletedAt: patient.intake?.createdAt ?? null,
      riskTriageDecision: resolveIntakeTriageDecision(
        triageByPatient,
        patient.id,
        patient.intake?.riskLevel ?? null
      ),
      riskBlocked:
        (patient.intake?.riskLevel ?? "low") !== "low"
        && resolveIntakeTriageDecision(triageByPatient, patient.id, patient.intake?.riskLevel ?? null) !== "approved",
      purchases: patient.purchases.map((purchase) => ({
        id: purchase.id,
        packageId: purchase.packageId,
        packageName: purchase.sessionPackage.name,
        totalCredits: purchase.totalCredits,
        remainingCredits: purchase.remainingCredits,
        purchasedAt: purchase.purchasedAt
      })),
      latestPurchase: patient.purchases[0]
        ? {
            id: patient.purchases[0].id,
            packageName: patient.purchases[0].sessionPackage.name,
            totalCredits: purchaseSummaryByPatient.get(patient.id)?.totalCredits ?? patient.purchases[0].totalCredits,
            remainingCredits: purchaseSummaryByPatient.get(patient.id)?.remainingCredits ?? patient.purchases[0].remainingCredits,
            purchasedAt: patient.purchases[0].purchasedAt
          }
        : null,
      bookingsCount: patient.bookings.length,
      creditBalance: patient.creditLedger.reduce((acc, movement) => acc + movement.amount, 0)
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages
    }
  });
});

adminRouter.get("/patients/risk-triage", async (req, res) => {
  const parsed = listRiskTriageQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params", details: parsed.error.flatten() });
  }

  const search = parsed.data.search?.toLowerCase().trim();
  const triageConfig = await prisma.systemConfig.findUnique({ where: { key: PATIENT_INTAKE_TRIAGE_KEY } });
  const triageByPatient = parsePatientIntakeTriage(triageConfig?.value);

  const patients = await prisma.patientProfile.findMany({
    where: {
      intake: {
        is: {
          riskLevel: { in: ["medium", "high"] }
        }
      },
      ...(search
        ? {
            user: {
              OR: [{ fullName: { contains: search } }, { email: { contains: search } }]
            }
          }
        : {})
    },
    include: {
      user: { select: { fullName: true, email: true, avatarUrl: true } },
      intake: {
        select: {
          riskLevel: true,
          createdAt: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const items = patients
    .map((patient) => {
      const riskLevel = patient.intake?.riskLevel ?? "low";
      const decision = resolveIntakeTriageDecision(triageByPatient, patient.id, riskLevel);
      return {
        patientId: patient.id,
        fullName: patient.user.fullName,
        email: patient.user.email,
        avatarUrl: patient.user.avatarUrl,
        patientStatus: patient.status,
        intakeRiskLevel: riskLevel,
        intakeCompletedAt: patient.intake?.createdAt ?? null,
        triageDecision: decision ?? "pending",
        triageUpdatedAt: triageByPatient[patient.id]?.updatedAt ?? patient.intake?.createdAt ?? null,
        triageNote: triageByPatient[patient.id]?.note ?? null,
        riskBlocked: decision !== "approved"
      };
    })
    .filter((item) => (parsed.data.status ? item.triageDecision === parsed.data.status : item.triageDecision !== "approved"));

  const pending = items.filter((item) => item.triageDecision === "pending").length;

  return res.json({
    items,
    total: items.length,
    pending
  });
});

adminRouter.post("/patients/:patientId/credits", async (req, res) => {
  const parsed = creditAdjustmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const patient = await prisma.patientProfile.findUnique({
    where: { id: req.params.patientId },
    include: { purchases: { orderBy: { purchasedAt: "desc" }, take: 1 } }
  });

  if (!patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  const adjustment = await prisma.creditLedger.create({
    data: {
      patientId: patient.id,
      bookingId: null,
      type: "ADJUSTMENT",
      amount: parsed.data.amount,
      note: parsed.data.note?.trim() || "Admin adjustment"
    }
  });

  if (patient.purchases[0]) {
    const nextCredits = Math.max(0, patient.purchases[0].remainingCredits + parsed.data.amount);
    await prisma.patientPackagePurchase.update({
      where: { id: patient.purchases[0].id },
      data: { remainingCredits: nextCredits }
    });
  }

  return res.status(201).json({ creditMovement: adjustment });
});

adminRouter.get("/patients/:patientId/management", async (req, res) => {
  const now = new Date();
  const patient = await prisma.patientProfile.findUnique({
    where: { id: req.params.patientId },
    include: {
      user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
      intake: {
        select: {
          riskLevel: true,
          createdAt: true,
          answers: true
        }
      },
      purchases: {
        include: { sessionPackage: { select: { id: true, name: true } } },
        orderBy: { purchasedAt: "desc" },
        take: 1
      },
      bookings: {
        where: {
          OR: [
            { status: "CONFIRMED" },
            {
              status: "CANCELLED",
              OR: [{ consumedPurchaseId: null }, { consumedCredits: 0 }],
              endsAt: { gte: now }
            }
          ]
        },
        include: { professional: { select: { id: true, user: { select: { fullName: true } } } } },
        orderBy: { startsAt: "desc" },
        take: 50
      }
    }
  });

  if (!patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  const latestPurchase = patient.purchases[0] ?? (await ensureLatestPurchaseForPatient(patient.id));
  const purchaseSummary = await prisma.patientPackagePurchase.aggregate({
    where: { patientId: patient.id },
    _sum: {
      totalCredits: true,
      remainingCredits: true
    }
  });

  const assignmentConfig = await prisma.systemConfig.findUnique({ where: { key: PATIENT_ACTIVE_ASSIGNMENTS_KEY } });
  const assignments = parsePatientAssignments(assignmentConfig?.value);
  const activeProfessionalId = assignments[patient.id] ?? null;
  const triageConfig = await prisma.systemConfig.findUnique({ where: { key: PATIENT_INTAKE_TRIAGE_KEY } });
  const triageByPatient = parsePatientIntakeTriage(triageConfig?.value);
  const riskTriageDecision = resolveIntakeTriageDecision(triageByPatient, patient.id, patient.intake?.riskLevel ?? null);

  let activeProfessionalName: string | null = null;
  if (activeProfessionalId) {
    const professional = await prisma.professionalProfile.findUnique({
      where: { id: activeProfessionalId },
      include: { user: { select: { fullName: true } } }
    });
    activeProfessionalName = professional?.user.fullName ?? null;
  }

  const intakeAnswers =
    patient.intake?.answers && typeof patient.intake.answers === "object" && !Array.isArray(patient.intake.answers)
      ? Object.entries(patient.intake.answers as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, value]) => {
          if (typeof value === "string" && value.trim().length > 0) {
            acc[key] = value.trim();
          }
          return acc;
        }, {})
      : null;

  return res.json({
    patient: {
      id: patient.id,
      userId: patient.userId,
      fullName: patient.user.fullName,
      email: patient.user.email,
      avatarUrl: patient.user.avatarUrl,
      timezone: patient.timezone,
      status: patient.status,
      intakeRiskLevel: patient.intake?.riskLevel ?? null,
      intakeCompletedAt: patient.intake?.createdAt ?? null,
      intakeAnswers,
      riskTriageDecision,
      riskBlocked: (patient.intake?.riskLevel ?? "low") !== "low" && riskTriageDecision !== "approved",
      activeProfessionalId,
      activeProfessionalName,
      assignmentStatus: activeProfessionalId ? "assigned" : "pending",
      latestPurchase: latestPurchase
        ? {
            id: latestPurchase.id,
            packageId: latestPurchase.packageId,
            packageName: latestPurchase.sessionPackage.name,
            totalCredits: purchaseSummary._sum.totalCredits ?? latestPurchase.totalCredits,
            remainingCredits: purchaseSummary._sum.remainingCredits ?? latestPurchase.remainingCredits,
            purchasedAt: latestPurchase.purchasedAt
          }
        : null,
      confirmedBookings: patient.bookings.map((booking) => ({
        id: booking.id,
        patientId: booking.patientId,
        patientName: patient.user.fullName,
        professionalId: booking.professionalId,
        professionalName: booking.professional.user.fullName,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        status: booking.status,
        consumedCredits: booking.consumedCredits,
        consumedPurchaseId: booking.consumedPurchaseId,
        cancellationReason: booking.cancellationReason,
        cancelledAt: booking.cancelledAt,
        completedAt: booking.completedAt
      }))
    }
  });
});

adminRouter.patch("/patients/:patientId/risk-triage", async (req: AuthenticatedRequest, res) => {
  const parsed = updatePatientRiskTriageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const patient = await prisma.patientProfile.findUnique({
    where: { id: req.params.patientId },
    include: {
      intake: {
        select: {
          riskLevel: true,
          createdAt: true
        }
      }
    }
  });

  if (!patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  const riskLevel = patient.intake?.riskLevel ?? null;
  if (!riskLevel || riskLevel === "low") {
    return res.status(409).json({ error: "Patient has no medium/high intake risk to triage" });
  }

  const triageConfig = await prisma.systemConfig.findUnique({ where: { key: PATIENT_INTAKE_TRIAGE_KEY } });
  const triageByPatient = parsePatientIntakeTriage(triageConfig?.value);
  triageByPatient[patient.id] = {
    decision: parsed.data.decision,
    updatedAt: new Date().toISOString(),
    ...(parsed.data.note ? { note: parsed.data.note } : {}),
    ...(req.auth?.userId ? { updatedByAdminId: req.auth.userId } : {})
  };

  await prisma.systemConfig.upsert({
    where: { key: PATIENT_INTAKE_TRIAGE_KEY },
    update: { value: triageByPatient },
    create: { key: PATIENT_INTAKE_TRIAGE_KEY, value: triageByPatient }
  });

  if (parsed.data.decision === "cancelled" && patient.status !== "cancelled") {
    await prisma.patientProfile.update({
      where: { id: patient.id },
      data: { status: "cancelled" }
    });
  }

  return res.json({
    patientId: patient.id,
    intakeRiskLevel: riskLevel,
    triageDecision: parsed.data.decision,
    riskBlocked: parsed.data.decision !== "approved",
    patientStatus: parsed.data.decision === "cancelled" ? "cancelled" : patient.status
  });
});

adminRouter.patch("/patients/:patientId/active-professional", async (req, res) => {
  const parsed = patientActiveProfessionalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const patient = await prisma.patientProfile.findUnique({ where: { id: req.params.patientId } });
  if (!patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  let professionalName: string | null = null;
  if (parsed.data.professionalId) {
    const professional = await prisma.professionalProfile.findUnique({
      where: { id: parsed.data.professionalId },
      include: { user: { select: { fullName: true } } }
    });

    if (!professional) {
      return res.status(404).json({ error: "Professional not found" });
    }

    professionalName = professional.user.fullName;
  }

  const existingConfig = await prisma.systemConfig.findUnique({ where: { key: PATIENT_ACTIVE_ASSIGNMENTS_KEY } });
  const currentAssignments = parsePatientAssignments(existingConfig?.value);

  if (parsed.data.professionalId) {
    currentAssignments[patient.id] = parsed.data.professionalId;
  } else {
    delete currentAssignments[patient.id];
  }

  await prisma.systemConfig.upsert({
    where: { key: PATIENT_ACTIVE_ASSIGNMENTS_KEY },
    update: { value: currentAssignments },
    create: {
      key: PATIENT_ACTIVE_ASSIGNMENTS_KEY,
      value: currentAssignments
    }
  });

  return res.json({
    patientId: patient.id,
    activeProfessionalId: parsed.data.professionalId,
    activeProfessionalName: professionalName,
    assignmentStatus: parsed.data.professionalId ? "assigned" : "pending"
  });
});

adminRouter.patch("/patients/:patientId/sessions-available", async (req, res) => {
  const parsed = patientSessionsAvailableSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const patient = await prisma.patientProfile.findUnique({
    where: { id: req.params.patientId },
    include: {
      purchases: {
        include: { sessionPackage: { select: { id: true, name: true } } },
        orderBy: { purchasedAt: "desc" },
        take: 1
      }
    }
  });

  if (!patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  const latestPurchase = patient.purchases[0] ?? (await ensureLatestPurchaseForPatient(patient.id));
  if (!latestPurchase) {
    return res.status(400).json({ error: "No session packages configured. Create one first." });
  }

  const currentWalletSummary = await prisma.patientPackagePurchase.aggregate({
    where: { patientId: patient.id },
    _sum: {
      totalCredits: true,
      remainingCredits: true
    }
  });
  const currentWalletRemaining = currentWalletSummary._sum.remainingCredits ?? 0;
  const delta = parsed.data.remainingCredits - currentWalletRemaining;

  const updatedPurchase = await prisma.$transaction(async (tx) => {
    await tx.patientPackagePurchase.updateMany({
      where: {
        patientId: patient.id,
        remainingCredits: { gt: 0 }
      },
      data: {
        remainingCredits: 0
      }
    });

    return tx.patientPackagePurchase.update({
      where: { id: latestPurchase.id },
      data: { remainingCredits: parsed.data.remainingCredits }
    });
  });

  if (delta !== 0) {
    await prisma.creditLedger.create({
      data: {
        patientId: patient.id,
        bookingId: null,
        type: "ADJUSTMENT",
        amount: delta,
        note:
          "Admin set remaining sessions to " +
          parsed.data.remainingCredits +
          (parsed.data.reason && parsed.data.reason.length > 0 ? " | motivo: " + parsed.data.reason : "")
      }
    });
  }

  return res.json({
    patientId: patient.id,
    latestPurchase: {
      id: updatedPurchase.id,
      packageId: updatedPurchase.packageId,
      packageName: latestPurchase.sessionPackage.name,
      totalCredits: currentWalletSummary._sum.totalCredits ?? updatedPurchase.totalCredits,
      remainingCredits: updatedPurchase.remainingCredits,
      purchasedAt: updatedPurchase.purchasedAt
    }
  });
});

adminRouter.patch("/patients/:patientId/sessions-contracted", async (req, res) => {
  const parsed = patientSessionsContractedSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const patient = await prisma.patientProfile.findUnique({
    where: { id: req.params.patientId },
    include: {
      purchases: {
        include: { sessionPackage: { select: { id: true, name: true } } },
        orderBy: { purchasedAt: "desc" },
        take: 1
      }
    }
  });

  if (!patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  const latestPurchase = patient.purchases[0] ?? (await ensureLatestPurchaseForPatient(patient.id));
  if (!latestPurchase) {
    return res.status(400).json({ error: "No session packages configured. Create one first." });
  }

  const previousTotal = latestPurchase.totalCredits;
  const nextTotal = parsed.data.totalCredits;
  const nextRemaining = Math.min(latestPurchase.remainingCredits, nextTotal);

  const updatedPurchase = await prisma.patientPackagePurchase.update({
    where: { id: latestPurchase.id },
    data: {
      totalCredits: nextTotal,
      remainingCredits: nextRemaining
    }
  });

  if (previousTotal !== nextTotal) {
    await prisma.creditLedger.create({
      data: {
        patientId: patient.id,
        bookingId: null,
        type: "ADJUSTMENT",
        amount: nextTotal - previousTotal,
        note:
          "Admin set contracted sessions to " +
          nextTotal +
          (parsed.data.reason && parsed.data.reason.length > 0 ? " | motivo: " + parsed.data.reason : "")
      }
    });
  }

  return res.json({
    patientId: patient.id,
    latestPurchase: {
      id: updatedPurchase.id,
      packageId: updatedPurchase.packageId,
      packageName: latestPurchase.sessionPackage.name,
      totalCredits: updatedPurchase.totalCredits,
      remainingCredits: updatedPurchase.remainingCredits,
      purchasedAt: updatedPurchase.purchasedAt
    }
  });

});

adminRouter.get("/landing-settings", async (_req, res) => {
  const config = await prisma.systemConfig.findUnique({
    where: { key: LANDING_SETTINGS_KEY }
  });

  if (!config) {
    return res.json({
      settings: parseLandingSettings(null),
      updatedAt: null
    });
  }

  return res.json({
    settings: parseLandingSettings(config.value),
    updatedAt: config.updatedAt
  });
});

adminRouter.put("/landing-settings", async (req, res) => {
  const parsed = landingSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const config = await prisma.systemConfig.upsert({
    where: { key: LANDING_SETTINGS_KEY },
    update: { value: parsed.data },
    create: {
      key: LANDING_SETTINGS_KEY,
      value: parsed.data
    }
  });

  return res.json({
    message: "Landing settings saved",
    settings: parseLandingSettings(parsed.data),
    updatedAt: config.updatedAt
  });
});

adminRouter.get("/web-content", async (_req, res) => {
  const [settingsConfig, reviewsConfig, blogConfig, exercisesConfig, relaxationConfig] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { key: LANDING_SETTINGS_KEY } }),
    prisma.systemConfig.findUnique({ where: { key: WEB_REVIEWS_KEY } }),
    prisma.systemConfig.findUnique({ where: { key: WEB_BLOG_POSTS_KEY } }),
    prisma.systemConfig.findUnique({ where: { key: WEB_EXERCISES_KEY } }),
    prisma.systemConfig.findUnique({ where: { key: WEB_RELAXATION_PLAYLISTS_KEY } })
  ]);

  const reviewsParsed = reviewsCollectionSchema.safeParse(reviewsConfig?.value);
  const postsParsed = blogPostsCollectionSchema.safeParse(blogConfig?.value);
  const exercisesParsed = exercisesCollectionSchema.safeParse(exercisesConfig?.value);
  const relaxationParsed = relaxationPlaylistsCollectionSchema.safeParse(relaxationConfig?.value);

  return res.json({
    settings: parseLandingSettings(settingsConfig?.value),
    reviews: reviewsParsed.success ? reviewsParsed.data : [],
    blogPosts: postsParsed.success ? postsParsed.data : [],
    exercises: exercisesParsed.success ? exercisesParsed.data : [],
    relaxationPlaylists: relaxationParsed.success ? relaxationParsed.data : [],
    relaxationPlaylistsBundledDefaults: DEFAULT_RELAXATION_PLAYLISTS,
    updatedAt: {
      settings: settingsConfig?.updatedAt ?? null,
      reviews: reviewsConfig?.updatedAt ?? null,
      blogPosts: blogConfig?.updatedAt ?? null,
      exercises: exercisesConfig?.updatedAt ?? null,
      relaxationPlaylists: relaxationConfig?.updatedAt ?? null
    }
  });
});

adminRouter.get("/web-content/reviews", async (_req, res) => {
  const config = await prisma.systemConfig.findUnique({ where: { key: WEB_REVIEWS_KEY } });
  const parsed = reviewsCollectionSchema.safeParse(config?.value);
  return res.json({
    reviews: parsed.success ? parsed.data : [],
    updatedAt: config?.updatedAt ?? null
  });
});

adminRouter.post("/web-content/reviews", async (req, res) => {
  const parsed = reviewCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const config = await prisma.systemConfig.findUnique({ where: { key: WEB_REVIEWS_KEY } });
  const current = reviewsCollectionSchema.safeParse(config?.value);
  const reviews = current.success ? current.data : [];
  const createdReview = { id: buildId("review"), accent: parsed.data.accent ?? "#7a5cff", ...parsed.data };
  const next = [createdReview, ...reviews];

  const saved = await prisma.systemConfig.upsert({
    where: { key: WEB_REVIEWS_KEY },
    update: { value: next },
    create: { key: WEB_REVIEWS_KEY, value: next }
  });

  return res.status(201).json({ review: createdReview, updatedAt: saved.updatedAt });
});

adminRouter.put("/web-content/reviews/:reviewId", async (req, res) => {
  const parsed = reviewUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const config = await prisma.systemConfig.findUnique({ where: { key: WEB_REVIEWS_KEY } });
  const current = reviewsCollectionSchema.safeParse(config?.value);
  const reviews = current.success ? current.data : [];
  const targetIndex = reviews.findIndex((review) => review.id === req.params.reviewId);

  if (targetIndex < 0) {
    return res.status(404).json({ error: "Review not found" });
  }

  const updatedReview = { ...reviews[targetIndex], ...parsed.data, accent: parsed.data.accent ?? reviews[targetIndex].accent ?? "#7a5cff" };
  const next = [...reviews];
  next[targetIndex] = updatedReview;

  const saved = await prisma.systemConfig.upsert({
    where: { key: WEB_REVIEWS_KEY },
    update: { value: next },
    create: { key: WEB_REVIEWS_KEY, value: next }
  });

  return res.json({ review: updatedReview, updatedAt: saved.updatedAt });
});

adminRouter.delete("/web-content/reviews/:reviewId", async (req, res) => {
  const config = await prisma.systemConfig.findUnique({ where: { key: WEB_REVIEWS_KEY } });
  const current = reviewsCollectionSchema.safeParse(config?.value);
  const reviews = current.success ? current.data : [];
  const next = reviews.filter((review) => review.id !== req.params.reviewId);

  if (next.length === reviews.length) {
    return res.status(404).json({ error: "Review not found" });
  }

  const saved = await prisma.systemConfig.upsert({
    where: { key: WEB_REVIEWS_KEY },
    update: { value: next },
    create: { key: WEB_REVIEWS_KEY, value: next }
  });

  return res.json({ success: true, updatedAt: saved.updatedAt });
});

adminRouter.get("/web-content/blog-posts", async (_req, res) => {
  const config = await prisma.systemConfig.findUnique({ where: { key: WEB_BLOG_POSTS_KEY } });
  const parsed = blogPostsCollectionSchema.safeParse(config?.value);
  return res.json({
    blogPosts: parsed.success ? parsed.data : [],
    updatedAt: config?.updatedAt ?? null
  });
});

adminRouter.post("/web-content/blog-posts", async (req, res) => {
  const parsed = blogPostCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const config = await prisma.systemConfig.findUnique({ where: { key: WEB_BLOG_POSTS_KEY } });
  const current = blogPostsCollectionSchema.safeParse(config?.value);
  const posts = current.success ? current.data : [];
  const createdPost = { id: buildId("blog"), ...parsed.data };

  const next = [createdPost, ...posts];
  const saved = await prisma.systemConfig.upsert({
    where: { key: WEB_BLOG_POSTS_KEY },
    update: { value: next },
    create: { key: WEB_BLOG_POSTS_KEY, value: next }
  });

  return res.status(201).json({ blogPost: createdPost, updatedAt: saved.updatedAt });
});

/**
 * Importa el catálogo por defecto (las 18 notas de la landing) al SystemConfig.
 * Solo lo permite cuando todavía no hay notas cargadas, para evitar pisar trabajo del admin.
 * Una vez aplicado, las notas se pueden editar/borrar como cualquier otra desde el panel.
 */
adminRouter.post("/web-content/blog-posts/seed-defaults", async (_req, res) => {
  const config = await prisma.systemConfig.findUnique({ where: { key: WEB_BLOG_POSTS_KEY } });
  const current = blogPostsCollectionSchema.safeParse(config?.value);
  const existing = current.success ? current.data : [];

  if (existing.length > 0) {
    return res.status(409).json({
      error: "Ya hay notas cargadas. Eliminá las existentes antes de importar el catálogo inicial."
    });
  }

  const seeded = DEFAULT_BLOG_POSTS.map((post) => ({ ...post }));
  const validated = blogPostsCollectionSchema.safeParse(seeded);
  if (!validated.success) {
    return res.status(500).json({ error: "Default catalog failed validation", details: validated.error.flatten() });
  }

  const saved = await prisma.systemConfig.upsert({
    where: { key: WEB_BLOG_POSTS_KEY },
    update: { value: validated.data },
    create: { key: WEB_BLOG_POSTS_KEY, value: validated.data }
  });

  return res.status(201).json({
    blogPosts: validated.data,
    imported: validated.data.length,
    updatedAt: saved.updatedAt
  });
});

adminRouter.put("/web-content/blog-posts/:postId", async (req, res) => {
  const parsed = blogPostUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const config = await prisma.systemConfig.findUnique({ where: { key: WEB_BLOG_POSTS_KEY } });
  const current = blogPostsCollectionSchema.safeParse(config?.value);
  const posts = current.success ? current.data : [];
  const targetIndex = posts.findIndex((post) => post.id === req.params.postId);

  if (targetIndex < 0) {
    return res.status(404).json({ error: "Blog post not found" });
  }

  const updatedPost = { ...posts[targetIndex], ...parsed.data };
  const next = [...posts];
  next[targetIndex] = updatedPost;

  const saved = await prisma.systemConfig.upsert({
    where: { key: WEB_BLOG_POSTS_KEY },
    update: { value: next },
    create: { key: WEB_BLOG_POSTS_KEY, value: next }
  });

  return res.json({ blogPost: updatedPost, updatedAt: saved.updatedAt });
});

adminRouter.delete("/web-content/blog-posts/:postId", async (req, res) => {
  const config = await prisma.systemConfig.findUnique({ where: { key: WEB_BLOG_POSTS_KEY } });
  const current = blogPostsCollectionSchema.safeParse(config?.value);
  const posts = current.success ? current.data : [];
  const next = posts.filter((post) => post.id !== req.params.postId);

  if (next.length === posts.length) {
    return res.status(404).json({ error: "Blog post not found" });
  }

  const saved = await prisma.systemConfig.upsert({
    where: { key: WEB_BLOG_POSTS_KEY },
    update: { value: next },
    create: { key: WEB_BLOG_POSTS_KEY, value: next }
  });

  return res.json({ success: true, updatedAt: saved.updatedAt });
});

adminRouter.get("/web-content/exercises", async (_req, res) => {
  const config = await prisma.systemConfig.findUnique({ where: { key: WEB_EXERCISES_KEY } });
  const parsed = exercisesCollectionSchema.safeParse(config?.value);
  return res.json({
    exercises: parsed.success ? parsed.data : [],
    updatedAt: config?.updatedAt ?? null
  });
});

adminRouter.post("/web-content/exercises", async (req, res) => {
  const parsed = exerciseCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const config = await prisma.systemConfig.findUnique({ where: { key: WEB_EXERCISES_KEY } });
  const current = exercisesCollectionSchema.safeParse(config?.value);
  const exercises = current.success ? current.data : [];
  const createdExercise = { id: buildId("exercise"), ...parsed.data };

  const next = [createdExercise, ...exercises];
  const saved = await prisma.systemConfig.upsert({
    where: { key: WEB_EXERCISES_KEY },
    update: { value: next },
    create: { key: WEB_EXERCISES_KEY, value: next }
  });

  return res.status(201).json({ exercise: createdExercise, updatedAt: saved.updatedAt });
});

adminRouter.put("/web-content/exercises/:exerciseId", async (req, res) => {
  const parsed = exerciseUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const config = await prisma.systemConfig.findUnique({ where: { key: WEB_EXERCISES_KEY } });
  const current = exercisesCollectionSchema.safeParse(config?.value);
  const exercises = current.success ? current.data : [];
  const targetIndex = exercises.findIndex((exercise) => exercise.id === req.params.exerciseId);

  if (targetIndex < 0) {
    return res.status(404).json({ error: "Exercise not found" });
  }

  const updatedExercise = { ...exercises[targetIndex], ...parsed.data };
  const next = [...exercises];
  next[targetIndex] = updatedExercise;

  const saved = await prisma.systemConfig.upsert({
    where: { key: WEB_EXERCISES_KEY },
    update: { value: next },
    create: { key: WEB_EXERCISES_KEY, value: next }
  });

  return res.json({ exercise: updatedExercise, updatedAt: saved.updatedAt });
});

adminRouter.put("/web-content/relaxation-playlists", async (req, res) => {
  const parsed = relaxationPlaylistsPutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const saved = await prisma.systemConfig.upsert({
    where: { key: WEB_RELAXATION_PLAYLISTS_KEY },
    update: { value: parsed.data.playlists },
    create: { key: WEB_RELAXATION_PLAYLISTS_KEY, value: parsed.data.playlists }
  });

  return res.json({ success: true, playlists: parsed.data.playlists, updatedAt: saved.updatedAt });
});

/**
 * Quita la lista guardada: el portal vuelve a servir la plantilla embebida en el API (`DEFAULT_RELAXATION_PLAYLISTS`).
 */
adminRouter.delete("/web-content/relaxation-playlists", async (_req, res) => {
  await prisma.systemConfig.deleteMany({ where: { key: WEB_RELAXATION_PLAYLISTS_KEY } });
  return res.json({ success: true });
});

adminRouter.delete("/web-content/exercises/:exerciseId", async (req, res) => {
  const config = await prisma.systemConfig.findUnique({ where: { key: WEB_EXERCISES_KEY } });
  const current = exercisesCollectionSchema.safeParse(config?.value);
  const exercises = current.success ? current.data : [];
  const next = exercises.filter((exercise) => exercise.id !== req.params.exerciseId);

  if (next.length === exercises.length) {
    return res.status(404).json({ error: "Exercise not found" });
  }

  const saved = await prisma.systemConfig.upsert({
    where: { key: WEB_EXERCISES_KEY },
    update: { value: next },
    create: { key: WEB_EXERCISES_KEY, value: next }
  });

  return res.json({ success: true, updatedAt: saved.updatedAt });
});
