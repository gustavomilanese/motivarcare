import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";

const createVideoSessionSchema = z.object({
  bookingId: z.string().min(1)
});

export const videoRouter = Router();

videoRouter.post("/sessions", (req, res) => {
  const parsed = createVideoSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid video payload", details: parsed.error.flatten() });
  }

  if (!env.DAILY_DOMAIN) {
    return res.status(501).json({
      error: "Daily not configured",
      note: "Set DAILY_DOMAIN and DAILY_API_KEY to create real rooms."
    });
  }

  // TODO: llamar API de Daily para crear room y links por sesion.
  return res.status(201).json({
    bookingId: parsed.data.bookingId,
    provider: "daily",
    roomName: `session-${parsed.data.bookingId}`,
    joinUrlPatient: `${env.DAILY_DOMAIN}/session-${parsed.data.bookingId}?role=patient`,
    joinUrlProfessional: `${env.DAILY_DOMAIN}/session-${parsed.data.bookingId}?role=professional`
  });
});
