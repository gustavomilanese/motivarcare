import { Router } from "express";
import { z } from "zod";
import { getActorContext } from "../../lib/actor.js";
import { requireAuth, type AuthenticatedRequest } from "../../lib/auth.js";
import { prisma } from "../../lib/prisma.js";
import {
  ProfessionalReportError,
  getOrGenerateProfessionalReport
} from "../treatment-chat/professionalReports.service.js";

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

/** Completed session "economic" date: completion when set, else scheduled start (matches finance rollups). */
function financeCompletedReferenceWhere(from: Date | null, to: Date) {
  const byCompleted = from
    ? { bookingCompletedAt: { gte: from, lte: to } }
    : { bookingCompletedAt: { lte: to } };
  const byStartFallback = from
    ? { AND: [{ bookingCompletedAt: null }, { bookingStartsAt: { gte: from, lte: to } }] }
    : { AND: [{ bookingCompletedAt: null }, { bookingStartsAt: { lte: to } }] };
  return { OR: [byCompleted, byStartFallback] };
}

function utcStartOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function utcEndOfDayFromDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

function firstQueryString(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string" && value[0].length > 0) {
    return value[0];
  }
  return undefined;
}

function parseProfessionalStatsRange(query: Record<string, unknown>): {
  statsFrom: Date | null;
  statsTo: Date;
  statsAll: boolean;
} {
  const now = new Date();
  const statsAll =
    firstQueryString(query.statsAll) === "1" || firstQueryString(query.statsAll) === "true";
  let statsFrom: Date | null = null;
  let statsTo: Date = utcEndOfDayFromDate(now);

  if (statsAll) {
    statsFrom = null;
    const toStr = firstQueryString(query.statsTo);
    if (toStr) {
      const parsed = new Date(toStr);
      if (!Number.isNaN(parsed.getTime())) {
        statsTo = parsed;
      }
    }
  } else {
    const fromStr = firstQueryString(query.statsFrom);
    const toStr = firstQueryString(query.statsTo);
    if (fromStr && toStr) {
      const from = new Date(fromStr);
      const to = new Date(toStr);
      if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
        statsFrom = from;
        statsTo = to;
      } else {
        statsFrom = utcStartOfMonth(now);
        statsTo = utcEndOfDayFromDate(now);
      }
    } else {
      statsFrom = utcStartOfMonth(now);
      statsTo = utcEndOfDayFromDate(now);
    }
  }

  return { statsFrom, statsTo, statsAll };
}

type PatientStatus = "active" | "pause" | "cancelled" | "trial";

