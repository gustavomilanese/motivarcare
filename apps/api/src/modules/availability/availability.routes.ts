import { Router } from "express";
import { z } from "zod";

const createSlotSchema = z.object({
  professionalId: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  isBlocked: z.boolean().default(false)
});

export const availabilityRouter = Router();

availabilityRouter.get("/:professionalId/slots", (req, res) => {
  res.json({
    professionalId: req.params.professionalId,
    slots: [],
    note: "Slots should be returned in patient timezone at query layer."
  });
});

availabilityRouter.post("/slots", (req, res) => {
  const parsed = createSlotSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid slot payload", details: parsed.error.flatten() });
  }

  res.status(201).json({ message: "Availability slot scaffold ready", slot: parsed.data });
});
