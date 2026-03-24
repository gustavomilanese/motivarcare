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

const BOOKING_STATUS = {
  REQUESTED: "REQUESTED",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
  NO_SHOW: "NO_SHOW"
} as const;

type PatientStatus = "active" | "pause" | "cancelled" | "trial";

type BookingForPatientRollup = {
  patientId: string;
  startsAt: Date;
  status: string;
  patient?: {
    user?: {
      fullName?: string;
      email?: string;
    };
  };
};

function buildPatientRollup(bookings: BookingForPatientRollup[]) {
  const grouped = new Map<
    string,
    {
      patientId: string;
      patientName: string;
      patientEmail: string;
      totalSessions: number;
      lastSessionAt: Date;
      cancelledSessions: number;
      completedSessions: number;
    }
  >();

  for (const booking of bookings) {
    const current = grouped.get(booking.patientId);
    if (!current) {
      grouped.set(booking.patientId, {
        patientId: booking.patientId,
        patientName: booking.patient?.user?.fullName ?? "Paciente",
        patientEmail: booking.patient?.user?.email ?? "",
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
  return Array.from(grouped.values()).map((patient) => {
    const daysSinceLastSession = Math.floor((now - patient.lastSessionAt.getTime()) / (1000 * 60 * 60 * 24));

    let status: PatientStatus = "active";
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
}

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
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [upcomingBookings, upcomingBookingsCount, weeklySessionsCount, allBookings, futureSlots, pendingPayoutSummary] = await Promise.all([
    prisma.booking.findMany({
      where: {
        professionalId: actor.professionalProfileId,
        status: { in: [BOOKING_STATUS.REQUESTED, BOOKING_STATUS.CONFIRMED] },
        endsAt: { gte: now }
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
      take: 24
    }),
    prisma.booking.count({
      where: {
        professionalId: actor.professionalProfileId,
        status: { in: [BOOKING_STATUS.REQUESTED, BOOKING_STATUS.CONFIRMED] },
        endsAt: { gte: now }
      }
    }),
    prisma.booking.count({
      where: {
        professionalId: actor.professionalProfileId,
        status: { in: [BOOKING_STATUS.REQUESTED, BOOKING_STATUS.CONFIRMED] },
        startsAt: {
          gte: now,
          lte: nextWeek
        }
      }
    }),
    prisma.booking.findMany({
      where: {
        professionalId: actor.professionalProfileId
      },
      include: {
        patient: {
          include: {
            user: { select: { fullName: true, email: true } }
          }
        }
      },
      orderBy: { startsAt: "desc" }
    }),
    prisma.availabilitySlot.findMany({
      where: {
        professionalId: actor.professionalProfileId,
        isBlocked: false,
        startsAt: { gte: now }
      }
    }),
    prisma.financeSessionRecord.aggregate({
      where: {
        professionalId: actor.professionalProfileId,
        bookingStatus: BOOKING_STATUS.COMPLETED,
        payoutLineId: null
      },
      _sum: {
        professionalNetCents: true
      }
    })
  ]);

  const patientRollup = buildPatientRollup(
    allBookings.map((booking) => ({
      patientId: booking.patientId,
      startsAt: booking.startsAt,
      status: booking.status,
      patient: booking.patient
    }))
  );
  const activePatients = patientRollup.filter((patient) => patient.status === "active").length;

  const sessionsCompleted = allBookings.filter((booking: any) => booking.status === BOOKING_STATUS.COMPLETED).length;
  const sessionsScheduled = upcomingBookingsCount;

  const hoursAvailable = futureSlots.reduce((acc: number, slot: any) => {
    const diffMinutes = (slot.endsAt.getTime() - slot.startsAt.getTime()) / (1000 * 60);
    const slotHours = Math.ceil(Math.max(diffMinutes, 0) / 60);
    return acc + slotHours;
  }, 0);

  const conversionBase = allBookings.filter(
    (booking: any) => booking.status !== BOOKING_STATUS.CANCELLED && booking.status !== BOOKING_STATUS.NO_SHOW
  ).length;
  const conversionRate = conversionBase === 0 ? 0 : Math.round((sessionsCompleted / conversionBase) * 100);

  const weeklySessions = weeklySessionsCount;

  const pendingPayoutCents = pendingPayoutSummary._sum.professionalNetCents ?? 0;
  const activeBookingsByPatient = new Map<string, number>();

  for (const booking of allBookings) {
    if (booking.status === BOOKING_STATUS.CANCELLED) {
      continue;
    }
    activeBookingsByPatient.set(booking.patientId, (activeBookingsByPatient.get(booking.patientId) ?? 0) + 1);
  }

  const trialBooking = upcomingBookings.find((booking: any) => (activeBookingsByPatient.get(booking.patientId) ?? 0) <= 1) ?? null;
  const upcomingSessions = upcomingBookings
    .filter((booking) => booking.startsAt >= startOfToday)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  return res.json({
    kpis: {
      activePatients,
      sessionsCompleted,
      sessionsScheduled,
      conversionRate,
      hoursAvailable,
      weeklySessions,
      pendingPayoutCents
    },
    trialSession: trialBooking
      ? {
          id: trialBooking.id,
          patientId: trialBooking.patientId,
          patientName: trialBooking.patient.user.fullName,
          patientEmail: trialBooking.patient.user.email,
          startsAt: trialBooking.startsAt,
          endsAt: trialBooking.endsAt,
          status: trialBooking.status.toLowerCase()
        }
      : null,
    upcomingSessions: upcomingSessions.map((booking: any) => ({
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
  const patients = buildPatientRollup(
    bookings.map((booking) => ({
      patientId: booking.patientId,
      startsAt: booking.startsAt,
      status: booking.status,
      patient: booking.patient
    }))
  );

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

  const records = await prisma.financeSessionRecord.findMany({
    where: {
      professionalId: actor.professionalProfileId,
      bookingStatus: BOOKING_STATUS.COMPLETED
    },
    include: {
      patient: {
        include: {
          user: { select: { fullName: true } }
        }
      }
    },
    orderBy: [{ bookingCompletedAt: "desc" }, { bookingStartsAt: "desc" }]
  });

  const totalCents = records.reduce((sum, record) => sum + record.professionalNetCents, 0);
  const currentPeriodRecords = records.filter((record) => {
    const referenceDate = record.bookingCompletedAt ?? record.bookingStartsAt;
    return referenceDate >= monthStart;
  });
  const currentPeriodCents = currentPeriodRecords.reduce((sum, record) => sum + record.professionalNetCents, 0);
  const averageSessionCents = records.length > 0 ? Math.round(totalCents / records.length) : 0;

  return res.json({
    summary: {
      totalCents,
      currentPeriodCents,
      totalSessions: records.length,
      currentPeriodSessions: currentPeriodRecords.length,
      sessionFeeCents: averageSessionCents
    },
    movements: currentPeriodRecords.slice(0, 20).map((record) => ({
      bookingId: record.bookingId,
      patientName: record.patient.user.fullName,
      startsAt: record.bookingStartsAt,
      amountCents: record.professionalNetCents,
      status: record.bookingStatus.toLowerCase()
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
