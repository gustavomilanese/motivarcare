import { Router } from "express";
import { Prisma, ProfessionalRegistrationApproval, type Market } from "@prisma/client";
import { marketFromResidencyCountry } from "@therapy/types";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import {
  professionalPublicListingLabel,
  resolvedFirstLastFromUserRecord,
  yearsExperienceFromGraduationYear
} from "../../lib/professionalListingDisplayName.js";
import { getActorContext } from "../../lib/actor.js";
import { requireAuth, type AuthenticatedRequest } from "../../lib/auth.js";
import {
  effectiveSessionPriceArs,
  listPriceMajorUnitsForPackageMarket,
  validateProfessionalSessionListArs,
  validateProfessionalSessionListUsd
} from "../../lib/professionalSessionListPrice.js";
import { roundSessionPriceArsFromUsd } from "../../lib/usdArsExchange.js";
import { getResilientUsdArsRate } from "../../lib/usdArsExchangeResilient.js";
import { getFinanceRules } from "../finance/finance.service.js";
import { prismaErrorUserMessage, isPrismaUniqueViolation } from "../../lib/prismaUserError.js";
import { rankProfessionalMatch, type MatchingLanguage } from "./matching.service.js";
import { focusAreasDisplayLabel, normalizeFocusAreas } from "./focusAreas.js";
import { evaluateIntakeRiskLevel } from "./intake.shared.js";

const PATIENT_ACTIVE_ASSIGNMENTS_KEY = "patient-active-assignments";
const PATIENT_INTAKE_TRIAGE_KEY = "patient-intake-triage";
const PROFESSIONAL_DISPLAY_OVERRIDES_KEY = "professional-display-overrides";
const patientAssignmentsSchema = z.record(z.string(), z.string().min(1).nullable());
const intakeTriageDecisionSchema = z.enum(["pending", "approved", "cancelled"]);
const intakeTriageRecordSchema = z.object({
  decision: intakeTriageDecisionSchema,
  updatedAt: z.string().datetime(),
  note: z.string().trim().max(500).optional(),
  updatedByAdminId: z.string().trim().min(1).optional()
});
const patientIntakeTriageSchema = z.record(z.string(), intakeTriageRecordSchema);
const professionalDisplayOverrideSchema = z.object({
  ratingAverage: z.number().min(0).max(5).optional(),
  reviewsCount: z.number().int().min(0).max(100000).optional(),
  sessionDurationMinutes: z.number().int().min(15).max(120).optional(),
  activePatientsCount: z.number().int().min(0).max(100000).optional(),
  sessionsCount: z.number().int().min(0).max(1000000).optional(),
  completedSessionsCount: z.number().int().min(0).max(1000000).optional()
});
const professionalDisplayOverridesSchema = z.record(z.string(), professionalDisplayOverrideSchema);

const submitIntakeSchema = z.object({
  answers: z.record(z.string().min(1), z.string().trim().min(1)).refine((answers) => Object.keys(answers).length > 0, {
    message: "Intake answers are required"
  }),
  residencyCountry: z
    .string()
    .trim()
    .length(2)
    .regex(/^[A-Za-z]{2}$/)
    .transform((value) => value.toUpperCase())
});

const imageSourceSchema = z
  .string()
  .trim()
  .refine((value) => value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:image/"), {
    message: "Invalid image source"
  });
const mediaSourceSchema = z
  .string()
  .trim()
  .refine((value) => value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:"), {
    message: "Invalid media source"
  });

const updatePublicProfileSchema = z.object({
  visible: z.boolean().optional(),
  professionalTitle: z.string().trim().max(120).nullable().optional(),
  specialization: z.string().trim().max(120).nullable().optional(),
  experienceBand: z.string().trim().max(120).nullable().optional(),
  practiceBand: z.string().trim().max(120).nullable().optional(),
  gender: z.string().trim().max(60).nullable().optional(),
  birthCountry: z.string().trim().max(120).nullable().optional(),
  residencyCountry: z
    .string()
    .trim()
    .length(2)
    .regex(/^[A-Za-z]{2}$/)
    .transform((value) => value.toUpperCase())
    .nullable()
    .optional(),
  focusPrimary: z.string().trim().max(500).nullable().optional(),
  focusAreas: z.array(z.string().trim().min(1).max(120)).max(25).optional(),
  languages: z.array(z.string().trim().min(1).max(40)).max(10).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  shortDescription: z.string().max(250).nullable().optional(),
  therapeuticApproach: z.string().max(500).nullable().optional(),
  yearsExperience: z.number().int().min(0).max(80).nullable().optional(),
  graduationYear: z.number().int().min(1950).max(2035).nullable().optional(),
  sessionPriceArs: z.number().int().min(0).max(10_000_000).nullable().optional(),
  sessionPriceUsd: z.number().int().min(0).max(10_000_000).nullable().optional(),
  discount4: z.number().int().min(0).max(5).nullable().optional(),
  discount8: z.number().int().min(0).max(10).nullable().optional(),
  discount12: z.number().int().min(0).max(15).nullable().optional(),
  photoUrl: imageSourceSchema.nullable().optional(),
  videoUrl: mediaSourceSchema.nullable().optional(),
  videoCoverUrl: mediaSourceSchema.nullable().optional(),
  stripeDocUrl: mediaSourceSchema.nullable().optional(),
  stripeVerified: z.boolean().optional(),
  stripeVerificationStarted: z.boolean().optional(),
  cancellationHours: z.number().int().min(0).max(168).optional(),
  timezone: z.string().trim().min(3).max(120).optional(),
  diplomas: z.array(
    z.object({
      institution: z.string().trim().min(1).max(200),
      degree: z.string().trim().min(1).max(200),
      startYear: z.number().int().min(1900).max(2100),
      graduationYear: z.number().int().min(1900).max(2100),
      documentUrl: imageSourceSchema.nullable().optional()
    })
  ).max(20).optional()
});

const syncTimezoneSchema = z.object({
  timezone: z.string().trim().min(3).max(120),
  persistPreference: z.boolean().optional()
});
const updateActiveProfessionalSchema = z.object({
  professionalId: z.string().trim().min(1).nullable()
});
const purchasePackageSchema = z.object({
  packageId: z.string().trim().min(1)
});
const purchaseIndividualSessionsSchema = z.object({
  sessionCount: z.coerce.number().int().min(1).max(99)
});
const patchPatientMarketSchema = z.object({
  market: z.enum(["AR", "US", "BR", "ES"])
});
const matchingQuerySchema = z.object({
  language: z.enum(["es", "en", "pt"]).optional()
});

