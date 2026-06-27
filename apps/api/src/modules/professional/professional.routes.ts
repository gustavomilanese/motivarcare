import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { getActorContext } from "../../lib/actor.js";
import { requireAuth, type AuthenticatedRequest } from "../../lib/auth.js";
import { sendApiError } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { buildProfessionalPracticeHealth } from "../../lib/professionalPracticeHealth.js";
import {
  buildProfessionalFinanceDisplay,
  convertFinanceMinorToDisplayMinor,
  mapFinanceRecordForDisplay,
  readSessionFxArsPerUsdSnapshot,
  resolveFxForFinanceRecord
} from "../../lib/professionalFinanceDisplay.js";
import { getFinanceRules } from "../finance/finance.service.js";
import { getResilientUsdArsRate } from "../../lib/usdArsExchangeResilient.js";
import {
  ProfessionalReportError,
  getOrGenerateProfessionalReport
} from "../treatment-chat/professionalReports.service.js";
import {
  EmotionalDiaryError,
  getSessionSummaryForProfessional,
  listPatientsWithSharedEntries,
  listSharedEntriesForProfessional
} from "../emotional-diary/emotionalDiary.service.js";

import {
  defaultProfessionalPayoutAdminData,
  professionalPayoutAdminPayloadSchema,
  validatePayoutBankAccountForProvider,
  validateTaxIdForProvider
} from "../../lib/professionalPayoutProfileSchema.js";

const adminPayloadSchema = professionalPayoutAdminPayloadSchema;

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

type MovementsPricingFilter = "all" | "package" | "list";
type MovementsSortKey = "date_desc" | "date_asc" | "gross_desc" | "gross_asc";

