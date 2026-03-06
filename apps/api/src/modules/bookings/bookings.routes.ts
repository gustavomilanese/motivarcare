import { Router } from "express";
import { z } from "zod";

const createBookingSchema = z.object({
  patientId: z.string().min(1),
  professionalId: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime()
});

const cancelBookingSchema = z.object({
  reason: z.string().min(3).optional(),
  cancelledAt: z.string().datetime().optional()
});

export const bookingsRouter = Router();

bookingsRouter.post("/", (req, res) => {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid booking payload", details: parsed.error.flatten() });
  }

  res.status(201).json({
    message: "Booking scaffold ready",
    policy: {
      freeCancellationHours: 24,
      lateCancellationPenalty: "configurable",
      noShowPenalty: "consume_credit"
    },
    booking: parsed.data
  });
});

bookingsRouter.post("/:bookingId/cancel", (req, res) => {
  const parsed = cancelBookingSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid cancellation payload", details: parsed.error.flatten() });
  }

  res.json({
    message: "Cancellation scaffold ready",
    bookingId: req.params.bookingId,
    appliedPolicy: "24h_free_cancellation",
    payload: parsed.data
  });
});
