import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";

const enqueueAuditSchema = z.object({
  patientId: z.string().min(1),
  professionalId: z.string().min(1),
  bookingId: z.string().min(1).optional(),
  mode: z.enum(["text", "audio"]).default("text"),
  source: z.enum(["chat", "session_notes", "transcript"]),
  payload: z.record(z.any())
});

export const aiAuditRouter = Router();

aiAuditRouter.post("/jobs", (req, res) => {
  const parsed = enqueueAuditSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid AI payload", details: parsed.error.flatten() });
  }

  if (!env.AI_AUDIT_ENABLED) {
    return res.status(409).json({
      error: "AI audit disabled",
      recommendation: "Enable only with explicit consent and human review workflow."
    });
  }

  if (parsed.data.mode === "audio") {
    return res.status(202).json({
      status: "queued",
      warning: "Audio analysis should be phase 2 and must require explicit patient consent.",
      data: parsed.data
    });
  }

  return res.status(202).json({
    status: "queued",
    note: "Text audit accepted. Results must be reviewed by a professional.",
    data: parsed.data
  });
});
