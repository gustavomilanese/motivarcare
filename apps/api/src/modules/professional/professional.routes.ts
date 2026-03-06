import { Router } from "express";
import { z } from "zod";
import { getActorContext } from "../../lib/actor.js";
import { requireAuth, type AuthenticatedRequest } from "../../lib/auth.js";
import { prisma } from "../../lib/prisma.js";

const adminPayloadSchema = z.object({
  taxId: z.string().max(60).optional(),
  payoutMethod: z.string().max(80).optional(),
  payoutAccount: z.string().max(120).optional(),
  legalAcceptedAt: z.string().datetime().nullable().optional(),
  acceptedDocuments: z.array(z.string().max(120)).optional(),
  notes: z.string().max(1000).optional()
});

const SESSION_FEE_CENTS = 9000;
const BOOKING_STATUS = {
  REQUESTED: "REQUESTED",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED"
} as const;

export const professionalRouter = Router();

professionalRouter.use(requireAuth);

professionalRouter.get("/dashboard", async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PROFESSIONAL" || !actor.professionalProfileId) {
    return res.status(403).json({ error: "Only professionals can access dashboard" });
  }

  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [upcomingBookings, allBookings, futureSlots] = await Promise.all([
    prisma.booking.findMany({
      where: {
        professionalId: actor.professionalProfileId,
        status: { in: [BOOKING_STATUS.REQUESTED, BOOKING_STATUS.CONFIRMED] },
        startsAt: { gte: now }
      },
      include: {
        patient: {
          include: {
            user: { select: { fullName: true, email: true } }
          }
        },
        videoSession: true
      },
      orderBy: { startsAt: "asc" },
      take: 8
    }),
    prisma.booking.findMany({
      where: {
        professionalId: actor.professionalProfileId,
        status: { in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED] }
      },
      orderBy: { startsAt: "desc" }
    }),
    prisma.availabilitySlot.findMany({
      where: {
        professionalId: actor.professionalProfileId,
        isBlocked: false,
        startsAt: { gte: now }
      }
    })
  ]);

  const activePatients = new Set(
    allBookings.filter((booking: any) => booking.status !== BOOKING_STATUS.CANCELLED).map((booking: any) => booking.patientId)
  ).size;

  const sessionsCompleted = allBookings.filter((booking: any) => booking.status === BOOKING_STATUS.COMPLETED).length;
  const sessionsScheduled = upcomingBookings.length;

  const hoursAvailable = futureSlots.reduce((acc: number, slot: any) => {
    const diffHours = (slot.endsAt.getTime() - slot.startsAt.getTime()) / (1000 * 60 * 60);
    return acc + Math.max(diffHours, 0);
  }, 0);

  const conversionBase = allBookings.filter((booking: any) => booking.status !== BOOKING_STATUS.CANCELLED).length;
  const conversionRate = conversionBase === 0 ? 0 : Math.round((sessionsCompleted / conversionBase) * 100);

  const weeklySessions = allBookings.filter(
    (booking: any) => booking.startsAt >= now && booking.startsAt <= nextWeek && booking.status !== BOOKING_STATUS.CANCELLED
  ).length;

  const pendingPayoutCents = allBookings.filter((booking: any) => booking.status === BOOKING_STATUS.CONFIRMED).length * SESSION_FEE_CENTS;

  return res.json({
    kpis: {
      activePatients,
      sessionsCompleted,
      sessionsScheduled,
      conversionRate,
      hoursAvailable: Number(hoursAvailable.toFixed(1)),
      weeklySessions,
      pendingPayoutCents
    },
    upcomingSessions: upcomingBookings.map((booking: any) => ({
      id: booking.id,
      patientId: booking.patientId,
      patientName: booking.patient.user.fullName,
      patientEmail: booking.patient.user.email,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      status: booking.status.toLowerCase(),
      joinUrl: booking.videoSession?.joinUrlProfessional ?? null
    }))
  });
});

