import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { getActorContext } from "../../lib/actor.js";
import { requireAuth, type AuthenticatedRequest } from "../../lib/auth.js";
import { rankProfessionalMatch, type MatchingLanguage } from "./matching.service.js";

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
  })
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
  focusPrimary: z.string().trim().max(120).nullable().optional(),
  languages: z.array(z.string().trim().min(1).max(40)).max(10).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  shortDescription: z.string().max(250).nullable().optional(),
  therapeuticApproach: z.string().max(500).nullable().optional(),
  yearsExperience: z.number().int().min(0).max(80).nullable().optional(),
  sessionPriceUsd: z.number().int().min(0).max(100000).nullable().optional(),
  discount4: z.number().int().min(0).max(100).nullable().optional(),
  discount12: z.number().int().min(0).max(100).nullable().optional(),
  discount24: z.number().int().min(0).max(100).nullable().optional(),
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

function evaluateIntakeRiskLevel(answers: Record<string, string>): "low" | "medium" | "high" {
  const safetyAnswer = (answers.safetyRisk ?? "").toLowerCase();

  if (["frequently", "frecuentemente", "frequentemente"].includes(safetyAnswer)) {
    return "high";
  }

  if (["sometimes", "a veces", "as vezes"].includes(safetyAnswer)) {
    return "medium";
  }

  return "low";
}

function compatibilityScore(professionalId: string): number {
  const seed = professionalId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return 80 + (seed % 18);
}

interface DirectoryProfessional {
  id: string;
  userId: string;
  fullName: string;
  title: string;
  specialization: string | null;
  focusPrimary: string | null;
  birthCountry: string | null;
  bio: string | null;
  therapeuticApproach: string | null;
  languages: string[];
  yearsExperience: number | null;
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

async function listDirectoryProfessionals(): Promise<DirectoryProfessional[]> {
  const professionals = await prisma.professionalProfile.findMany({
    where: { visible: true },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      },
      availabilitySlots: {
        where: {
          startsAt: { gte: new Date() },
          isBlocked: false
        },
        orderBy: { startsAt: "asc" },
        take: 6
      }
    },
    orderBy: { createdAt: "asc" }
  });

  const professionalIds = professionals.map((professional) => professional.id);
  const [sessionsByProfessional, completedByProfessional, activePatientPairs, displayConfig] = await Promise.all([
    professionalIds.length > 0
      ? prisma.booking.groupBy({
          by: ["professionalId"],
          where: {
            professionalId: { in: professionalIds },
            status: { in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] }
          },
          _count: { _all: true }
        })
      : [],
    professionalIds.length > 0
      ? prisma.booking.groupBy({
          by: ["professionalId"],
          where: {
            professionalId: { in: professionalIds },
            status: "COMPLETED"
          },
          _count: { _all: true }
        })
      : [],
    professionalIds.length > 0
      ? prisma.booking.findMany({
          where: {
            professionalId: { in: professionalIds },
            status: { in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] }
          },
          select: {
            professionalId: true,
            patientId: true
          },
          distinct: ["professionalId", "patientId"]
        })
      : [],
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

  return professionals.map((professional) => ({
    id: professional.id,
    userId: professional.user.id,
    fullName: professional.user.fullName,
    title: professional.professionalTitle ?? professional.specialization ?? "Profesional de salud mental",
    specialization: professional.specialization ?? null,
    focusPrimary: professional.focusPrimary ?? null,
    birthCountry: professional.birthCountry ?? null,
    bio: professional.bio ?? professional.shortDescription ?? null,
    therapeuticApproach: professional.therapeuticApproach,
    languages: Array.isArray(professional.languages)
      ? professional.languages.filter((value): value is string => typeof value === "string")
      : [],
    yearsExperience: professional.yearsExperience,
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
    slots: professional.availabilitySlots.map((slot) => ({
      id: slot.id,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt
    }))
  }));
}

export const profilesRouter = Router();

profilesRouter.get("/professionals", async (_req, res) => {
  const professionals = await listDirectoryProfessionals();
  return res.json({
    professionals
  });
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

  const [patientIntake, professionals] = await Promise.all([
    prisma.patientIntake.findUnique({ where: { patientId: actor.patientProfileId } }),
    listDirectoryProfessionals()
  ]);

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
          slots: professional.slots
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
    const patient = await prisma.patientProfile.findUnique({
      where: { id: actor.patientProfileId },
      include: {
        intake: true,
        purchases: {
          orderBy: { purchasedAt: "desc" },
          take: 1,
          include: { sessionPackage: true }
        }
      }
    });

    const [assignmentConfig, triageConfig] = await Promise.all([
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
              remainingCredits: patient.purchases[0].remainingCredits,
              totalCredits: patient.purchases[0].totalCredits,
              purchasedAt: patient.purchases[0].purchasedAt
            }
          : null,
        activeProfessional: activeProfessional
          ? {
              id: activeProfessional.id,
              userId: activeProfessional.user.id,
              fullName: activeProfessional.user.fullName,
              email: activeProfessional.user.email
            }
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
            email: true
          }
        },
        diplomas: {
          orderBy: { orderIndex: "asc" }
        }
      }
    });

    return res.json({
      role: actor.role,
      profile: professional
        ? {
            id: professional.id,
            userId: professional.user.id,
            fullName: professional.user.fullName,
            email: professional.user.email,
            visible: professional.visible,
            professionalTitle: professional.professionalTitle,
            specialization: professional.specialization,
            experienceBand: professional.experienceBand,
            practiceBand: professional.practiceBand,
            gender: professional.gender,
            birthCountry: professional.birthCountry,
            focusPrimary: professional.focusPrimary,
            languages: Array.isArray(professional.languages) ? professional.languages : [],
            bio: professional.bio,
            shortDescription: professional.shortDescription,
            therapeuticApproach: professional.therapeuticApproach,
            yearsExperience: professional.yearsExperience,
            sessionPriceUsd: professional.sessionPriceUsd,
            discount4: professional.discount4,
            discount12: professional.discount12,
            discount24: professional.discount24,
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
            email: true
          }
        }
      }
    });

    if (!professional) {
      return res.status(404).json({ error: "Professional not found" });
    }

    activeProfessional = {
      id: professional.id,
      userId: professional.user.id,
      fullName: professional.user.fullName,
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

  const intake = await prisma.patientIntake.create({
    data: {
      patientId: actor.patientProfileId,
      riskLevel,
      answers: parsed.data.answers
    }
  });

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

  return res.status(201).json({
    intake: {
      id: intake.id,
      riskLevel: intake.riskLevel,
      completedAt: intake.createdAt
    }
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
  const { diplomas, languages, timezone, ...profileData } = parsed.data;
  const languagesUpdate =
    languages === undefined
      ? undefined
      : languages === null
        ? Prisma.JsonNull
        : languages;
  const timezoneUpdate = timezone === undefined ? undefined : sanitizeTimezone(timezone);

  const updated = await prisma.$transaction(async (tx) => {
    const profile = await tx.professionalProfile.update({
      where: { id: professionalId },
      data: {
        ...profileData,
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