function sanitizeTimezone(timezone: string): string {
  const candidate = timezone.trim();
  try {
    Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return "UTC";
  }
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

function compatibilityScore(professionalId: string): number {
  const seed = professionalId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return 80 + (seed % 18);
}

function resolvePackageDiscountPercent(params: {
  credits: number;
  fallbackDiscountPercent: number;
  profileDiscount4: number | null | undefined;
  profileDiscount8: number | null | undefined;
  profileDiscount12: number | null | undefined;
}): number {
  if (params.credits === 1) {
    return 0;
  }
  if (params.credits === 4 && params.profileDiscount4 !== null && params.profileDiscount4 !== undefined) {
    return params.profileDiscount4;
  }
  if (params.credits === 8 && params.profileDiscount8 !== null && params.profileDiscount8 !== undefined) {
    return params.profileDiscount8;
  }
  if (params.credits === 12 && params.profileDiscount12 !== null && params.profileDiscount12 !== undefined) {
    return params.profileDiscount12;
  }
  return params.fallbackDiscountPercent;
}

function resolvePackagePricing(params: {
  credits: number;
  fallbackPriceCents: number;
  fallbackDiscountPercent: number;
  sessionListPriceMajor: number | null | undefined;
  profileDiscount4: number | null | undefined;
  profileDiscount8: number | null | undefined;
  profileDiscount12: number | null | undefined;
}) {
  const discountPercent = resolvePackageDiscountPercent({
    credits: params.credits,
    fallbackDiscountPercent: params.fallbackDiscountPercent,
    profileDiscount4: params.profileDiscount4,
    profileDiscount8: params.profileDiscount8,
    profileDiscount12: params.profileDiscount12
  });

  if (!params.sessionListPriceMajor || params.sessionListPriceMajor <= 0) {
    return {
      discountPercent,
      listPriceCents: params.fallbackPriceCents,
      priceCents: params.fallbackPriceCents
    };
  }

  const listPriceCents = params.sessionListPriceMajor * params.credits * 100;
  const priceCents = Math.max(0, Math.round(listPriceCents * (1 - discountPercent / 100)));
  return {
    discountPercent,
    listPriceCents,
    priceCents
  };
}

/**
 * En producción a veces no se ejecuta el seed del paquete de 1 crédito global.
 * Idempotente: reutiliza cualquier paquete activo credits=1 sin profesional, o hace upsert por stripePriceId fijo.
 */
const AUTO_INDIVIDUAL_SESSION_STRIPE_ID = "motivar-auto-catalog-individual-1";

async function getOrCreateGlobalIndividualSessionPackage(market: Market): Promise<{
  id: string;
  name: string;
  credits: number;
  active: boolean;
  priceCents: number;
  discountPercent: number;
  currency: string | null;
  professionalId: string | null;
}> {
  const existing = await prisma.sessionPackage.findFirst({
    where: { active: true, credits: 1, professionalId: null, market },
    select: {
      id: true,
      name: true,
      credits: true,
      active: true,
      priceCents: true,
      discountPercent: true,
      currency: true,
      professionalId: true
    },
    orderBy: [{ createdAt: "asc" }]
  });
  if (existing) {
    return existing;
  }

  const referenceBundle = await prisma.sessionPackage.findFirst({
    where: { active: true, credits: { gt: 1 }, professionalId: null, market },
    orderBy: [{ credits: "asc" }],
    select: { priceCents: true, credits: true, currency: true }
  });

  const priceCents = referenceBundle
    ? Math.max(100, Math.round(referenceBundle.priceCents / referenceBundle.credits))
    : market === "US"
      ? 12_000
      : market === "AR"
        ? 120_000
        : market === "BR"
          ? 350_000
          : market === "ES"
            ? 9_900
            : 12_000;
  const currency =
    referenceBundle?.currency
    ?? (market === "AR"
      ? "ars"
      : market === "BR"
        ? "brl"
        : market === "ES"
          ? "eur"
          : "usd");
  const paymentProvider = market === "AR" ? "MERCADOPAGO" : "STRIPE";

  return prisma.sessionPackage.upsert({
    where: { market_stripePriceId: { market, stripePriceId: AUTO_INDIVIDUAL_SESSION_STRIPE_ID } },
    create: {
      market,
      paymentProvider,
      stripePriceId: AUTO_INDIVIDUAL_SESSION_STRIPE_ID,
      name: "Sesión individual",
      credits: 1,
      priceCents,
      discountPercent: 0,
      currency,
      active: true,
      professionalId: null
    },
    update: {
      active: true
    },
    select: {
      id: true,
      name: true,
      credits: true,
      active: true,
      priceCents: true,
      discountPercent: true,
      currency: true,
      professionalId: true
    }
  });
}

/** Franjas futuras por profesional en directorio y matching (payload acotado). */
const DIRECTORY_AVAILABILITY_SLOT_TAKE = 60;
/** Traemos más filas y luego excluimos días de vacaciones, para seguir entregando ~TAKE horarios elegibles. */
const DIRECTORY_AVAILABILITY_SLOT_FETCH = 120;

/**
 * Días (clave YYYY-MM-DD UTC) bloqueados por vacaciones, por profesional — misma idea que en availability.routes.
 */
async function vacationDayKeysByProfessional(params: {
  professionalIds: string[];
  rangeStart: Date;
  rangeEnd: Date;
}): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  if (params.professionalIds.length === 0) {
    return map;
  }

  const vacationFromDate = new Date(params.rangeStart);
  vacationFromDate.setHours(0, 0, 0, 0);
  const vacationToDate = new Date(params.rangeEnd);
  vacationToDate.setHours(23, 59, 59, 999);

  const vacationSlots = await prisma.availabilitySlot.findMany({
    where: {
      professionalId: { in: params.professionalIds },
      isBlocked: true,
      source: "vacation",
      startsAt: {
        gte: vacationFromDate,
        lte: vacationToDate
      }
    },
    select: { professionalId: true, startsAt: true }
  });

  for (const row of vacationSlots) {
    const dayKey = row.startsAt.toISOString().slice(0, 10);
    if (!map.has(row.professionalId)) {
      map.set(row.professionalId, new Set());
    }
    map.get(row.professionalId)!.add(dayKey);
  }

  return map;
}

interface DirectoryProfessional {
  id: string;
  userId: string;
  /** Listado público ("María L."). */
  fullName: string;
  /** Para iniciales / UI; mismo criterio que en directorio. */
  firstName: string;
  lastName: string;
  title: string;
  specialization: string | null;
  focusPrimary: string | null;
  /** Áreas de práctica declaradas (alimenta matching de tópicos y LGBTIQ+). */
  focusAreas: string[];
  birthCountry: string | null;
  /** Género declarado por el profesional (alimenta matching de `therapistPreferences.gender`). */
  gender: string | null;
  /** Año de egreso del título (alimenta estimación de edad para matching). */
  graduationYear: number | null;
  bio: string | null;
  therapeuticApproach: string | null;
  languages: string[];
  yearsExperience: number | null;
  sessionPriceArs: number | null;
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
  slots: Array<{
    id: string;
    startsAt: Date;
    endsAt: Date;
  }>;
}