professionalRouter.get("/patients", async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PROFESSIONAL" || !actor.professionalProfileId) {
    return res.status(403).json({ error: "Only professionals can access patients" });
  }

  const bookings = await prisma.booking.findMany({
    where: { professionalId: actor.professionalProfileId },
    include: {
      patient: {
        include: {
          user: { select: { fullName: true, email: true } }
        }
      }
    },
    orderBy: { startsAt: "desc" }
  });

  const grouped = new Map<string, {
    patientId: string;
    patientName: string;
    patientEmail: string;
    totalSessions: number;
    lastSessionAt: Date;
    cancelledSessions: number;
    completedSessions: number;
  }>();

  for (const booking of bookings) {
    const current = grouped.get(booking.patientId);

    if (!current) {
      grouped.set(booking.patientId, {
        patientId: booking.patientId,
        patientName: booking.patient.user.fullName,
        patientEmail: booking.patient.user.email,
        totalSessions: 1,
        lastSessionAt: booking.startsAt,
        cancelledSessions: booking.status === BOOKING_STATUS.CANCELLED ? 1 : 0,
        completedSessions: booking.status === BOOKING_STATUS.COMPLETED ? 1 : 0
      });
      continue;
    }

    current.totalSessions += 1;
    if (booking.startsAt > current.lastSessionAt) {
      current.lastSessionAt = booking.startsAt;
    }
    if (booking.status === BOOKING_STATUS.CANCELLED) {
      current.cancelledSessions += 1;
    }
    if (booking.status === BOOKING_STATUS.COMPLETED) {
      current.completedSessions += 1;
    }
  }

  const now = Date.now();

  const patients = Array.from(grouped.values()).map((patient) => {
    const daysSinceLastSession = Math.floor((now - patient.lastSessionAt.getTime()) / (1000 * 60 * 60 * 24));

    let status: "active" | "pause" | "cancelled" | "trial" = "active";
    if (patient.totalSessions <= 1) {
      status = "trial";
    } else if (patient.cancelledSessions >= patient.totalSessions) {
      status = "cancelled";
    } else if (daysSinceLastSession > 45) {
      status = "pause";
    }

    return {
      ...patient,
      status,
      daysSinceLastSession
    };
  });

  return res.json({ patients });
});

professionalRouter.get("/earnings", async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PROFESSIONAL" || !actor.professionalProfileId) {
    return res.status(403).json({ error: "Only professionals can access earnings" });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const bookings = await prisma.booking.findMany({
    where: {
      professionalId: actor.professionalProfileId,
      status: { in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.COMPLETED] }
    },
    include: {
      patient: {
        include: {
          user: { select: { fullName: true } }
        }
      }
    },
    orderBy: { startsAt: "desc" }
  });

  const totalCents = bookings.length * SESSION_FEE_CENTS;
  const currentPeriodBookings = bookings.filter((booking: any) => booking.startsAt >= monthStart);
  const currentPeriodCents = currentPeriodBookings.length * SESSION_FEE_CENTS;

  return res.json({
    summary: {
      totalCents,
      currentPeriodCents,
      totalSessions: bookings.length,
      currentPeriodSessions: currentPeriodBookings.length,
      sessionFeeCents: SESSION_FEE_CENTS
    },
    movements: currentPeriodBookings.slice(0, 20).map((booking: any) => ({
      bookingId: booking.id,
      patientName: booking.patient.user.fullName,
      startsAt: booking.startsAt,
      amountCents: SESSION_FEE_CENTS,
      status: booking.status.toLowerCase()
    }))
  });
});

professionalRouter.get("/admin", async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PROFESSIONAL" || !actor.professionalProfileId) {
    return res.status(403).json({ error: "Only professionals can access admin data" });
  }

  const key = `professional-admin-${actor.professionalProfileId}`;
  const config = await prisma.systemConfig.findUnique({ where: { key } });

  return res.json({
    data:
      config?.value
      ?? {
        taxId: "",
        payoutMethod: "stripe",
        payoutAccount: "",
        legalAcceptedAt: null,
        acceptedDocuments: []
      }
  });
});

professionalRouter.put("/admin", async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PROFESSIONAL" || !actor.professionalProfileId) {
    return res.status(403).json({ error: "Only professionals can update admin data" });
  }

  const parsed = adminPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const key = `professional-admin-${actor.professionalProfileId}`;

  const nextValue = {
    ...parsed.data,
    legalAcceptedAt: parsed.data.legalAcceptedAt ?? null,
    updatedByUserId: actor.userId,
    updatedAt: new Date().toISOString()
  };

  const config = await prisma.systemConfig.upsert({
    where: { key },
    create: {
      key,
      value: nextValue
    },
    update: {
      value: nextValue
    }
  });

  return res.json({ message: "Admin data saved", data: config.value });
});