type BookingForPatientRollup = {
  patientId: string;
  startsAt: Date;
  status: string;
  patient?: {
    user?: {
      fullName?: string;
      email?: string;
      avatarUrl?: string | null;
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
      avatarUrl: string | null;
      totalSessions: number;
      lastSessionAt: Date;
      cancelledSessions: number;
      completedSessions: number;
    }
  >();

  for (const booking of bookings) {
    const current = grouped.get(booking.patientId);
    const fromBookingAvatar = booking.patient?.user?.avatarUrl ?? null;
    if (!current) {
      grouped.set(booking.patientId, {
        patientId: booking.patientId,
        patientName: booking.patient?.user?.fullName ?? "Paciente",
        patientEmail: booking.patient?.user?.email ?? "",
        avatarUrl: fromBookingAvatar,
        totalSessions: 1,
        lastSessionAt: booking.startsAt,
        cancelledSessions: booking.status === BOOKING_STATUS.CANCELLED ? 1 : 0,
        completedSessions: booking.status === BOOKING_STATUS.COMPLETED ? 1 : 0
      });
      continue;
    }

    if (!current.avatarUrl && fromBookingAvatar) {
      current.avatarUrl = fromBookingAvatar;
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

  const { statsFrom, statsTo, statsAll } = parseProfessionalStatsRange(req.query as Record<string, unknown>);

  const revenueWhere = {
    professionalId: actor.professionalProfileId,
    bookingStatus: BOOKING_STATUS.COMPLETED,
    ...financeCompletedReferenceWhere(statsFrom, statsTo)
  };

  const [upcomingBookings, upcomingBookingsCount, weeklySessionsCount, allBookings, futureSlots, pendingPayoutSummary, revenueStats] = await Promise.all([
    prisma.booking.findMany({
      where: {
        professionalId: actor.professionalProfileId,
        status: { in: [BOOKING_STATUS.REQUESTED, BOOKING_STATUS.CONFIRMED] },
        endsAt: { gte: now }
      },
      include: {
        patient: {
          include: {
            user: { select: { fullName: true, email: true, avatarUrl: true } }
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
            user: { select: { fullName: true, email: true, avatarUrl: true } }
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
    }),
    prisma.financeSessionRecord.aggregate({
      where: revenueWhere,
      _sum: {
        sessionPriceCents: true,
        platformFeeCents: true,
        professionalNetCents: true
      },
      _count: true
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
    revenueStats: {
      grossCents: revenueStats._sum.sessionPriceCents ?? 0,
      platformFeeCents: revenueStats._sum.platformFeeCents ?? 0,
      professionalNetCents: revenueStats._sum.professionalNetCents ?? 0,
      completedSessions: revenueStats._count,
      range: {
        from: statsFrom ? statsFrom.toISOString() : null,
        to: statsTo.toISOString(),
        allTime: statsAll || statsFrom === null
      }
    },
    trialSession: trialBooking
      ? {
          id: trialBooking.id,
          patientId: trialBooking.patientId,
          patientName: trialBooking.patient.user.fullName,
          patientEmail: trialBooking.patient.user.email,
          patientAvatarUrl: trialBooking.patient.user.avatarUrl ?? null,
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
      patientAvatarUrl: booking.patient.user.avatarUrl ?? null,
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

  const [bookings, chatThreads] = await Promise.all([
    prisma.booking.findMany({
      where: { professionalId: actor.professionalProfileId },
      include: {
        patient: {
          include: {
            user: { select: { fullName: true, email: true, avatarUrl: true } }
          }
        }
      },
      orderBy: { startsAt: "desc" }
    }),
    prisma.chatThread.findMany({
      where: { professionalId: actor.professionalProfileId },
      include: {
        patient: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true,
                avatarUrl: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const patients = buildPatientRollup(
    bookings.map((booking) => ({
      patientId: booking.patientId,
      startsAt: booking.startsAt,
      status: booking.status,
      patient: booking.patient
    }))
  );

  const patientsById = new Map(patients.map((patient) => [patient.patientId, patient]));
  const now = Date.now();

  for (const thread of chatThreads) {
    if (patientsById.has(thread.patientId)) {
      continue;
    }

    patientsById.set(thread.patientId, {
      patientId: thread.patientId,
      patientName: thread.patient.user.fullName ?? "Paciente",
      patientEmail: thread.patient.user.email ?? "",
      avatarUrl: thread.patient.user.avatarUrl ?? null,
      totalSessions: 0,
      lastSessionAt: thread.createdAt,
      completedSessions: 0,
      cancelledSessions: 0,
      status: "trial",
      daysSinceLastSession: Math.floor((now - thread.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    });
  }

  return res.json({
    patients: Array.from(patientsById.values())
  });
});

professionalRouter.get("/earnings", async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PROFESSIONAL" || !actor.professionalProfileId) {
    return res.status(403).json({ error: "Only professionals can access earnings" });
  }

  const { statsFrom, statsTo, statsAll } = parseProfessionalStatsRange(req.query as Record<string, unknown>);

  const baseCompleted = {
    professionalId: actor.professionalProfileId,
    bookingStatus: BOOKING_STATUS.COMPLETED
  };

  const rangeWhere = {
    ...baseCompleted,
    ...financeCompletedReferenceWhere(statsFrom, statsTo)
  };

  const [rangeAgg, movementRows, lifetimeAgg] = await Promise.all([
    prisma.financeSessionRecord.aggregate({
      where: rangeWhere,
      _sum: {
        sessionPriceCents: true,
        platformFeeCents: true,
        professionalNetCents: true
      },
      _count: true
    }),
    prisma.financeSessionRecord.findMany({
      where: rangeWhere,
      include: {
        patient: {
          include: {
            user: { select: { fullName: true } }
          }
        }
      },
      orderBy: [{ bookingCompletedAt: "desc" }, { bookingStartsAt: "desc" }],
      take: 50
    }),
    prisma.financeSessionRecord.aggregate({
      where: baseCompleted,
      _sum: { professionalNetCents: true },
      _count: true
    })
  ]);

  const grossCents = rangeAgg._sum.sessionPriceCents ?? 0;
  const platformFeeCents = rangeAgg._sum.platformFeeCents ?? 0;
  const professionalNetCents = rangeAgg._sum.professionalNetCents ?? 0;
  const completedSessions = rangeAgg._count;
  const averageNetPerSessionCents =
    completedSessions > 0 ? Math.round(professionalNetCents / completedSessions) : 0;

  const lifetimeProfessionalNetCents = lifetimeAgg._sum.professionalNetCents ?? 0;
  const lifetimeCompletedSessions = lifetimeAgg._count;

  return res.json({
    summary: {
      grossCents,
      platformFeeCents,
      professionalNetCents,
      completedSessions,
      averageNetPerSessionCents,
      lifetimeProfessionalNetCents,
      lifetimeCompletedSessions,
      totalCents: professionalNetCents,
      currentPeriodCents: professionalNetCents,
      totalSessions: completedSessions,
      currentPeriodSessions: completedSessions,
      sessionFeeCents: averageNetPerSessionCents
    },
    range: {
      from: statsFrom ? statsFrom.toISOString() : null,
      to: statsTo.toISOString(),
      allTime: statsAll || statsFrom === null
    },
    movements: movementRows.map((record) => ({
      bookingId: record.bookingId,
      patientName: record.patient.user.fullName,
      startsAt: record.bookingStartsAt.toISOString(),
      grossCents: record.sessionPriceCents,
      platformFeeCents: record.platformFeeCents,
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

/* ========================================================================== */
/* Reportes del chat IA de tratamiento (PR-T4)                                  */
/* ========================================================================== */

/**
 * GET /api/professional/treatment-reports
 *
 * Lista los pacientes asignados al profesional autenticado que tienen un chat
 * de tratamiento activo y que dieron consent. Pensado para alimentar la
 * pestaña "Reportes": cards con un eyebrow del estado y posibilidad de drill
 * down al resumen.
 *
 * No genera resúmenes acá (sería 1 LLM call por paciente). El listado solo
 * indica qué pacientes tienen reporte disponible y si hay banderitas urgentes.
 */
professionalRouter.get("/treatment-reports", async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PROFESSIONAL" || !actor.professionalProfileId) {
    return res.status(403).json({ error: "Only professionals can access reports" });
  }

  /**
   * Pacientes "del profesional" = pacientes con al menos un booking con este pro.
   * Es la misma definición que /patients usa: cualquier estado.
   */
  const bookings = await prisma.booking.findMany({
    where: { professionalId: actor.professionalProfileId },
    select: { patientId: true },
    distinct: ["patientId"]
  });
  const patientIds = bookings.map((b) => b.patientId);
  if (patientIds.length === 0) {
    return res.json({ items: [] });
  }

  const chats = await prisma.patientTreatmentChat.findMany({
    where: {
      patientId: { in: patientIds },
      professionalShareConsent: true
    },
    include: {
      patient: {
        include: {
          user: { select: { fullName: true, avatarUrl: true } }
        }
      }
    },
    orderBy: { lastUserMessageAt: "desc" }
  });

  return res.json({
    items: chats.map((chat) => ({
      patientId: chat.patientId,
      patientName: chat.patient.user.fullName,
      patientAvatarUrl: chat.patient.user.avatarUrl ?? null,
      messageCount: chat.messageCount,
      lastUserMessageAt: chat.lastUserMessageAt?.toISOString() ?? null,
      safetyFlagged: chat.highestSafetySeverity === "high",
      lastSafetyEventAt: chat.lastSafetyEventAt?.toISOString() ?? null,
      summaryAvailableAt: chat.professionalSummaryAt?.toISOString() ?? null
    }))
  });
});

/**
 * GET /api/professional/treatment-reports/:patientId
 *
 * Detalle: regenera (o sirve cache) el resumen IA del chat de tratamiento del
 * paciente. Verifica que (a) el profesional tiene relación de booking con el
 * paciente y (b) el paciente dio consent.
 */
professionalRouter.get("/treatment-reports/:patientId", async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PROFESSIONAL" || !actor.professionalProfileId) {
    return res.status(403).json({ error: "Only professionals can access reports" });
  }

  const patientId = req.params.patientId;
  if (!patientId) {
    return res.status(400).json({ error: "patientId is required" });
  }

  /**
   * Verificación de relación: pedimos un booking entre este pro y este paciente.
   * Cualquier estado vale; alcanza con que hayan tenido (o tengan) actividad.
   */
  const relation = await prisma.booking.findFirst({
    where: {
      professionalId: actor.professionalProfileId,
      patientId
    },
    select: { id: true }
  });
  if (!relation) {
    return res.status(403).json({ error: "Patient is not under your care" });
  }

  try {
    const result = await getOrGenerateProfessionalReport(patientId);
    if (result.kind === "no-chat") {
      return res.status(404).json({ error: "NO_CHAT", message: "El paciente no tiene chat de acompañamiento todavía." });
    }
    if (result.kind === "no-consent") {
      return res.status(403).json({ error: "NO_CONSENT", message: "El paciente no autorizó compartir el resumen." });
    }
    if (result.kind === "no-data") {
      return res.status(404).json({ error: "NO_DATA", message: "El chat existe pero todavía no hay mensajes." });
    }
    return res.json({
      patientId,
      chatId: result.chatId,
      summary: result.summary,
      safetyFlagged: result.safetyFlagged,
      lastSafetyEventAt: result.lastSafetyEventAt,
      lastUserMessageAt: result.lastUserMessageAt,
      messageCount: result.messageCount
    });
  } catch (err) {
    if (err instanceof ProfessionalReportError) {
      return res.status(503).json({ error: err.code, message: err.message });
    }
    console.error("[professional/treatment-reports] unexpected", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Error inesperado" });
  }
});