function professionalDirectoryQueryInclude(): Prisma.ProfessionalProfileInclude {
  return {
    user: {
      select: {
        id: true,
        fullName: true,
        firstName: true,
        lastName: true,
        email: true
      }
    },
    availabilitySlots: {
      where: {
        startsAt: { gte: new Date() },
        isBlocked: false
      },
      orderBy: { startsAt: "asc" },
      take: DIRECTORY_AVAILABILITY_SLOT_FETCH
    }
  };
}

type ProfessionalProfileDirectoryRow = Prisma.ProfessionalProfileGetPayload<{
  include: ReturnType<typeof professionalDirectoryQueryInclude>;
}>;

async function loadProfessionalProfilesForDirectory(where: Prisma.ProfessionalProfileWhereInput): Promise<ProfessionalProfileDirectoryRow[]> {
  return prisma.professionalProfile.findMany({
    where,
    include: professionalDirectoryQueryInclude(),
    orderBy: { createdAt: "asc" }
  });
}

/**
 * Cotización USD/ARS para derivar `sessionPriceArs` cuando el profesional sólo
 * tiene precio en USD, de modo que el paciente AR siempre vea pesos.
 *
 * Usa el wrapper resiliente: aún si los proveedores externos fallan, devuelve
 * un valor operativo (último éxito en memoria → snapshot DB → env → hardcoded).
 * Sólo retorna `null` si la propia query a DB del wrapper resiliente falla,
 * lo que es muy improbable.
 */
async function loadUsdArsRateOrNull(): Promise<number | null> {
  try {
    return await getResilientUsdArsRate();
  } catch (error) {
    console.warn("USD/ARS resilient rate unavailable", error);
    return null;
  }
}

/** Moneda canónica que se debe registrar/mostrar para un mercado. */
function currencyForMarket(market: Market): string {
  switch (market) {
    case "AR":
      return "ars";
    case "BR":
      return "brl";
    case "ES":
      return "eur";
    case "US":
    default:
      return "usd";
  }
}

async function materializeDirectoryProfessionals(professionals: ProfessionalProfileDirectoryRow[]): Promise<DirectoryProfessional[]> {
  const professionalIds = professionals.map((professional) => professional.id);
  if (professionalIds.length === 0) {
    return [];
  }

  const arsPerUsd = await loadUsdArsRateOrNull();

  const now = new Date();
  let vacationRangeEnd = new Date(now);
  for (const professional of professionals) {
    for (const slot of professional.availabilitySlots) {
      if (slot.endsAt.getTime() > vacationRangeEnd.getTime()) {
        vacationRangeEnd = slot.endsAt;
      }
    }
  }
  const vacationRangeStart = new Date(now);
  vacationRangeStart.setHours(0, 0, 0, 0);
  const vacationDaysByPro = await vacationDayKeysByProfessional({
    professionalIds,
    rangeStart: vacationRangeStart,
    rangeEnd: vacationRangeEnd
  });
  const [sessionsByProfessional, completedByProfessional, activePatientPairs, displayConfig] = await Promise.all([
    prisma.booking.groupBy({
      by: ["professionalId"],
      where: {
        professionalId: { in: professionalIds },
        status: { in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] }
      },
      _count: { _all: true }
    }),
    prisma.booking.groupBy({
      by: ["professionalId"],
      where: {
        professionalId: { in: professionalIds },
        status: "COMPLETED"
      },
      _count: { _all: true }
    }),
    prisma.booking.findMany({
      where: {
        professionalId: { in: professionalIds },
        status: { in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] }
      },
      select: {
        professionalId: true,
        patientId: true
      },
      distinct: ["professionalId", "patientId"]
    }),
    prisma.systemConfig.findUnique({ where: { key: PROFESSIONAL_DISPLAY_OVERRIDES_KEY } })
  ]);

  const displayOverrides = parseProfessionalDisplayOverrides(displayConfig?.value);
  const sessionsCountByProfessional = new Map(sessionsByProfessional.map((item) => [item.professionalId, item._count._all]));
  const completedCountByProfessional = new Map(completedByProfessional.map((item) => [item.professionalId, item._count._all]));
  const activePatientsByProfessional = new Map<string, number>();

  activePatientPairs.forEach((item) => {
    activePatientsByProfessional.set(
      item.professionalId,
      (activePatientsByProfessional.get(item.professionalId) ?? 0) + 1
    );
  });

  return professionals.map((professional) => {
    const nameParts = resolvedFirstLastFromUserRecord({
      firstName: professional.user.firstName,
      lastName: professional.user.lastName,
      fullName: professional.user.fullName
    });
    return {
    id: professional.id,
    userId: professional.user.id,
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    fullName: professionalPublicListingLabel({
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      fullNameLegacy: professional.user.fullName
    }),
    title: professional.professionalTitle ?? professional.specialization ?? "Profesional de salud mental",
    specialization: professional.specialization ?? null,
    focusPrimary: focusAreasDisplayLabel(normalizeFocusAreas(professional.focusAreas, professional.focusPrimary)),
    focusAreas: normalizeFocusAreas(professional.focusAreas, professional.focusPrimary),
    birthCountry: professional.birthCountry ?? null,
    gender: professional.gender ?? null,
    graduationYear: professional.graduationYear ?? null,
    bio: professional.bio ?? professional.shortDescription ?? null,
    therapeuticApproach: professional.therapeuticApproach,
    languages: Array.isArray(professional.languages)
      ? professional.languages.filter((value): value is string => typeof value === "string")
      : [],
    yearsExperience:
      professional.graduationYear != null
        ? yearsExperienceFromGraduationYear(professional.graduationYear)
        : professional.yearsExperience,
    sessionPriceArs: effectiveSessionPriceArs(
      {
        market: professional.market,
        sessionPriceArs: professional.sessionPriceArs,
        sessionPriceUsd: professional.sessionPriceUsd
      },
      arsPerUsd
    ),
    sessionPriceUsd: professional.sessionPriceUsd,
    photoUrl: professional.photoUrl,
    videoUrl: professional.videoUrl,
    stripeVerified: professional.stripeVerified,
    cancellationHours: professional.cancellationHours,
    compatibility: compatibilityScore(professional.id),
    sessionDurationMinutes: displayOverrides[professional.id]?.sessionDurationMinutes ?? 50,
    activePatientsCount: displayOverrides[professional.id]?.activePatientsCount ?? (activePatientsByProfessional.get(professional.id) ?? 0),
    completedSessionsCount: displayOverrides[professional.id]?.completedSessionsCount ?? (completedCountByProfessional.get(professional.id) ?? 0),
    sessionsCount: displayOverrides[professional.id]?.sessionsCount ?? (sessionsCountByProfessional.get(professional.id) ?? 0),
    ratingAverage: displayOverrides[professional.id]?.ratingAverage ?? null,
    reviewsCount: displayOverrides[professional.id]?.reviewsCount ?? 0,
    slots: professional.availabilitySlots
      .filter((slot) => {
        const blockedDays = vacationDaysByPro.get(professional.id);
        if (!blockedDays || blockedDays.size === 0) {
          return true;
        }
        const dayKey = slot.startsAt.toISOString().slice(0, 10);
        return !blockedDays.has(dayKey);
      })
      .slice(0, DIRECTORY_AVAILABILITY_SLOT_TAKE)
      .map((slot) => ({
        id: slot.id,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt
      }))
    };
  });
}

