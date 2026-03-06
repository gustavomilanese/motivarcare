import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { getActorContext } from "../../lib/actor.js";
import { requireAuth, type AuthenticatedRequest } from "../../lib/auth.js";

const createSlotSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  isBlocked: z.boolean().default(false),
  source: z.string().min(2).max(32).optional()
});

const listSlotsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

export const availabilityRouter = Router();

availabilityRouter.get("/me/slots", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PROFESSIONAL" || !actor.professionalProfileId) {
    return res.status(403).json({ error: "Only professionals can view this endpoint" });
  }

  const slots = await prisma.availabilitySlot.findMany({
    where: { professionalId: actor.professionalProfileId },
    orderBy: { startsAt: "asc" }
  });

  return res.json({
    professionalId: actor.professionalProfileId,
    slots
  });
});

availabilityRouter.get("/:professionalId/slots", async (req, res) => {
  const parsedQuery = listSlotsQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    return res.status(400).json({ error: "Invalid query", details: parsedQuery.error.flatten() });
  }

  const fromDate = parsedQuery.data.from ? new Date(parsedQuery.data.from) : new Date();
  const toDate = parsedQuery.data.to ? new Date(parsedQuery.data.to) : null;

  const slots = await prisma.availabilitySlot.findMany({
    where: {
      professionalId: req.params.professionalId,
      isBlocked: false,
      startsAt: {
        gte: fromDate,
        ...(toDate ? { lte: toDate } : {})
      }
    },
    orderBy: { startsAt: "asc" }
  });

  return res.json({
    professionalId: req.params.professionalId,
    slots
  });
});

availabilityRouter.post("/slots", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PROFESSIONAL" || !actor.professionalProfileId) {
    return res.status(403).json({ error: "Only professionals can create availability slots" });
  }

  const parsed = createSlotSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid slot payload", details: parsed.error.flatten() });
  }

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);

  if (startsAt >= endsAt) {
    return res.status(400).json({ error: "startsAt must be before endsAt" });
  }

  const overlap = await prisma.availabilitySlot.findFirst({
    where: {
      professionalId: actor.professionalProfileId,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt }
    }
  });

  if (overlap) {
    return res.status(409).json({ error: "Slot overlaps with an existing range" });
  }

  const slot = await prisma.availabilitySlot.create({
    data: {
      professionalId: actor.professionalProfileId,
      startsAt,
      endsAt,
      isBlocked: parsed.data.isBlocked,
      source: parsed.data.source ?? "internal"
    }
  });

  return res.status(201).json({ message: "Availability slot created", slot });
});

availabilityRouter.delete("/slots/:slotId", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PROFESSIONAL" || !actor.professionalProfileId) {
    return res.status(403).json({ error: "Only professionals can delete availability slots" });
  }

  const slot = await prisma.availabilitySlot.findUnique({ where: { id: req.params.slotId } });
  if (!slot || slot.professionalId !== actor.professionalProfileId) {
    return res.status(404).json({ error: "Slot not found" });
  }

  await prisma.availabilitySlot.delete({ where: { id: slot.id } });

  return res.json({ message: "Slot deleted", slotId: slot.id });
});