function parseMovementsListQuery(query: Record<string, unknown>): {
  page: number;
  pageSize: number;
  search: string;
  pricing: MovementsPricingFilter;
  sort: MovementsSortKey;
} {
  const pageRaw = Number.parseInt(firstQueryString(query.movementsPage) ?? "1", 10);
  const pageSizeRaw = Number.parseInt(firstQueryString(query.movementsPageSize) ?? "25", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const pageSize =
    Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.min(100, pageSizeRaw) : 25;

  const pricingRaw = firstQueryString(query.movementsPricing);
  const pricing: MovementsPricingFilter =
    pricingRaw === "package" || pricingRaw === "list" ? pricingRaw : "all";

  const sortRaw = firstQueryString(query.movementsSort);
  const sort: MovementsSortKey =
    sortRaw === "date_asc" || sortRaw === "gross_desc" || sortRaw === "gross_asc"
      ? sortRaw
      : "date_desc";

  return {
    page,
    pageSize,
    search: firstQueryString(query.movementsSearch)?.trim() ?? "",
    pricing,
    sort
  };
}

function buildMovementsWhere(
  baseCompleted: Record<string, unknown>,
  statsFrom: Date | null,
  statsTo: Date,
  movements: ReturnType<typeof parseMovementsListQuery>
) {
  const rangeWhere = {
    ...baseCompleted,
    ...financeCompletedReferenceWhere(statsFrom, statsTo),
    ...(movements.pricing === "package"
      ? { packageId: { not: null } }
      : movements.pricing === "list"
        ? { packageId: null }
        : {}),
    ...(movements.search
      ? {
          OR: [
            {
              patient: {
                user: {
                  fullName: { contains: movements.search, mode: "insensitive" as const }
                }
              }
            },
            {
              package: {
                name: { contains: movements.search, mode: "insensitive" as const }
              }
            }
          ]
        }
      : {})
  };

  return rangeWhere;
}

function movementsOrderBy(sort: MovementsSortKey) {
  switch (sort) {
    case "date_asc":
      return [{ bookingCompletedAt: "asc" as const }, { bookingStartsAt: "asc" as const }];
    case "gross_desc":
      return [{ sessionPriceCents: "desc" as const }, { bookingCompletedAt: "desc" as const }];
    case "gross_asc":
      return [{ sessionPriceCents: "asc" as const }, { bookingCompletedAt: "desc" as const }];
    default:
      return [{ bookingCompletedAt: "desc" as const }, { bookingStartsAt: "desc" as const }];
  }
}

async function buildPackageSessionIndexByBookingId(
  professionalProfileId: string,
  purchaseIds: string[]
): Promise<Map<string, number>> {
  const indexByBookingId = new Map<string, number>();
  const uniquePurchaseIds = [...new Set(purchaseIds)];
  if (uniquePurchaseIds.length === 0) {
    return indexByBookingId;
  }

  const records = await prisma.financeSessionRecord.findMany({
    where: {
      professionalId: professionalProfileId,
      purchaseId: { in: uniquePurchaseIds },
      bookingStatus: "COMPLETED"
    },
    select: {
      bookingId: true,
      purchaseId: true,
      bookingStartsAt: true,
      bookingCompletedAt: true
    },
    orderBy: [{ bookingStartsAt: "asc" }, { bookingCompletedAt: "asc" }]
  });

  const byPurchase = new Map<string, string[]>();
  for (const record of records) {
    if (!record.purchaseId) {
      continue;
    }
    const bookingIds = byPurchase.get(record.purchaseId) ?? [];
    bookingIds.push(record.bookingId);
    byPurchase.set(record.purchaseId, bookingIds);
  }

  for (const bookingIds of byPurchase.values()) {
    bookingIds.forEach((bookingId, index) => {
      indexByBookingId.set(bookingId, index + 1);
    });
  }

  return indexByBookingId;
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
    if (patient.totalSessions <= 1 && patient.completedSessions === 0) {
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
  try {
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

  const [
    upcomingBookings,
    upcomingBookingsCount,
    weeklySessionsCount,
    allBookings,
    futureSlots,
    pendingPayoutSummary,
    pendingPayoutRows,
    revenueStats,
    revenueStatsByCurrency,
    revenueFxRows,
    professionalProfileSnippet
  ] = await Promise.all([
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
    prisma.financeSessionRecord.findMany({
      where: {
        professionalId: actor.professionalProfileId,
        bookingStatus: BOOKING_STATUS.COMPLETED,
        payoutLineId: null
      },
      select: {
        currency: true,
        professionalNetCents: true,
        purchase: {
          select: {
            fxArsPerUsdSnapshot: true
          }
        }
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
    }),
    prisma.financeSessionRecord.groupBy({
      by: ["currency"],
      where: revenueWhere,
      _sum: {
        sessionPriceCents: true,
        platformFeeCents: true,
        professionalNetCents: true
      },
      _count: true
    }),
    prisma.financeSessionRecord.findMany({
      where: revenueWhere,
      select: {
        currency: true,
        sessionPriceCents: true,
        purchase: {
          select: {
            fxArsPerUsdSnapshot: true
          }
        }
      }
    }),
    prisma.professionalProfile.findUnique({
      where: { id: actor.professionalProfileId },
      select: {
        visible: true,
        registrationApproval: true,
        createdAt: true,
        professionalTitle: true,
        sessionPriceUsd: true,
        sessionPriceArs: true,
        photoUrl: true,
        market: true,
        residencyCountry: true
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
  const liveArsPerUsd = await getResilientUsdArsRate().catch(() => null);
  const liveFx = liveArsPerUsd != null && liveArsPerUsd > 0 ? { arsPerUsd: liveArsPerUsd } : {};
  const displayMarket =
    professionalProfileSnippet?.market
    ?? professionalProfileSnippet?.residencyCountry
    ?? "US";
  const financeDisplay = buildProfessionalFinanceDisplay({
    market: displayMarket,
    liveFx,
    rangeRecords: revenueFxRows.map((row) =>
      mapFinanceRecordForDisplay({
        currency: row.currency,
        sessionPriceCents: row.sessionPriceCents,
        platformFeeCents: 0,
        professionalNetCents: 0,
        purchase: row.purchase
      })
    ),
    lifetimeRecords: []
  });

  let pendingToCollectDisplayCents = 0;
  for (const row of pendingPayoutRows) {
    const mapped = mapFinanceRecordForDisplay({
      currency: row.currency,
      sessionPriceCents: 0,
      platformFeeCents: 0,
      professionalNetCents: row.professionalNetCents,
      purchase: row.purchase
    });
    const fx = resolveFxForFinanceRecord(mapped, financeDisplay.currency, liveFx);
    pendingToCollectDisplayCents += convertFinanceMinorToDisplayMinor(
      row.professionalNetCents,
      row.currency,
      financeDisplay.currency,
      fx,
      liveFx
    );
  }

  let usdHardCents = 0;
  for (const row of revenueFxRows) {
    const currency = (row.currency ?? "usd").toLowerCase();
    if (currency === "usd") {
      usdHardCents += row.sessionPriceCents;
      continue;
    }
    if (currency === "ars") {
      const fx = Number(row.purchase?.fxArsPerUsdSnapshot ?? 0);
      if (Number.isFinite(fx) && fx > 0) {
        usdHardCents += Math.round(row.sessionPriceCents / fx);
      }
    }
  }
  const arsGrossCents =
    revenueStatsByCurrency.find((row) => row.currency.toLowerCase() === "ars")?._sum.sessionPriceCents ?? 0;
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

  const patientStatusCounts = {
    active: 0,
    pause: 0,
    cancelled: 0,
    trial: 0
  };
  for (const p of patientRollup) {
    patientStatusCounts[p.status] += 1;
  }

  const weekAheadMs = now.getTime() + 7 * 24 * 60 * 60 * 1000;
  const slotsNext7Days = futureSlots.filter(
    (slot: { startsAt: Date }) => slot.startsAt.getTime() <= weekAheadMs
  ).length;
  const listingVisible = Boolean(professionalProfileSnippet?.visible);
  const listingHasTitle = Boolean(professionalProfileSnippet?.professionalTitle?.trim());
  const sessionPriceUsd = professionalProfileSnippet?.sessionPriceUsd ?? 0;
  const listingHasPriceUsd = sessionPriceUsd > 0;
  const listingMarketIsAr = displayMarket === "AR";
  const listingHasFxForArs = liveArsPerUsd != null && liveArsPerUsd > 0;

  const practiceHealth = buildProfessionalPracticeHealth({
    listingVisible,
    listingHasTitle,
    listingHasPriceUsd,
    listingMarketIsAr,
    listingHasFxForArs,
    sessionPriceUsd,
    arsPerUsd: liveArsPerUsd,
    slotsNext7Days,
    weeklySessionsCount,
    upcomingBookingsCount,
    conversionRate,
    conversionBase,
    sessionsCompleted,
    activePatients
  });

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
    patientStatusCounts,
    practiceHealth,
    listing: professionalProfileSnippet
      ? {
          visible: Boolean(professionalProfileSnippet.visible),
          registrationApproval: professionalProfileSnippet.registrationApproval,
          profileCreatedAt: professionalProfileSnippet.createdAt.toISOString()
        }
      : undefined,
    revenueStats: {
      grossCents: revenueStats._sum.sessionPriceCents ?? 0,
      platformFeeCents: revenueStats._sum.platformFeeCents ?? 0,
      professionalNetCents: revenueStats._sum.professionalNetCents ?? 0,
      completedSessions: revenueStats._count,
      range: {
        from: statsFrom ? statsFrom.toISOString() : null,
        to: statsTo.toISOString(),
        allTime: statsAll || statsFrom === null
      },
      byCurrency: revenueStatsByCurrency.map((row) => ({
        currency: row.currency,
        grossCents: row._sum.sessionPriceCents ?? 0,
        platformFeeCents: row._sum.platformFeeCents ?? 0,
        professionalNetCents: row._sum.professionalNetCents ?? 0,
        completedSessions: row._count
      })),
      executedDisplay: {
        arsGrossCents,
        usdHardCents
      }
    },
    display: {
      currency: financeDisplay.currency,
      executedGrossCents: financeDisplay.grossCents,
      pendingToCollectCents: pendingToCollectDisplayCents
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
  } catch (err) {
    console.error("[api] GET /professional/dashboard failed", err);
    if (res.headersSent) {
      return;
    }
    const devMessage = err instanceof Error ? err.message : String(err);
    const prismaMeta = err && typeof err === "object" && "meta" in err ? (err as { meta?: unknown }).meta : undefined;
    return sendApiError({
      res,
      status: 500,
      code: "INTERNAL_ERROR",
      message: env.NODE_ENV === "development" ? devMessage : "Internal server error",
      details:
        env.NODE_ENV === "development"
          ? {
              stack: err instanceof Error ? err.stack : undefined,
              prismaMeta,
              ...(err && typeof err === "object" && "code" in err && typeof (err as { code: unknown }).code === "string"
                ? { prismaCode: (err as { code: string }).code }
                : {})
            }
          : undefined
    });
  }
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

professionalRouter.get("/patients/:patientId", async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PROFESSIONAL" || !actor.professionalProfileId) {
    return res.status(403).json({ error: "Only professionals can access patients" });
  }

  const patientId = req.params.patientId;
  if (!patientId) {
    return res.status(400).json({ error: "patientId is required" });
  }

  const profId = actor.professionalProfileId;

  const [bookings, threadOnly] = await Promise.all([
    prisma.booking.findMany({
      where: { professionalId: profId, patientId },
      include: {
        patient: {
          include: {
            user: { select: { fullName: true, email: true, avatarUrl: true } }
          }
        }
      },
      orderBy: { startsAt: "asc" }
    }),
    prisma.chatThread.findFirst({
      where: { professionalId: profId, patientId },
      include: {
        patient: {
          include: {
            user: { select: { fullName: true, email: true, avatarUrl: true } }
          }
        }
      }
    })
  ]);

  if (bookings.length === 0 && !threadOnly) {
    return res.status(404).json({ error: "Patient not found" });
  }

  const nowMs = Date.now();
  let rollup: ReturnType<typeof buildPatientRollup>[number];

  if (bookings.length > 0) {
    const rolled = buildPatientRollup(
      bookings.map((booking) => ({
        patientId: booking.patientId,
        startsAt: booking.startsAt,
        status: booking.status,
        patient: booking.patient
      }))
    );
    rollup = rolled[0]!;
  } else if (threadOnly) {
    rollup = {
      patientId,
      patientName: threadOnly.patient.user.fullName ?? "Paciente",
      patientEmail: threadOnly.patient.user.email ?? "",
      avatarUrl: threadOnly.patient.user.avatarUrl ?? null,
      totalSessions: 0,
      lastSessionAt: threadOnly.createdAt,
      cancelledSessions: 0,
      completedSessions: 0,
      status: "trial",
      daysSinceLastSession: Math.floor((nowMs - threadOnly.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    };
  } else {
    return res.status(404).json({ error: "Patient not found" });
  }

  const firstSessionAt =
    bookings.length === 0
      ? null
      : new Date(Math.min(...bookings.map((b) => b.startsAt.getTime())));

  const completedBookings = bookings.filter((b) => b.status === BOOKING_STATUS.COMPLETED);
  const lastCompletedSessionAt =
    completedBookings.length === 0
      ? null
      : new Date(
          Math.max(
            ...completedBookings.map((b) => (b.completedAt ?? b.startsAt).getTime())
          )
        );

  const [paymentMovements, lifetimeTotalsRows] = await Promise.all([
    prisma.financeSessionRecord.findMany({
      where: {
        professionalId: profId,
        patientId,
        bookingStatus: BOOKING_STATUS.COMPLETED
      },
      orderBy: [{ bookingCompletedAt: "desc" }, { bookingStartsAt: "desc" }],
      take: 50,
      include: {
        patient: {
          include: {
            user: { select: { fullName: true } }
          }
        }
      }
    }),
    prisma.financeSessionRecord.groupBy({
      by: ["currency"],
      where: {
        professionalId: profId,
        patientId,
        bookingStatus: BOOKING_STATUS.COMPLETED
      },
      _sum: { professionalNetCents: true },
      _count: true
    })
  ]);

  const lifetimeTotals = lifetimeTotalsRows.map((row) => ({
    currency: row.currency,
    netCents: row._sum.professionalNetCents ?? 0,
    sessions: row._count
  }));

  return res.json({
    patient: {
      patientId: rollup.patientId,
      patientName: rollup.patientName,
      patientEmail: rollup.patientEmail,
      avatarUrl: rollup.avatarUrl,
      totalSessions: rollup.totalSessions,
      completedSessions: rollup.completedSessions,
      cancelledSessions: rollup.cancelledSessions,
      daysSinceLastSession: rollup.daysSinceLastSession,
      status: rollup.status,
      firstSessionAt: firstSessionAt?.toISOString() ?? null,
      lastCompletedSessionAt: lastCompletedSessionAt?.toISOString() ?? null,
      lifetimeTotals
    },
    paymentMovements: paymentMovements.map((record) => ({
      bookingId: record.bookingId,
      patientName: record.patient.user.fullName,
      startsAt: record.bookingStartsAt.toISOString(),
      completedAt: record.bookingCompletedAt?.toISOString() ?? null,
      grossCents: record.sessionPriceCents,
      platformFeeCents: record.platformFeeCents,
      amountCents: record.professionalNetCents,
      status: record.bookingStatus.toLowerCase(),
      currency: record.currency
    }))
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
  const earningsPatientId = firstQueryString(req.query.patientId);
  const movementsQuery = parseMovementsListQuery(req.query as Record<string, unknown>);

  const baseCompleted = {
    professionalId: actor.professionalProfileId,
    bookingStatus: BOOKING_STATUS.COMPLETED,
    ...(earningsPatientId ? { patientId: earningsPatientId } : {})
  };

  const rangeWhere = {
    ...baseCompleted,
    ...financeCompletedReferenceWhere(statsFrom, statsTo)
  };

  const movementsWhere = buildMovementsWhere(baseCompleted, statsFrom, statsTo, movementsQuery);
  const movementsSkip = (movementsQuery.page - 1) * movementsQuery.pageSize;

  const financeRecordSelect = {
    currency: true,
    sessionPriceCents: true,
    platformFeeCents: true,
    professionalNetCents: true,
    purchase: {
      select: {
        fxArsPerUsdSnapshot: true
      }
    }
  } as const;

  const [
    rangeAgg,
    movementRows,
    movementsTotal,
    lifetimeAgg,
    rangeByCurrency,
    lifetimeByCurrencyGroup,
    rangeDisplayRows,
    lifetimeDisplayRows,
    collectedDisplayRows,
    professionalProfileMarket,
    financeRules
  ] = await Promise.all([
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
      where: movementsWhere,
      include: {
        patient: {
          include: {
            user: { select: { fullName: true } }
          }
        },
        purchase: {
          select: {
            fxArsPerUsdSnapshot: true,
            packagePriceCentsSnapshot: true,
            packageCreditsSnapshot: true
          }
        },
        package: {
          select: {
            name: true,
            credits: true
          }
        },
        booking: {
          select: {
            endsAt: true
          }
        }
      },
      orderBy: movementsOrderBy(movementsQuery.sort),
      skip: movementsSkip,
      take: movementsQuery.pageSize
    }),
    prisma.financeSessionRecord.count({ where: movementsWhere }),
    prisma.financeSessionRecord.aggregate({
      where: baseCompleted,
      _sum: { professionalNetCents: true },
      _count: true
    }),
    prisma.financeSessionRecord.groupBy({
      by: ["currency"],
      where: rangeWhere,
      _sum: {
        sessionPriceCents: true,
        platformFeeCents: true,
        professionalNetCents: true
      },
      _count: true
    }),
    prisma.financeSessionRecord.groupBy({
      by: ["currency"],
      where: baseCompleted,
      _sum: { professionalNetCents: true },
      _count: true
    }),
    prisma.financeSessionRecord.findMany({
      where: rangeWhere,
      select: financeRecordSelect
    }),
    prisma.financeSessionRecord.findMany({
      where: baseCompleted,
      select: {
        currency: true,
        professionalNetCents: true,
        purchase: {
          select: {
            fxArsPerUsdSnapshot: true
          }
        }
      }
    }),
    prisma.financeSessionRecord.findMany({
      where: {
        ...rangeWhere,
        payoutLine: { status: "PAID" }
      },
      select: {
        currency: true,
        professionalNetCents: true,
        purchase: {
          select: {
            fxArsPerUsdSnapshot: true
          }
        }
      }
    }),
    prisma.professionalProfile.findUnique({
      where: { id: actor.professionalProfileId },
      select: { market: true, residencyCountry: true }
    }),
    getFinanceRules()
  ]);

  const packageSessionIndexByBookingId = await buildPackageSessionIndexByBookingId(
    actor.professionalProfileId,
    movementRows.flatMap((row) => (row.purchaseId ? [row.purchaseId] : []))
  );

  const liveArsPerUsd = await getResilientUsdArsRate().catch(() => null);
  const liveFx = liveArsPerUsd != null && liveArsPerUsd > 0 ? { arsPerUsd: liveArsPerUsd } : {};
  const displayMarket =
    professionalProfileMarket?.market
    ?? professionalProfileMarket?.residencyCountry
    ?? "US";
  const display = buildProfessionalFinanceDisplay({
    market: displayMarket,
    liveFx,
    rangeRecords: rangeDisplayRows.map(mapFinanceRecordForDisplay),
    lifetimeRecords: lifetimeDisplayRows.map((row) => mapFinanceRecordForDisplay({
      ...row,
      sessionPriceCents: 0,
      platformFeeCents: 0
    }))
  });

  const grossCents = rangeAgg._sum.sessionPriceCents ?? 0;
  const platformFeeCents = rangeAgg._sum.platformFeeCents ?? 0;
  const professionalNetCents = rangeAgg._sum.professionalNetCents ?? 0;
  const completedSessions = rangeAgg._count;
  const averageNetPerSessionCents =
    completedSessions > 0 ? Math.round(professionalNetCents / completedSessions) : 0;

  const lifetimeProfessionalNetCents = lifetimeAgg._sum.professionalNetCents ?? 0;
  const lifetimeCompletedSessions = lifetimeAgg._count;

  const summaryByCurrency = rangeByCurrency.map((row) => ({
    currency: row.currency,
    grossCents: row._sum.sessionPriceCents ?? 0,
    platformFeeCents: row._sum.platformFeeCents ?? 0,
    professionalNetCents: row._sum.professionalNetCents ?? 0,
    sessions: row._count,
    averageNetPerSessionCents:
      row._count > 0 ? Math.round((row._sum.professionalNetCents ?? 0) / row._count) : 0
  }));

  const lifetimeByCurrency = lifetimeByCurrencyGroup.map((row) => ({
    currency: row.currency,
    professionalNetCents: row._sum.professionalNetCents ?? 0,
    sessions: row._count
  }));

  let collectedNetDisplayCents = 0;
  for (const row of collectedDisplayRows) {
    const mapped = mapFinanceRecordForDisplay({
      ...row,
      sessionPriceCents: 0,
      platformFeeCents: 0
    });
    const fx = resolveFxForFinanceRecord(mapped, display.currency, liveFx);
    collectedNetDisplayCents += convertFinanceMinorToDisplayMinor(
      row.professionalNetCents,
      row.currency,
      display.currency,
      fx,
      liveFx
    );
  }
  const pendingToCollectCents = Math.max(0, display.professionalNetCents - collectedNetDisplayCents);

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
    summaryByCurrency,
    lifetimeByCurrency,
    range: {
      from: statsFrom ? statsFrom.toISOString() : null,
      to: statsTo.toISOString(),
      allTime: statsAll || statsFrom === null
    },
    movements: movementRows.map((record) => {
      const mapped = mapFinanceRecordForDisplay(record);
      const fx = resolveFxForFinanceRecord(mapped, display.currency, liveFx);
      const packageCredits =
        record.purchase?.packageCreditsSnapshot ?? record.package?.credits ?? null;
      const packagePriceCents = record.purchase?.packagePriceCentsSnapshot ?? null;
      const fromPackage = Boolean(record.packageId);
      return {
        bookingId: record.bookingId,
        patientId: record.patientId,
        patientName: record.patient.user.fullName,
        startsAt: record.bookingStartsAt.toISOString(),
        endsAt: record.booking.endsAt.toISOString(),
        completedAt: record.bookingCompletedAt?.toISOString() ?? record.bookingStartsAt.toISOString(),
        isTrial: record.isTrial,
        pricingSource: fromPackage ? "package" : "list",
        packageId: record.packageId,
        packageName: record.package?.name ?? null,
        packageCredits,
        packagePriceCents,
        packageSessionNumber: record.purchaseId
          ? packageSessionIndexByBookingId.get(record.bookingId) ?? null
          : null,
        fxArsPerUsdUsed:
          display.currency === "ARS" && record.currency.toLowerCase() === "usd"
            ? fx
            : readSessionFxArsPerUsdSnapshot(mapped),
        grossCents: convertFinanceMinorToDisplayMinor(
          record.sessionPriceCents,
          record.currency,
          display.currency,
          fx,
          liveFx
        ),
        platformFeeCents: convertFinanceMinorToDisplayMinor(
          record.platformFeeCents,
          record.currency,
          display.currency,
          fx,
          liveFx
        ),
        amountCents: convertFinanceMinorToDisplayMinor(
          record.professionalNetCents,
          record.currency,
          display.currency,
          fx,
          liveFx
        ),
        status: record.bookingStatus.toLowerCase(),
        currency: display.currency.toLowerCase(),
        sourceCurrency: record.currency
      };
    }),
    movementsPagination: {
      page: movementsQuery.page,
      pageSize: movementsQuery.pageSize,
      total: movementsTotal,
      totalPages: Math.max(1, Math.ceil(movementsTotal / movementsQuery.pageSize))
    },
    display: {
      currency: display.currency,
      market: display.market,
      fxRates: display.fxRates,
      summary: {
        grossCents: display.grossCents,
        platformFeeCents: display.platformFeeCents,
        professionalNetCents: display.professionalNetCents,
        completedSessions: display.sessions,
        averageNetPerSessionCents: display.averageNetPerSessionCents,
        collectedNetCents: collectedNetDisplayCents,
        pendingToCollectCents,
        platformCommissionPercent: financeRules.platformCommissionPercent
      },
      lifetime: {
        professionalNetCents: display.lifetimeProfessionalNetCents,
        completedSessions: display.lifetimeCompletedSessions
      }
    }
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

  const stored =
    config?.value && typeof config.value === "object" && !Array.isArray(config.value)
      ? (config.value as Record<string, unknown>)
      : {};

  return res.json({
    data: {
      ...defaultProfessionalPayoutAdminData(),
      ...stored
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
  const existingConfig = await prisma.systemConfig.findUnique({ where: { key } });
  const existingValue =
    existingConfig?.value && typeof existingConfig.value === "object" && !Array.isArray(existingConfig.value)
      ? (existingConfig.value as Record<string, unknown>)
      : {};

  const payoutMethod = parsed.data.payoutMethod ?? (existingValue.payoutMethod as "dlocal" | "stripe" | undefined) ?? "stripe";
  if (parsed.data.taxId) {
    const taxError = validateTaxIdForProvider(payoutMethod, parsed.data.taxId);
    if (taxError) {
      return res.status(400).json({ error: taxError });
    }
  }
  if (parsed.data.payoutBankAccount) {
    const bankError = validatePayoutBankAccountForProvider(payoutMethod, parsed.data.payoutBankAccount);
    if (bankError) {
      return res.status(400).json({ error: bankError });
    }
  }

  const nextValue = {
    ...defaultProfessionalPayoutAdminData(),
    ...existingValue,
    ...parsed.data,
    legalAcceptedAt: parsed.data.legalAcceptedAt ?? (existingValue.legalAcceptedAt as string | null | undefined) ?? null,
    updatedByUserId: actor.userId,
    updatedAt: new Date().toISOString()
  };

  if (parsed.data.payoutBankAccount) {
    nextValue.payoutAccount = parsed.data.payoutBankAccount.accountValue;
  }

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

/* ========================================================================== */
/* Diario emocional compartido (Phase 3)                                       */
/* ========================================================================== */

/**
 * GET /api/professional/emotional-diary/patients
 *
 * Lista pacientes del profesional con entradas compartidas (published + share + !private).
 */
professionalRouter.get("/emotional-diary/patients", async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PROFESSIONAL" || !actor.professionalProfileId) {
    return res.status(403).json({ error: "Only professionals can access emotional diary" });
  }

  try {
    const items = await listPatientsWithSharedEntries(actor.professionalProfileId);
    return res.json({ items });
  } catch (err) {
    console.error("[professional/emotional-diary/patients] unexpected", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Error inesperado" });
  }
});

/**
 * GET /api/professional/patients/:patientId/emotional-diary
 *
 * Entradas compartidas del paciente. Requiere relación de booking pro↔paciente.
 */
professionalRouter.get("/patients/:patientId/emotional-diary", async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PROFESSIONAL" || !actor.professionalProfileId) {
    return res.status(403).json({ error: "Only professionals can access emotional diary" });
  }

  const patientId = req.params.patientId;
  if (!patientId) {
    return res.status(400).json({ error: "patientId is required" });
  }

  try {
    const entries = await listSharedEntriesForProfessional(actor.professionalProfileId, patientId);
    return res.json({ entries });
  } catch (err) {
    if (err instanceof EmotionalDiaryError && err.code === "FORBIDDEN") {
      return res.status(403).json({ error: "FORBIDDEN", message: err.message });
    }
    console.error("[professional/emotional-diary] unexpected", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Error inesperado" });
  }
});

/**
 * GET /api/professional/patients/:patientId/emotional-diary/summary
 *
 * Resumen de sesión (markdown) de entradas compartidas del paciente.
 */
professionalRouter.get("/patients/:patientId/emotional-diary/summary", async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PROFESSIONAL" || !actor.professionalProfileId) {
    return res.status(403).json({ error: "Only professionals can access emotional diary" });
  }

  const patientId = req.params.patientId;
  if (!patientId) {
    return res.status(400).json({ error: "patientId is required" });
  }

  try {
    const result = await getSessionSummaryForProfessional(actor.professionalProfileId, patientId);
    return res.json(result);
  } catch (err) {
    if (err instanceof EmotionalDiaryError && err.code === "FORBIDDEN") {
      return res.status(403).json({ error: "FORBIDDEN", message: err.message });
    }
    console.error("[professional/emotional-diary/summary] unexpected", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Error inesperado" });
  }
});