async function listDirectoryProfessionals(): Promise<DirectoryProfessional[]> {
  const professionals = await loadProfessionalProfilesForDirectory({
    visible: true,
    registrationApproval: ProfessionalRegistrationApproval.APPROVED
  });
  return materializeDirectoryProfessionals(professionals);
}

/** Profesionales por id sin filtro de directorio (p. ej. asignado a un paciente pero no visible/aprobado). */
async function directoryProfessionalsForIds(ids: string[]): Promise<DirectoryProfessional[]> {
  const unique = [...new Set(ids.filter((id) => id.length > 0))];
  if (unique.length === 0) {
    return [];
  }
  const professionals = await loadProfessionalProfilesForDirectory({ id: { in: unique } });
  return materializeDirectoryProfessionals(professionals);
}

export const profilesRouter = Router();

profilesRouter.get("/professionals", async (_req, res) => {
  try {
    const professionals = await listDirectoryProfessionals();
    return res.json({
      professionals
    });
  } catch (error) {
    console.error("GET /profiles/professionals failed", error);
    return res.status(500).json({ error: prismaErrorUserMessage(error) });
  }
});

profilesRouter.get("/me/matching", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const queryParsed = matchingQuerySchema.safeParse(req.query);
  if (!queryParsed.success) {
    return res.status(400).json({ error: "Invalid matching query", details: queryParsed.error.flatten() });
  }
  const language: MatchingLanguage = queryParsed.data.language ?? "es";

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PATIENT" || !actor.patientProfileId) {
    return res.status(403).json({ error: "Only patients can access matching" });
  }

  let patientIntake;
  let professionals: DirectoryProfessional[];
  let assignmentConfig: { value: Prisma.JsonValue } | null;
  try {
    [patientIntake, professionals, assignmentConfig] = await Promise.all([
      prisma.patientIntake.findUnique({ where: { patientId: actor.patientProfileId } }),
      listDirectoryProfessionals(),
      prisma.systemConfig.findUnique({ where: { key: PATIENT_ACTIVE_ASSIGNMENTS_KEY } })
    ]);
  } catch (error) {
    console.error("GET /profiles/me/matching failed", error);
    return res.status(500).json({ error: prismaErrorUserMessage(error) });
  }

  const assignments = parsePatientAssignments(assignmentConfig?.value);
  const assignedProfessionalId = assignments[actor.patientProfileId] ?? null;
  if (assignedProfessionalId && !professionals.some((row) => row.id === assignedProfessionalId)) {
    const extraRows = await directoryProfessionalsForIds([assignedProfessionalId]);
    const extra = extraRows[0];
    if (extra) {
      professionals = [extra, ...professionals];
    }
  }

  const rankedProfessionals = professionals
    .map((professional) => {
      const match = rankProfessionalMatch({
        professional: {
          id: professional.id,
          fullName: professional.fullName,
          title: professional.title,
          specialization: professional.specialization,
          focusPrimary: professional.focusPrimary,
          bio: professional.bio,
          therapeuticApproach: professional.therapeuticApproach,
          languages: professional.languages,
          yearsExperience: professional.yearsExperience,
          ratingAverage: professional.ratingAverage,
          compatibilityBase: professional.compatibility,
          slots: professional.slots,
          gender: professional.gender,
          graduationYear: professional.graduationYear,
          focusAreas: professional.focusAreas
        },
        intakeAnswers: patientIntake?.answers ?? {},
        language
      });

      return {
        ...professional,
        matchScore: match.score,
        matchReasons: match.reasons,
        matchedTopics: match.matchedTopics,
        suggestedSlots: match.suggestedSlots
      };
    })
    .sort((left, right) => right.matchScore - left.matchScore);

  return res.json({
    professionals: rankedProfessionals
  });
});

