import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { getActorContext } from "../../lib/actor.js";
import { requireAuth, type AuthenticatedRequest } from "../../lib/auth.js";
import { prisma } from "../../lib/prisma.js";

const createVideoSessionSchema = z.object({
  bookingId: z.string().min(1)
});

export const videoRouter = Router();

videoRouter.post("/sessions", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = createVideoSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid video payload", details: parsed.error.flatten() });
  }

  const actor = await getActorContext(req.auth);
  if (!actor) {
    return res.status(404).json({ error: "User not found" });
  }

  const booking = await prisma.booking.findUnique({ where: { id: parsed.data.bookingId } });
  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  const canAccessAsPatient = actor.patientProfileId && booking.patientId === actor.patientProfileId;
  const canAccessAsProfessional = actor.professionalProfileId && booking.professionalId === actor.professionalProfileId;

  if (!canAccessAsPatient && !canAccessAsProfessional) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const existing = await prisma.videoSession.findUnique({ where: { bookingId: booking.id } });
  if (existing) {
    return res.status(200).json(existing);
  }

  const roomName = `session-${parsed.data.bookingId}`;
  const domain = env.DAILY_DOMAIN || "https://demo.daily.co";

  const session = await prisma.videoSession.create({
    data: {
      bookingId: booking.id,
      provider: "daily",
      externalRoomId: roomName,
      joinUrlPatient: `${domain}/${roomName}?role=patient`,
      joinUrlProfessional: `${domain}/${roomName}?role=professional`
    }
  });

  return res.status(201).json(session);
});
