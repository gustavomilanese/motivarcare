import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { getActorContext } from "../../lib/actor.js";
import { requireAuth, type AuthenticatedRequest } from "../../lib/auth.js";

const updatePublicProfileSchema = z.object({
  visible: z.boolean().optional(),
  bio: z.string().max(2000).nullable().optional(),
  therapeuticApproach: z.string().max(500).nullable().optional(),
  yearsExperience: z.number().int().min(0).max(80).nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  videoUrl: z.string().url().nullable().optional(),
  cancellationHours: z.number().int().min(0).max(168).optional()
});

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

  return res.json({
    professionals: professionals.map((professional: any) => ({
      id: professional.id,
      userId: professional.user.id,
      fullName: professional.user.fullName,
      title: "Licensed Therapist",
      bio: professional.bio,
      therapeuticApproach: professional.therapeuticApproach,
      yearsExperience: professional.yearsExperience,
      photoUrl: professional.photoUrl,
      videoUrl: professional.videoUrl,
      cancellationHours: professional.cancellationHours,
      compatibility: compatibilityScore(professional.id),
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

    return res.json({
      role: actor.role,
      profile: {
        id: patient?.id,
        timezone: patient?.timezone,
        status: patient?.status,
        intakeRiskLevel: patient?.intake?.riskLevel ?? null,
        latestPackage: patient?.purchases[0]
          ? {
              id: patient.purchases[0].id,
              name: patient.purchases[0].sessionPackage.name,
              remainingCredits: patient.purchases[0].remainingCredits,
              totalCredits: patient.purchases[0].totalCredits,
              purchasedAt: patient.purchases[0].purchasedAt
            }
          : null
      }
    });
  }

  if (actor.role === "PROFESSIONAL" && actor.professionalProfileId) {
    const professional = await prisma.professionalProfile.findUnique({
      where: { id: actor.professionalProfileId },
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

    return res.json({
      role: actor.role,
      profile: professional
        ? {
            id: professional.id,
            userId: professional.user.id,
            fullName: professional.user.fullName,
            email: professional.user.email,
            visible: professional.visible,
            bio: professional.bio,
            therapeuticApproach: professional.therapeuticApproach,
            yearsExperience: professional.yearsExperience,
            photoUrl: professional.photoUrl,
            videoUrl: professional.videoUrl,
            cancellationHours: professional.cancellationHours
          }
        : null
    });
  }

  return res.json({
    role: actor.role,
    profile: null
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

  const updated = await prisma.professionalProfile.update({
    where: { id: actor.professionalProfileId },
    data: parsed.data
  });

  return res.json({
    message: "Public profile updated",
    profile: updated
  });
});