profilesRouter.get("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const actor = await getActorContext(req.auth);
  if (!actor) {
    return res.status(404).json({ error: "User not found" });
  }

  if (actor.role === "PATIENT" && actor.patientProfileId) {
    const [patient, creditSummary, assignmentConfig, triageConfig] = await Promise.all([
      prisma.patientProfile.findUnique({
        where: { id: actor.patientProfileId },
        include: {
          user: { select: { avatarUrl: true } },
          intake: true,
          purchases: {
            orderBy: { purchasedAt: "desc" },
            take: 10,
            include: { sessionPackage: true }
          }
        }
      }),
      prisma.patientPackagePurchase.aggregate({
        where: { patientId: actor.patientProfileId },
        _sum: {
          totalCredits: true,
          remainingCredits: true
        }
      }),
      prisma.systemConfig.findUnique({ where: { key: PATIENT_ACTIVE_ASSIGNMENTS_KEY } }),
      prisma.systemConfig.findUnique({ where: { key: PATIENT_INTAKE_TRIAGE_KEY } })
    ]);
    const assignments = parsePatientAssignments(assignmentConfig?.value);
    const triageByPatient = parsePatientIntakeTriage(triageConfig?.value);
    const activeProfessionalId = patient ? assignments[patient.id] ?? null : null;
    const intakeRiskLevel = patient?.intake?.riskLevel ?? null;
    const intakeTriageDecision = patient
      ? resolveIntakeTriageDecision(triageByPatient, patient.id, intakeRiskLevel)
      : null;
    const intakeRiskBlocked = Boolean(intakeRiskLevel && intakeRiskLevel !== "low" && intakeTriageDecision !== "approved");

    const activeProfessional = activeProfessionalId
      ? await prisma.professionalProfile.findUnique({
          where: { id: activeProfessionalId },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        })
      : null;

    return res.json({
      role: actor.role,
      profile: {
        id: patient?.id,
        avatarUrl: patient?.user?.avatarUrl ?? null,
        market: patient?.market ?? "AR",
        residencyCountry: patient?.residencyCountry ?? null,
        timezone: patient?.timezone,
        lastSeenTimezone: patient?.lastSeenTimezone ?? null,
        status: patient?.status,
        intakeRiskLevel,
        intakeTriageDecision,
        intakeRiskBlocked,
        intakeCompletedAt: patient?.intake?.createdAt ?? null,
        latestPackage: patient?.purchases[0]
          ? {
              id: patient.purchases[0].id,
              name: patient.purchases[0].sessionPackage.name,
              remainingCredits: creditSummary._sum.remainingCredits ?? patient.purchases[0].remainingCredits,
              totalCredits: creditSummary._sum.totalCredits ?? patient.purchases[0].totalCredits,
              purchasedAt: patient.purchases[0].purchasedAt
            }
          : null,
        recentPackages: (patient?.purchases ?? []).map((purchase) => ({
          id: purchase.id,
          name: purchase.sessionPackage.name,
          credits: purchase.packageCreditsSnapshot ?? purchase.sessionPackage.credits,
          purchasedAt: purchase.purchasedAt,
          priceCents: purchase.packagePriceCentsSnapshot ?? null,
          currency: purchase.packageCurrencySnapshot
            ? String(purchase.packageCurrencySnapshot).toLowerCase()
            : null
        })),
        activeProfessional: activeProfessional
          ? (() => {
              const apName = resolvedFirstLastFromUserRecord({
                firstName: activeProfessional.user.firstName,
                lastName: activeProfessional.user.lastName,
                fullName: activeProfessional.user.fullName
              });
              return {
                id: activeProfessional.id,
                userId: activeProfessional.user.id,
                firstName: apName.firstName,
                lastName: apName.lastName,
                fullName: professionalPublicListingLabel({
                  firstName: apName.firstName,
                  lastName: apName.lastName,
                  fullNameLegacy: activeProfessional.user.fullName
                }),
                email: activeProfessional.user.email,
                photoUrl: activeProfessional.photoUrl ?? null
              };
            })()
          : null
      }
    });
  }

  if (actor.role === "PROFESSIONAL" && actor.professionalProfileId) {
    const professional: any = await prisma.professionalProfile.findUnique({
      where: { id: actor.professionalProfileId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        diplomas: {
          orderBy: { orderIndex: "asc" }
        }
      }
    });

    const professionalNameParts = professional
      ? resolvedFirstLastFromUserRecord({
          firstName: professional.user.firstName,
          lastName: professional.user.lastName,
          fullName: professional.user.fullName
        })
      : null;

    return res.json({
      role: actor.role,
      profile: professional
        ? {
            id: professional.id,
            userId: professional.user.id,
            fullName: professional.user.fullName,
            firstName: (professionalNameParts ?? { firstName: "", lastName: "" }).firstName,
            lastName: (professionalNameParts ?? { firstName: "", lastName: "" }).lastName,
            email: professional.user.email,
            visible: professional.visible,
            professionalTitle: professional.professionalTitle,
            specialization: professional.specialization,
            experienceBand: professional.experienceBand,
            practiceBand: professional.practiceBand,
            gender: professional.gender,
            birthCountry: professional.birthCountry,
            residencyCountry: professional.residencyCountry ?? null,
            market: professional.market,
            focusPrimary: focusAreasDisplayLabel(normalizeFocusAreas(professional.focusAreas, professional.focusPrimary)),
            focusAreas: normalizeFocusAreas(professional.focusAreas, professional.focusPrimary),
            languages: Array.isArray(professional.languages) ? professional.languages : [],
            bio: professional.bio,
            shortDescription: professional.shortDescription,
            therapeuticApproach: professional.therapeuticApproach,
            graduationYear: professional.graduationYear,
            registrationApproval: professional.registrationApproval,
            yearsExperience:
              professional.graduationYear != null
                ? yearsExperienceFromGraduationYear(professional.graduationYear)
                : professional.yearsExperience,
            sessionPriceArs: professional.sessionPriceArs,
            sessionPriceUsd: professional.sessionPriceUsd,
            discount4: professional.discount4,
            discount8: professional.discount8,
            discount12: professional.discount12,
            photoUrl: professional.photoUrl,
            videoUrl: professional.videoUrl,
            videoCoverUrl: professional.videoCoverUrl,
            stripeDocUrl: professional.stripeDocUrl,
            stripeVerified: professional.stripeVerified,
            stripeVerificationStarted: professional.stripeVerificationStarted,
            cancellationHours: professional.cancellationHours,
            timezone: professional.timezone,
            lastSeenTimezone: professional.lastSeenTimezone ?? null,
            diplomas: professional.diplomas.map((diploma: any) => ({
              id: diploma.id,
              institution: diploma.institution,
              degree: diploma.degree,
              startYear: diploma.startYear,
              graduationYear: diploma.graduationYear,
              documentUrl: diploma.documentUrl
            }))
          }
        : null
    });
  }

  return res.json({
    role: actor.role,
    profile: null
  });
});

profilesRouter.patch("/me/timezone", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = syncTimezoneSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid timezone payload", details: parsed.error.flatten() });
  }

  const actor = await getActorContext(req.auth);
  if (!actor) {
    return res.status(404).json({ error: "User not found" });
  }

  const timezone = sanitizeTimezone(parsed.data.timezone);
  const persistPreference = parsed.data.persistPreference === true;

  if (actor.role === "PATIENT" && actor.patientProfileId) {
    const updated = await prisma.patientProfile.update({
      where: { id: actor.patientProfileId },
      data: {
        lastSeenTimezone: timezone,
        ...(persistPreference ? { timezone } : {})
      },
      select: {
        id: true,
        timezone: true,
        lastSeenTimezone: true
      }
    });

    return res.json({ role: actor.role, profile: updated });
  }

  if (actor.role === "PROFESSIONAL" && actor.professionalProfileId) {
    const updated = await prisma.professionalProfile.update({
      where: { id: actor.professionalProfileId },
      data: {
        lastSeenTimezone: timezone,
        ...(persistPreference ? { timezone } : {})
      },
      select: {
        id: true,
        timezone: true,
        lastSeenTimezone: true
      }
    });

    return res.json({ role: actor.role, profile: updated });
  }

  return res.status(403).json({ error: "Role cannot sync timezone" });
});

profilesRouter.patch("/me/market", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = patchPatientMarketSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PATIENT" || !actor.patientProfileId) {
    return res.status(403).json({ error: "Only patients can update market" });
  }

  const updated = await prisma.patientProfile.update({
    where: { id: actor.patientProfileId },
    data: { market: parsed.data.market },
    select: { id: true, market: true }
  });

  return res.json({ role: "PATIENT" as const, profile: updated });
});

