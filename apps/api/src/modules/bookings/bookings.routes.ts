import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { getActorContext } from "../../lib/actor.js";
import { requireAuth, type AuthenticatedRequest } from "../../lib/auth.js";
import { prisma } from "../../lib/prisma.js";

const createBookingSchema = z.object({
  professionalId: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime()
});

const cancelBookingSchema = z.object({
  reason: z.string().min(3).optional(),
  cancelledAt: z.string().datetime().optional()
});

const FREE_CANCELLATION_HOURS = 24;
const BOOKING_STATUS = {
  REQUESTED: "REQUESTED",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED"
} as const;

function normalizeStatus(status: string): string {
  return status.toLowerCase();
}

export const bookingsRouter = Router();

bookingsRouter.get("/mine", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const actor = await getActorContext(req.auth);
  if (!actor) {
    return res.status(404).json({ error: "User not found" });
  }

  if (actor.role === "PATIENT" && actor.patientProfileId) {
    const bookings = await prisma.booking.findMany({
      where: { patientId: actor.patientProfileId },
      include: {
        professional: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true }
            }
          }
        },
        videoSession: true
      },
      orderBy: { startsAt: "asc" }
    });

    return res.json({
      role: actor.role,
      bookings: bookings.map((booking: any) => ({
        id: booking.id,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        status: normalizeStatus(booking.status),
        professionalId: booking.professionalId,
        counterpartName: booking.professional.user.fullName,
        counterpartEmail: booking.professional.user.email,
        joinUrl: booking.videoSession?.joinUrlPatient ?? null,
        joinUrlProfessional: booking.videoSession?.joinUrlProfessional ?? null,
        createdAt: booking.createdAt
      }))
    });
  }

  if (actor.role === "PROFESSIONAL" && actor.professionalProfileId) {
    const bookings = await prisma.booking.findMany({
      where: { professionalId: actor.professionalProfileId },
      include: {
        patient: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true }
            }
          }
        },
        videoSession: true
      },
      orderBy: { startsAt: "asc" }
    });

    return res.json({
      role: actor.role,
      bookings: bookings.map((booking: any) => ({
        id: booking.id,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        status: normalizeStatus(booking.status),
        patientId: booking.patientId,
        counterpartName: booking.patient.user.fullName,
        counterpartEmail: booking.patient.user.email,
        joinUrl: booking.videoSession?.joinUrlProfessional ?? null,
        joinUrlPatient: booking.videoSession?.joinUrlPatient ?? null,
        createdAt: booking.createdAt
      }))
    });
  }

  return res.json({ role: actor.role, bookings: [] });
});

bookingsRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid booking payload", details: parsed.error.flatten() });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PATIENT" || !actor.patientProfileId) {
    return res.status(403).json({ error: "Only patients can create bookings" });
  }

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);
  if (startsAt >= endsAt) {
    return res.status(400).json({ error: "startsAt must be before endsAt" });
  }

  const professional = await prisma.professionalProfile.findUnique({
    where: { id: parsed.data.professionalId },
    include: { user: { select: { fullName: true } } }
  });

  if (!professional) {
    return res.status(404).json({ error: "Professional not found" });
  }

  const overlap = await prisma.booking.findFirst({
    where: {
      professionalId: professional.id,
        status: { in: [BOOKING_STATUS.REQUESTED, BOOKING_STATUS.CONFIRMED] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt }
    }
  });

  if (overlap) {
    return res.status(409).json({ error: "Professional already booked at that time" });
  }

  const booking = await prisma.booking.create({
    data: {
      patientId: actor.patientProfileId,
      professionalId: professional.id,
      startsAt,
      endsAt,
      status: BOOKING_STATUS.CONFIRMED,
      consumedCredits: 1
    }
  });

  const existingThread = await prisma.chatThread.findFirst({
    where: {
      patientId: actor.patientProfileId,
      professionalId: professional.id,
      bookingId: null
    }
  });

  const thread =
    existingThread
    ?? (await prisma.chatThread.create({
      data: {
        patientId: actor.patientProfileId,
        professionalId: professional.id
      }
    }));

  const roomName = `session-${booking.id}`;
  const domain = env.DAILY_DOMAIN || "https://demo.daily.co";

  const videoSession = await prisma.videoSession.create({
    data: {
      bookingId: booking.id,
      provider: "daily",
      externalRoomId: roomName,
      joinUrlPatient: `${domain}/${roomName}?role=patient`,
      joinUrlProfessional: `${domain}/${roomName}?role=professional`
    }
  });

  return res.status(201).json({
    policy: {
      freeCancellationHours: FREE_CANCELLATION_HOURS,
      lateCancellationPenalty: "configurable",
      noShowPenalty: "consume_credit"
    },
    booking: {
      id: booking.id,
      patientId: booking.patientId,
      professionalId: booking.professionalId,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      status: normalizeStatus(booking.status),
      threadId: thread.id,
      joinUrlPatient: videoSession.joinUrlPatient,
      joinUrlProfessional: videoSession.joinUrlProfessional,
      professionalName: professional.user.fullName
    }
  });
});

bookingsRouter.post("/:bookingId/cancel", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = cancelBookingSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid cancellation payload", details: parsed.error.flatten() });
  }

  const actor = await getActorContext(req.auth);
  if (!actor) {
    return res.status(404).json({ error: "User not found" });
  }

  const booking = await prisma.booking.findUnique({ where: { id: req.params.bookingId } });
  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  const canCancelAsPatient = actor.patientProfileId && booking.patientId === actor.patientProfileId;
  const canCancelAsProfessional = actor.professionalProfileId && booking.professionalId === actor.professionalProfileId;

  if (!canCancelAsPatient && !canCancelAsProfessional) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (booking.status === BOOKING_STATUS.CANCELLED) {
    return res.status(409).json({ error: "Booking already cancelled" });
  }

  const cancelledAt = parsed.data.cancelledAt ? new Date(parsed.data.cancelledAt) : new Date();
  const hoursBeforeSession = (booking.startsAt.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60);

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: BOOKING_STATUS.CANCELLED,
      cancellationReason: parsed.data.reason ?? null,
      cancelledAt
    }
  });

  return res.json({
    message: "Booking cancelled",
    bookingId: updated.id,
    appliedPolicy: hoursBeforeSession >= FREE_CANCELLATION_HOURS ? "24h_free_cancellation" : "late_cancellation",
    freeCancellationHours: FREE_CANCELLATION_HOURS,
    status: normalizeStatus(updated.status)
  });
});
