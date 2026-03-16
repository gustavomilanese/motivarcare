import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { getActorContext } from "../../lib/actor.js";
import { requireAuth, type AuthenticatedRequest } from "../../lib/auth.js";

const PATIENT_ACTIVE_ASSIGNMENTS_KEY = "patient-active-assignments";
const patientAssignmentsSchema = z.record(z.string(), z.string().min(1).nullable());

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

export const profilesRouter = Router();

profilesRouter.get("/professionals", async (_req, res) => {
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
  const [sessionsByProfessional, completedByProfessional, activePatientPairs] = await Promise.all([
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
      : []
  ]);

  const sessionsCountByProfessional = new Map(sessionsByProfessional.map((item) => [item.professionalId, item._count._all]));
  const completedCountByProfessional = new Map(completedByProfessional.map((item) => [item.professionalId, item._count._all]));
  const activePatientsByProfessional = new Map<string, number>();
  activePatientPairs.forEach((item) => {
    activePatientsByProfessional.set(
      item.professionalId,
      (activePatientsByProfessional.get(item.professionalId) ?? 0) + 1
    );
  });

  return res.json({
    professionals: professionals.map((professional: any) => ({
      id: professional.id,
      userId: professional.user.id,
      fullName: professional.user.fullName,
      title: professional.professionalTitle ?? professional.specialization ?? "Profesional de salud mental",
      specialization: professional.specialization ?? null,
      focusPrimary: professional.focusPrimary ?? null,
      birthCountry: professional.birthCountry ?? null,
      bio: professional.bio ?? professional.shortDescription ?? null,
      therapeuticApproach: professional.therapeuticApproach,
      languages: Array.isArray(professional.languages) ? professional.languages : [],
      yearsExperience: professional.yearsExperience,
      sessionPriceUsd: professional.sessionPriceUsd,
      photoUrl: professional.photoUrl,
      videoUrl: professional.videoUrl,
      stripeVerified: professional.stripeVerified,
      cancellationHours: professional.cancellationHours,
      compatibility: compatibilityScore(professional.id),
      sessionDurationMinutes: 50,
      activePatientsCount: activePatientsByProfessional.get(professional.id) ?? 0,
      completedSessionsCount: completedCountByProfessional.get(professional.id) ?? 0,
      sessionsCount: sessionsCountByProfessional.get(professional.id) ?? 0,
      ratingAverage: null,
      reviewsCount: 0,
      slots: professional.availabilitySlots.map((slot: any) => ({
        id: slot.id,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt
      }))
    }))
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

    const assignmentConfig = await prisma.systemConfig.findUnique({ where: { key: PATIENT_ACTIVE_ASSIGNMENTS_KEY } });
    const assignments = parsePatientAssignments(assignmentConfig?.value);
    const activeProfessionalId = patient ? assignments[patient.id] ?? null : null;

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
        intakeRiskLevel: patient?.intake?.riskLevel ?? null,
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