profilesRouter.patch("/me/active-professional", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = updateActiveProfessionalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PATIENT" || !actor.patientProfileId) {
    return res.status(403).json({ error: "Only patients can update active professional" });
  }

  const patient = await prisma.patientProfile.findUnique({
    where: { id: actor.patientProfileId },
    select: { id: true }
  });
  if (!patient) {
    return res.status(404).json({ error: "Patient profile not found" });
  }

  let activeProfessional: {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
  } | null = null;

  if (parsed.data.professionalId) {
    const professional = await prisma.professionalProfile.findUnique({
      where: { id: parsed.data.professionalId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!professional) {
      return res.status(404).json({ error: "Professional not found" });
    }

    const patchApName = resolvedFirstLastFromUserRecord({
      firstName: professional.user.firstName,
      lastName: professional.user.lastName,
      fullName: professional.user.fullName
    });
    activeProfessional = {
      id: professional.id,
      userId: professional.user.id,
      firstName: patchApName.firstName,
      lastName: patchApName.lastName,
      fullName: professionalPublicListingLabel({
        firstName: patchApName.firstName,
        lastName: patchApName.lastName,
        fullNameLegacy: professional.user.fullName
      }),
      email: professional.user.email
    };
  }

  const assignmentConfig = await prisma.systemConfig.findUnique({ where: { key: PATIENT_ACTIVE_ASSIGNMENTS_KEY } });
  const assignments = parsePatientAssignments(assignmentConfig?.value);

  if (activeProfessional) {
    assignments[patient.id] = activeProfessional.id;
  } else {
    delete assignments[patient.id];
  }

  await prisma.systemConfig.upsert({
    where: { key: PATIENT_ACTIVE_ASSIGNMENTS_KEY },
    update: { value: assignments },
    create: {
      key: PATIENT_ACTIVE_ASSIGNMENTS_KEY,
      value: assignments
    }
  });

  return res.json({
    patientId: patient.id,
    activeProfessional
  });
});

profilesRouter.post("/me/purchase-package", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = purchasePackageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PATIENT" || !actor.patientProfileId) {
    return res.status(403).json({ error: "Only patients can purchase session packages" });
  }

  const patient = await prisma.patientProfile.findUnique({
    where: { id: actor.patientProfileId },
    select: { id: true, market: true }
  });
  if (!patient) {
    return res.status(404).json({ error: "Patient profile not found" });
  }

  const sessionPackage = await prisma.sessionPackage.findUnique({
    where: { id: parsed.data.packageId },
    select: {
      id: true,
      name: true,
      credits: true,
      active: true,
      priceCents: true,
      discountPercent: true,
      currency: true,
      professionalId: true,
      market: true
    }
  });
  if (!sessionPackage) {
    return res.status(404).json({ error: "Session package not found" });
  }
  if (sessionPackage.market !== patient.market) {
    return res.status(403).json({ error: "Package is not available in this patient's market" });
  }
  if (!sessionPackage.active) {
    return res.status(409).json({ error: "Session package is not active" });
  }

  const [assignmentConfig, packageProfessional, financeRules] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { key: PATIENT_ACTIVE_ASSIGNMENTS_KEY } }),
    sessionPackage.professionalId
      ? prisma.professionalProfile.findUnique({
          where: { id: sessionPackage.professionalId },
          select: {
            id: true,
            market: true,
            sessionPriceArs: true,
            sessionPriceUsd: true,
            discount4: true,
            discount8: true,
            discount12: true
          }
        })
      : Promise.resolve(null),
    getFinanceRules()
  ]);

  const assignments = parsePatientAssignments(assignmentConfig?.value);
  const activeProfessionalId = assignments[patient.id] ?? null;
  const activeProfessional = activeProfessionalId
    ? await prisma.professionalProfile.findUnique({
        where: { id: activeProfessionalId },
        select: {
          id: true,
          market: true,
          sessionPriceArs: true,
          sessionPriceUsd: true,
          discount4: true,
          discount8: true,
          discount12: true
        }
      })
    : null;

  const pricingProfessional = activeProfessional ?? packageProfessional;
  const arsPerUsdForPurchase = patient.market === "AR" ? await loadUsdArsRateOrNull() : null;
  const sessionListPriceMajor =
    pricingProfessional != null
      ? listPriceMajorUnitsForPackageMarket(pricingProfessional, patient.market, arsPerUsdForPurchase)
      : null;
  const pricing = resolvePackagePricing({
    credits: sessionPackage.credits,
    fallbackPriceCents: sessionPackage.priceCents,
    fallbackDiscountPercent: sessionPackage.discountPercent,
    sessionListPriceMajor,
    profileDiscount4: pricingProfessional?.discount4,
    profileDiscount8: pricingProfessional?.discount8,
    profileDiscount12: pricingProfessional?.discount12
  });

  const purchase = await prisma.$transaction(async (tx) => {
    const creditSummary = await tx.patientPackagePurchase.aggregate({
      where: { patientId: patient.id },
      _sum: {
        remainingCredits: true
      }
    });
    const carryOverCredits = creditSummary._sum.remainingCredits ?? 0;

    if (carryOverCredits > 0) {
      await tx.patientPackagePurchase.updateMany({
        where: {
          patientId: patient.id,
          remainingCredits: { gt: 0 }
        },
        data: {
          remainingCredits: 0
        }
      });
    }

    const nextWalletCredits = carryOverCredits + sessionPackage.credits;
    const checkoutSessionId = [
      "manual-checkout",
      patient.id,
      Date.now().toString(36),
      Math.random().toString(36).slice(2, 8)
    ].join("-");

    const createdPurchase = await tx.patientPackagePurchase.create({
      data: {
        patientId: patient.id,
        packageId: sessionPackage.id,
        stripeCheckoutSessionId: checkoutSessionId,
        totalCredits: nextWalletCredits,
        remainingCredits: nextWalletCredits,
        packageNameSnapshot: sessionPackage.name,
        packageCreditsSnapshot: sessionPackage.credits,
        packageListPriceCentsSnapshot: pricing.listPriceCents,
        packagePriceCentsSnapshot: pricing.priceCents,
        packageDiscountPercentSnapshot: pricing.discountPercent,
        packageCurrencySnapshot: currencyForMarket(patient.market),
        platformCommissionPercentSnapshot: financeRules.platformCommissionPercent,
        trialPlatformPercentSnapshot: financeRules.trialPlatformPercent,
        professionalIdSnapshot: pricingProfessional?.id ?? null
      }
    });

    await tx.creditLedger.create({
      data: {
        patientId: patient.id,
        bookingId: null,
        type: "PACKAGE_PURCHASE",
        amount: sessionPackage.credits,
        note: `Portal package purchase ${createdPurchase.id}`
      }
    });

    return createdPurchase;
  });

  return res.status(201).json({
    purchase: {
      id: purchase.id,
      packageId: sessionPackage.id,
      packageName: sessionPackage.name,
      packagePriceCents: pricing.priceCents,
      packageDiscountPercent: pricing.discountPercent,
      packageCurrency: sessionPackage.currency?.toLowerCase() ?? "usd",
      totalCredits: purchase.totalCredits,
      remainingCredits: purchase.remainingCredits,
      purchasedAt: purchase.purchasedAt
    }
  });
});

profilesRouter.post("/me/purchase-individual-sessions", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = purchaseIndividualSessionsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PATIENT" || !actor.patientProfileId) {
    return res.status(403).json({ error: "Only patients can purchase sessions" });
  }

  const patient = await prisma.patientProfile.findUnique({
    where: { id: actor.patientProfileId },
    select: { id: true, market: true }
  });
  if (!patient) {
    return res.status(404).json({ error: "Patient profile not found" });
  }

  const sessionCount = parsed.data.sessionCount;

  const unitPackage = await getOrCreateGlobalIndividualSessionPackage(patient.market);

  const [assignmentConfig, financeRules] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { key: PATIENT_ACTIVE_ASSIGNMENTS_KEY } }),
    getFinanceRules()
  ]);

  const assignments = parsePatientAssignments(assignmentConfig?.value);
  const activeProfessionalId = assignments[patient.id] ?? null;
  const activeProfessional = activeProfessionalId
    ? await prisma.professionalProfile.findUnique({
        where: { id: activeProfessionalId },
        select: {
          id: true,
          market: true,
          sessionPriceArs: true,
          sessionPriceUsd: true,
          discount4: true,
          discount8: true,
          discount12: true
        }
      })
    : null;

  const arsPerUsdForIndividual = patient.market === "AR" ? await loadUsdArsRateOrNull() : null;
  const sessionListPriceMajor =
    activeProfessional != null
      ? listPriceMajorUnitsForPackageMarket(activeProfessional, patient.market, arsPerUsdForIndividual)
      : null;
  const pricing = resolvePackagePricing({
    credits: 1,
    fallbackPriceCents: unitPackage.priceCents,
    fallbackDiscountPercent: unitPackage.discountPercent,
    sessionListPriceMajor,
    profileDiscount4: activeProfessional?.discount4,
    profileDiscount8: activeProfessional?.discount8,
    profileDiscount12: activeProfessional?.discount12
  });

  const totalListPriceCents = pricing.listPriceCents * sessionCount;
  const totalPriceCents = pricing.priceCents * sessionCount;
  const displayName = `Sesiones individuales (×${sessionCount})`;

  const purchase = await prisma.$transaction(async (tx) => {
    const creditSummary = await tx.patientPackagePurchase.aggregate({
      where: { patientId: patient.id },
      _sum: {
        remainingCredits: true
      }
    });
    const carryOverCredits = creditSummary._sum.remainingCredits ?? 0;

    if (carryOverCredits > 0) {
      await tx.patientPackagePurchase.updateMany({
        where: {
          patientId: patient.id,
          remainingCredits: { gt: 0 }
        },
        data: {
          remainingCredits: 0
        }
      });
    }

    const nextWalletCredits = carryOverCredits + sessionCount;
    const checkoutSessionId = [
      "manual-individual",
      patient.id,
      Date.now().toString(36),
      Math.random().toString(36).slice(2, 8)
    ].join("-");

    const createdPurchase = await tx.patientPackagePurchase.create({
      data: {
        patientId: patient.id,
        packageId: unitPackage.id,
        stripeCheckoutSessionId: checkoutSessionId,
        totalCredits: nextWalletCredits,
        remainingCredits: nextWalletCredits,
        packageNameSnapshot: displayName,
        packageCreditsSnapshot: sessionCount,
        packageListPriceCentsSnapshot: totalListPriceCents,
        packagePriceCentsSnapshot: totalPriceCents,
        packageDiscountPercentSnapshot: pricing.discountPercent,
        packageCurrencySnapshot: currencyForMarket(patient.market),
        platformCommissionPercentSnapshot: financeRules.platformCommissionPercent,
        trialPlatformPercentSnapshot: financeRules.trialPlatformPercent,
        professionalIdSnapshot: activeProfessional?.id ?? null
      }
    });

    await tx.creditLedger.create({
      data: {
        patientId: patient.id,
        bookingId: null,
        type: "PACKAGE_PURCHASE",
        amount: sessionCount,
        note: `Individual sessions x${sessionCount} ${createdPurchase.id}`
      }
    });

    return createdPurchase;
  });

  return res.status(201).json({
    purchase: {
      id: purchase.id,
      packageId: unitPackage.id,
      packageName: displayName,
      packagePriceCents: totalPriceCents,
      packageDiscountPercent: pricing.discountPercent,
      packageCurrency: unitPackage.currency?.toLowerCase() ?? "usd",
      totalCredits: purchase.totalCredits,
      remainingCredits: purchase.remainingCredits,
      purchasedAt: purchase.purchasedAt
    }
  });
});

profilesRouter.post("/me/intake", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = submitIntakeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid intake payload", details: parsed.error.flatten() });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PATIENT" || !actor.patientProfileId) {
    return res.status(403).json({ error: "Only patients can submit intake" });
  }

  const existing = await prisma.patientIntake.findUnique({
    where: { patientId: actor.patientProfileId }
  });

  if (existing) {
    return res.status(409).json({ error: "Intake already completed" });
  }

  const riskLevel = evaluateIntakeRiskLevel(parsed.data.answers);

  let intake;
  try {
    intake = await prisma.patientIntake.create({
      data: {
        patientId: actor.patientProfileId,
        riskLevel,
        answers: parsed.data.answers
      }
    });
  } catch (error) {
    console.error("POST /profiles/me/intake failed", error);
    if (isPrismaUniqueViolation(error)) {
      return res.status(409).json({ error: "Intake already completed" });
    }
    return res.status(500).json({ error: prismaErrorUserMessage(error) });
  }

  if (riskLevel !== "low") {
    const triageConfig = await prisma.systemConfig.findUnique({ where: { key: PATIENT_INTAKE_TRIAGE_KEY } });
    const triageByPatient = parsePatientIntakeTriage(triageConfig?.value);
    triageByPatient[actor.patientProfileId] = {
      decision: "pending",
      updatedAt: new Date().toISOString(),
      note: "Creado automaticamente por intake de riesgo"
    };
    await prisma.systemConfig.upsert({
      where: { key: PATIENT_INTAKE_TRIAGE_KEY },
      update: { value: triageByPatient },
      create: { key: PATIENT_INTAKE_TRIAGE_KEY, value: triageByPatient }
    });
  } else {
    const triageConfig = await prisma.systemConfig.findUnique({ where: { key: PATIENT_INTAKE_TRIAGE_KEY } });
    const triageByPatient = parsePatientIntakeTriage(triageConfig?.value);
    if (triageByPatient[actor.patientProfileId]) {
      delete triageByPatient[actor.patientProfileId];
      await prisma.systemConfig.upsert({
        where: { key: PATIENT_INTAKE_TRIAGE_KEY },
        update: { value: triageByPatient },
        create: { key: PATIENT_INTAKE_TRIAGE_KEY, value: triageByPatient }
      });
    }
  }

  const derivedMarket = marketFromResidencyCountry(parsed.data.residencyCountry);
  await prisma.patientProfile.update({
    where: { id: actor.patientProfileId },
    data: {
      residencyCountry: parsed.data.residencyCountry,
      market: derivedMarket
    }
  });

  return res.status(201).json({
    intake: {
      id: intake.id,
      riskLevel: intake.riskLevel,
      completedAt: intake.createdAt
    },
    market: derivedMarket,
    residencyCountry: parsed.data.residencyCountry
  });
});

profilesRouter.patch("/professional/:professionalId/public-profile", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = updatePublicProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid profile payload", details: parsed.error.flatten() });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PROFESSIONAL" || !actor.professionalProfileId) {
    return res.status(403).json({ error: "Only professionals can update this profile" });
  }

  if (req.params.professionalId !== actor.professionalProfileId) {
    return res.status(403).json({ error: "You can only update your own profile" });
  }

  const professionalId = actor.professionalProfileId;

  const existingProfile = await prisma.professionalProfile.findUnique({
    where: { id: professionalId },
    select: { residencyCountry: true, market: true }
  });
  if (!existingProfile) {
    return res.status(404).json({ error: "Professional profile not found" });
  }

  const financeRules = await getFinanceRules();

  const incomingUsd = parsed.data.sessionPriceUsd;
  const hasPositiveUsd =
    incomingUsd !== undefined && incomingUsd !== null && incomingUsd > 0;

  let sessionPriceArsResolved: number | null | undefined = parsed.data.sessionPriceArs;

  if (hasPositiveUsd) {
    const usdErr = validateProfessionalSessionListUsd(incomingUsd, financeRules);
    if (usdErr) {
      return res.status(400).json({
        error: usdErr.message,
        sessionPriceMin: usdErr.sessionPriceMin,
        sessionPriceMax: usdErr.sessionPriceMax,
        sessionPriceCurrency: usdErr.currencyCode
      });
    }

    /**
     * Para derivar `sessionPriceArs` desde el USD usamos el wrapper resiliente:
     * si los proveedores externos (Bluelytics / DolarApi) están caídos en este
     * momento, igual obtenemos un rate operativo (último éxito en memoria,
     * snapshot DB, env o hardcoded). Bloquear el guardado del perfil completo
     * por un FX externo intermitente era frustrante para el profesional y le
     * impedía actualizar bio, focus, etc. Si el rate está stale, el endpoint
     * público re-deriva con el rate vigente al momento de mostrar precios.
     */
    let rate: number;
    try {
      rate = await getResilientUsdArsRate();
    } catch (error) {
      console.warn("[professional/save] resilient FX failed unexpectedly", error);
      return res.status(503).json({
        error: "Could not load USD→ARS exchange rate. Please try again shortly."
      });
    }

    const computedArs = roundSessionPriceArsFromUsd(incomingUsd, rate);
    const arsErr = validateProfessionalSessionListArs(computedArs);
    if (arsErr) {
      return res.status(400).json({
        error: `The ARS list price derived from your USD amount (${computedArs}) is outside the allowed range (${arsErr.sessionPriceMin}–${arsErr.sessionPriceMax}). Adjust your USD price.`,
        sessionPriceMin: arsErr.sessionPriceMin,
        sessionPriceMax: arsErr.sessionPriceMax,
        sessionPriceCurrency: arsErr.currencyCode,
        derivedSessionPriceArs: computedArs
      });
    }

    sessionPriceArsResolved = computedArs;
  } else if (parsed.data.sessionPriceArs !== undefined && parsed.data.sessionPriceArs !== null) {
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

  const marketSync =
    parsed.data.residencyCountry !== undefined
      ? { market: marketFromResidencyCountry(parsed.data.residencyCountry ?? undefined) }
      : {};
  const {
    diplomas,
    languages,
    timezone,
    focusAreas,
    focusPrimary,
    graduationYear,
    visible,
    sessionPriceArs: _incomingSessionPriceArsIgnored,
    ...restProfile
  } = parsed.data;

  const graduationPatch: { graduationYear?: number | null; yearsExperience?: number } = {};
  if (graduationYear !== undefined) {
    if (graduationYear === null) {
      graduationPatch.graduationYear = null;
    } else {
      graduationPatch.graduationYear = graduationYear;
      graduationPatch.yearsExperience = yearsExperienceFromGraduationYear(graduationYear);
    }
  }

  const languagesUpdate =
    languages === undefined
      ? undefined
      : languages === null
        ? Prisma.JsonNull
        : languages;
  const timezoneUpdate = timezone === undefined ? undefined : sanitizeTimezone(timezone);

  const focusUpdates: {
    focusAreas?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
    focusPrimary?: string | null;
  } = {};
  if (focusAreas !== undefined) {
    focusUpdates.focusAreas = focusAreas.length > 0 ? focusAreas : Prisma.JsonNull;
    focusUpdates.focusPrimary = focusAreasDisplayLabel(focusAreas);
  } else if (focusPrimary !== undefined) {
    focusUpdates.focusPrimary = focusPrimary;
    if (focusPrimary === null) {
      focusUpdates.focusAreas = Prisma.JsonNull;
    } else {
      const parts = focusPrimary
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      focusUpdates.focusAreas = parts.length > 0 ? parts : Prisma.JsonNull;
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const before = await tx.professionalProfile.findUnique({
      where: { id: professionalId },
      select: { registrationApproval: true }
    });

    const visibleUpdate: { visible?: boolean } = {};
    if (visible !== undefined) {
      if (before?.registrationApproval === ProfessionalRegistrationApproval.APPROVED) {
        visibleUpdate.visible = visible;
      } else if (visible === false) {
        visibleUpdate.visible = false;
      }
    }

    const profile = await tx.professionalProfile.update({
      where: { id: professionalId },
      data: {
        ...restProfile,
        ...(sessionPriceArsResolved !== undefined ? { sessionPriceArs: sessionPriceArsResolved } : {}),
        ...marketSync,
        ...graduationPatch,
        ...visibleUpdate,
        ...focusUpdates,
        ...(languagesUpdate !== undefined ? { languages: languagesUpdate } : {}),
        ...(timezoneUpdate !== undefined ? { timezone: timezoneUpdate } : {})
      }
    });

    if (diplomas) {
      await tx.professionalDiploma.deleteMany({
        where: { professionalId }
      });

      if (diplomas.length > 0) {
        await tx.professionalDiploma.createMany({
          data: diplomas.map((diploma, index) => ({
            professionalId,
            institution: diploma.institution,
            degree: diploma.degree,
            startYear: diploma.startYear,
            graduationYear: diploma.graduationYear,
            documentUrl: diploma.documentUrl ?? undefined,
            orderIndex: index
          }))
        });
      }
    }

    return tx.professionalProfile.findUnique({
      where: { id: profile.id },
      include: {
        diplomas: {
          orderBy: { orderIndex: "asc" }
        }
      }
    });
  });

  return res.json({
    message: "Public profile updated",
    profile: updated
  });
});
