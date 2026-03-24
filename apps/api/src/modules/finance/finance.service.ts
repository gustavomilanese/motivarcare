import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { financeRepository } from "./finance.repository.js";

const FINANCE_RULES_KEY = "finance-rules";

type FinanceRules = {
  platformCommissionPercent: number;
  trialPlatformPercent: number;
  defaultSessionPriceCents: number;
};

function roundCents(value: number): number {
  return Math.round(value);
}

function parseFinanceRules(value: unknown): FinanceRules {
  const parsed = value as Partial<FinanceRules> | undefined;
  return {
    platformCommissionPercent: typeof parsed?.platformCommissionPercent === "number" ? parsed.platformCommissionPercent : 25,
    trialPlatformPercent: typeof parsed?.trialPlatformPercent === "number" ? parsed.trialPlatformPercent : 100,
    defaultSessionPriceCents: typeof parsed?.defaultSessionPriceCents === "number" ? parsed.defaultSessionPriceCents : 9000
  };
}

export async function getFinanceRules(): Promise<FinanceRules> {
  const config = await financeRepository.findConfigByKey(FINANCE_RULES_KEY);
  return parseFinanceRules(config?.value);
}

export async function saveFinanceRules(input: Partial<FinanceRules>): Promise<FinanceRules> {
  const current = await getFinanceRules();
  const nextRules: FinanceRules = {
    platformCommissionPercent: input.platformCommissionPercent ?? current.platformCommissionPercent,
    trialPlatformPercent: input.trialPlatformPercent ?? current.trialPlatformPercent,
    defaultSessionPriceCents: input.defaultSessionPriceCents ?? current.defaultSessionPriceCents
  };
  await financeRepository.upsertConfigByKey(FINANCE_RULES_KEY, nextRules as unknown as Prisma.InputJsonValue);
  return nextRules;
}

export async function upsertFinanceRecordForBooking(bookingId: string): Promise<void> {
  const booking = await financeRepository.findBookingForFinance(bookingId);
  if (!booking) {
    return;
  }

  if (booking.status !== "COMPLETED") {
    await financeRepository.deleteFinanceRecordByBooking(bookingId);
    return;
  }

  const [rules, firstCompletedForPatient, purchaseById, purchases] = await Promise.all([
    getFinanceRules(),
    financeRepository.findFirstCompletedBookingByPatient(booking.patientId),
    booking.consumedPurchaseId ? financeRepository.findPurchaseById(booking.consumedPurchaseId) : Promise.resolve(null),
    financeRepository.findLatestPurchaseByPatientUntil(booking.patientId, booking.startsAt)
  ]);

  const isTrial = firstCompletedForPatient?.id === booking.id;
  const purchase = purchaseById ?? purchases[0] ?? null;
  const packageCurrency = purchase?.packageCurrencySnapshot?.toLowerCase() ?? purchase?.sessionPackage.currency?.toLowerCase() ?? "usd";
  const packageCredits = purchase?.packageCreditsSnapshot ?? purchase?.sessionPackage.credits ?? null;
  const packagePriceCents = purchase?.packagePriceCentsSnapshot ?? purchase?.sessionPackage.priceCents ?? null;
  const packageSessionPrice =
    packagePriceCents !== null && packageCredits !== null && packageCredits > 0
      ? roundCents(packagePriceCents / packageCredits)
      : null;
  const sessionPriceCents =
    packageSessionPrice
    ?? (booking.professional.sessionPriceUsd ? booking.professional.sessionPriceUsd * 100 : rules.defaultSessionPriceCents);
  const regularCommissionPercent = purchase?.platformCommissionPercentSnapshot ?? rules.platformCommissionPercent;
  const trialCommissionPercent = purchase?.trialPlatformPercentSnapshot ?? rules.trialPlatformPercent;
  const commissionPercent = isTrial ? trialCommissionPercent : regularCommissionPercent;
  const platformFeeCents = roundCents((sessionPriceCents * commissionPercent) / 100);
  const professionalNetCents = Math.max(0, sessionPriceCents - platformFeeCents);

  await financeRepository.upsertFinanceSessionRecord({
    bookingId: booking.id,
    patientId: booking.patientId,
    professionalId: booking.professionalId,
    packageId: purchase?.packageId ?? null,
    purchaseId: purchase?.id ?? null,
    isTrial,
    currency: packageCurrency,
    sessionPriceCents,
    platformCommissionPercent: commissionPercent,
    platformFeeCents,
    professionalNetCents,
    bookingStatus: booking.status,
    bookingCompletedAt: booking.completedAt ?? null,
    bookingStartsAt: booking.startsAt
  });

  await financeRepository.createOutboxEvent(
    "finance.session_record_upserted",
    "booking",
    booking.id,
    {
      bookingId: booking.id,
      patientId: booking.patientId,
      professionalId: booking.professionalId,
      sessionPriceCents,
      platformFeeCents,
      professionalNetCents,
      isTrial
    } as Prisma.InputJsonValue
  );
}

export async function rebuildFinanceRecords(): Promise<{ processed: number }> {
  const completedBookings = await financeRepository.findCompletedBookingIds();
  for (const booking of completedBookings) {
    await upsertFinanceRecordForBooking(booking.id);
  }
  return { processed: completedBookings.length };
}

export async function getFinanceOverview(params: {
  dateFrom?: string;
  dateTo?: string;
  professionalId?: string;
  patientId?: string;
  packageId?: string;
  isTrial?: "true" | "false";
  bookingStatus?: "REQUESTED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  search?: string;
  page?: number;
  pageSize?: number;
  cursor?: string;
  limit?: number;
}) {
  const where: any = {
    ...(params.dateFrom || params.dateTo
      ? {
          bookingCompletedAt: {
            ...(params.dateFrom ? { gte: new Date(`${params.dateFrom}T00:00:00.000Z`) } : {}),
            ...(params.dateTo ? { lte: new Date(`${params.dateTo}T23:59:59.999Z`) } : {})
          }
        }
      : {}),
    ...(params.professionalId ? { professionalId: params.professionalId } : {}),
    ...(params.patientId ? { patientId: params.patientId } : {}),
    ...(params.packageId ? { packageId: params.packageId } : {}),
    ...(params.isTrial ? { isTrial: params.isTrial === "true" } : {}),
    ...(params.bookingStatus ? { bookingStatus: params.bookingStatus } : {}),
    ...(params.search
      ? {
          OR: [
            { patient: { user: { fullName: { contains: params.search } } } },
            { patient: { user: { email: { contains: params.search } } } },
            { professional: { user: { fullName: { contains: params.search } } } },
            { professional: { user: { email: { contains: params.search } } } },
            { package: { name: { contains: params.search } } }
          ]
        }
      : {})
  };

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const skip = (page - 1) * pageSize;
  const cursorMode = typeof params.cursor === "string" && params.cursor.length > 0;
  const take = params.limit ?? pageSize;

  const [total, records, totals, byProfessionalRaw, byPatientRaw, byPackageRaw] = await Promise.all([
    prisma.financeSessionRecord.count({ where }),
    prisma.financeSessionRecord.findMany({
      where,
      include: {
        patient: { include: { user: { select: { fullName: true, email: true } } } },
        professional: { include: { user: { select: { fullName: true, email: true } } } },
        package: { select: { id: true, name: true, credits: true, priceCents: true, currency: true } }
      },
      orderBy: cursorMode ? [{ id: "desc" }] : [{ bookingCompletedAt: "desc" }, { createdAt: "desc" }],
      ...(cursorMode ? { cursor: { id: params.cursor }, skip: 1, take } : { skip, take: pageSize })
    }),
    prisma.financeSessionRecord.aggregate({
      where,
      _sum: {
        sessionPriceCents: true,
        platformFeeCents: true,
        professionalNetCents: true
      },
      _count: { _all: true }
    }),
    prisma.financeSessionRecord.groupBy({
      by: ["professionalId"],
      where,
      _sum: { sessionPriceCents: true, platformFeeCents: true, professionalNetCents: true },
      _count: { _all: true }
    }),
    prisma.financeSessionRecord.groupBy({
      by: ["patientId"],
      where,
      _sum: { sessionPriceCents: true, platformFeeCents: true, professionalNetCents: true },
      _count: { _all: true }
    }),
    prisma.financeSessionRecord.groupBy({
      by: ["packageId"],
      where,
      _sum: { sessionPriceCents: true, platformFeeCents: true, professionalNetCents: true },
      _count: { _all: true }
    })
  ]);

  const professionalIds = byProfessionalRaw.map((item) => item.professionalId);
  const patientIds = byPatientRaw.map((item) => item.patientId);
  const packageIds = byPackageRaw.map((item) => item.packageId).filter((id): id is string => Boolean(id));

  const [professionals, patients, packages] = await Promise.all([
    professionalIds.length
      ? prisma.professionalProfile.findMany({
          where: { id: { in: professionalIds } },
          include: { user: { select: { fullName: true, email: true } } }
        })
      : [],
    patientIds.length
      ? prisma.patientProfile.findMany({
          where: { id: { in: patientIds } },
          include: { user: { select: { fullName: true, email: true } } }
        })
      : [],
    packageIds.length
      ? prisma.sessionPackage.findMany({
          where: { id: { in: packageIds } },
          select: { id: true, name: true, credits: true, priceCents: true, currency: true }
        })
      : []
  ]);

  const professionalMap = new Map(professionals.map((item) => [item.id, item]));
  const patientMap = new Map(patients.map((item) => [item.id, item]));
  const packageMap = new Map(packages.map((item) => [item.id, item]));
  const nextCursor = cursorMode && records.length === take ? records[records.length - 1]?.id ?? null : null;

  return {
    page,
    pageSize: cursorMode ? take : pageSize,
    total,
    nextCursor,
    totals: {
      sessions: totals._count._all,
      grossCents: totals._sum.sessionPriceCents ?? 0,
      platformFeeCents: totals._sum.platformFeeCents ?? 0,
      professionalNetCents: totals._sum.professionalNetCents ?? 0
    },
    records: records.map((item) => ({
      id: item.id,
      bookingId: item.bookingId,
      bookingStatus: item.bookingStatus,
      bookingStartsAt: item.bookingStartsAt,
      bookingCompletedAt: item.bookingCompletedAt,
      isTrial: item.isTrial,
      currency: item.currency,
      sessionPriceCents: item.sessionPriceCents,
      platformCommissionPercent: item.platformCommissionPercent,
      platformFeeCents: item.platformFeeCents,
      professionalNetCents: item.professionalNetCents,
      patient: {
        id: item.patientId,
        fullName: item.patient.user.fullName,
        email: item.patient.user.email
      },
      professional: {
        id: item.professionalId,
        fullName: item.professional.user.fullName,
        email: item.professional.user.email
      },
      package: item.package
        ? {
            id: item.package.id,
            name: item.package.name,
            credits: item.package.credits,
            priceCents: item.package.priceCents,
            currency: item.package.currency
          }
        : null
    })),
    byProfessional: byProfessionalRaw.map((item) => {
      const professional = professionalMap.get(item.professionalId);
      return {
        professionalId: item.professionalId,
        professionalName: professional?.user.fullName ?? "Profesional",
        professionalEmail: professional?.user.email ?? "",
        sessions: item._count._all,
        grossCents: item._sum.sessionPriceCents ?? 0,
        platformFeeCents: item._sum.platformFeeCents ?? 0,
        professionalNetCents: item._sum.professionalNetCents ?? 0
      };
    }),
    byPatient: byPatientRaw.map((item) => {
      const patient = patientMap.get(item.patientId);
      return {
        patientId: item.patientId,
        patientName: patient?.user.fullName ?? "Paciente",
        patientEmail: patient?.user.email ?? "",
        sessions: item._count._all,
        grossCents: item._sum.sessionPriceCents ?? 0,
        platformFeeCents: item._sum.platformFeeCents ?? 0,
        professionalNetCents: item._sum.professionalNetCents ?? 0
      };
    }),
    byPackage: byPackageRaw.map((item) => {
      const sessionPackage = item.packageId ? packageMap.get(item.packageId) : null;
      return {
        packageId: item.packageId,
        packageName: sessionPackage?.name ?? "Sin paquete",
        sessions: item._count._all,
        grossCents: item._sum.sessionPriceCents ?? 0,
        platformFeeCents: item._sum.platformFeeCents ?? 0,
        professionalNetCents: item._sum.professionalNetCents ?? 0
      };
    })
  };
}

export async function listPayoutRuns(params: {
  status?: "DRAFT" | "CLOSED";
  page?: number;
  pageSize?: number;
  cursor?: string;
  limit?: number;
}) {
  const where = {
    ...(params.status ? { status: params.status } : {})
  };
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const cursorMode = typeof params.cursor === "string" && params.cursor.length > 0;
  const take = params.limit ?? pageSize;
  const skip = (page - 1) * pageSize;

  const [total, runs] = await Promise.all([
    prisma.financePayoutRun.count({ where }),
    prisma.financePayoutRun.findMany({
      where,
      include: { _count: { select: { payoutLines: true } } },
      orderBy: cursorMode ? [{ id: "desc" }] : [{ createdAt: "desc" }],
      ...(cursorMode ? { cursor: { id: params.cursor }, skip: 1, take } : { skip, take: pageSize })
    })
  ]);

  return {
    page,
    pageSize: cursorMode ? take : pageSize,
    total,
    nextCursor: cursorMode && runs.length === take ? runs[runs.length - 1]?.id ?? null : null,
    runs: runs.map((run) => ({
      id: run.id,
      idempotencyKey: run.idempotencyKey,
      periodStart: run.periodStart,
      periodEnd: run.periodEnd,
      status: run.status,
      totalGrossCents: run.totalGrossCents,
      totalFeeCents: run.totalFeeCents,
      totalNetCents: run.totalNetCents,
      notes: run.notes,
      createdAt: run.createdAt,
      closedAt: run.closedAt,
      payoutLinesCount: run._count.payoutLines
    }))
  };
}

export async function createPayoutRun(params: {
  periodStart: string;
  periodEnd: string;
  notes?: string;
  includePreviouslyPaid?: boolean;
  idempotencyKey?: string | null;
}) {
  const idempotencyKey = params.idempotencyKey?.trim() || null;
  if (idempotencyKey) {
    const existingByIdempotency = await prisma.financePayoutRun.findUnique({
      where: { idempotencyKey }
    });
    if (existingByIdempotency) {
      return {
        alreadyExists: true as const,
        run: existingByIdempotency
      };
    }
  }

  const periodStart = new Date(params.periodStart);
  const periodEnd = new Date(params.periodEnd);
  const eligibleWhere: any = {
    bookingStatus: "COMPLETED",
    bookingCompletedAt: {
      gte: periodStart,
      lte: periodEnd
    },
    ...(params.includePreviouslyPaid ? {} : { payoutLineId: null })
  };

  const eligibleRecords = await prisma.financeSessionRecord.findMany({
    where: eligibleWhere,
    orderBy: { bookingCompletedAt: "asc" }
  });

  if (eligibleRecords.length === 0) {
    return {
      alreadyExists: false as const,
      run: null,
      linesCount: 0,
      sessionsCount: 0
    };
  }

  const byProfessional = new Map<string, { sessionsCount: number; grossCents: number; platformFeeCents: number; professionalNetCents: number }>();
  for (const record of eligibleRecords) {
    const current = byProfessional.get(record.professionalId) ?? { sessionsCount: 0, grossCents: 0, platformFeeCents: 0, professionalNetCents: 0 };
    current.sessionsCount += 1;
    current.grossCents += record.sessionPriceCents;
    current.platformFeeCents += record.platformFeeCents;
    current.professionalNetCents += record.professionalNetCents;
    byProfessional.set(record.professionalId, current);
  }

  const result = await prisma.$transaction(async (tx) => {
    const run = await tx.financePayoutRun.create({
      data: {
        idempotencyKey,
        periodStart,
        periodEnd,
        status: "DRAFT",
        totalGrossCents: eligibleRecords.reduce((sum, record) => sum + record.sessionPriceCents, 0),
        totalFeeCents: eligibleRecords.reduce((sum, record) => sum + record.platformFeeCents, 0),
        totalNetCents: eligibleRecords.reduce((sum, record) => sum + record.professionalNetCents, 0),
        notes: params.notes?.trim() || null
      }
    });
    const lines = await Promise.all(
      Array.from(byProfessional.entries()).map(async ([professionalId, aggregate]) =>
        tx.financePayoutLine.create({
          data: {
            payoutRunId: run.id,
            professionalId,
            sessionsCount: aggregate.sessionsCount,
            grossCents: aggregate.grossCents,
            platformFeeCents: aggregate.platformFeeCents,
            professionalNetCents: aggregate.professionalNetCents,
            status: "PENDING"
          }
        })
      )
    );
    const lineByProfessional = new Map(lines.map((line) => [line.professionalId, line.id]));
    await Promise.all(
      eligibleRecords.map((record) =>
        tx.financeSessionRecord.update({
          where: { id: record.id },
          data: { payoutLineId: lineByProfessional.get(record.professionalId) ?? null }
        })
      )
    );
    await tx.outboxEvent.create({
      data: {
        eventType: "finance.payout_run_created",
        aggregateType: "financePayoutRun",
        aggregateId: run.id,
        payload: {
          runId: run.id,
          linesCount: lines.length,
          sessionsCount: eligibleRecords.length,
          totalNetCents: run.totalNetCents
        }
      }
    });
    return { run, linesCount: lines.length, sessionsCount: eligibleRecords.length };
  });

  return {
    alreadyExists: false as const,
    run: result.run,
    linesCount: result.linesCount,
    sessionsCount: result.sessionsCount
  };
}

export async function getPayoutRunDetail(runId: string) {
  return prisma.financePayoutRun.findUnique({
    where: { id: runId },
    include: {
      payoutLines: {
        include: {
          professional: { include: { user: { select: { fullName: true, email: true } } } },
          sessionRecords: {
            include: {
              patient: { include: { user: { select: { fullName: true, email: true } } } },
              package: { select: { id: true, name: true } }
            },
            orderBy: { bookingCompletedAt: "asc" }
          }
        },
        orderBy: { professionalNetCents: "desc" }
      }
    }
  });
}

export async function markPayoutLinePaid(lineId: string, payoutReference?: string, paidAt?: string) {
  const existing = await prisma.financePayoutLine.findUnique({
    where: { id: lineId },
    include: { payoutRun: true }
  });
  if (!existing) {
    return null;
  }
  if (existing.payoutRun.status === "CLOSED") {
    return { closedRun: true as const, payoutLine: null };
  }
  const resolvedPaidAt = paidAt ? new Date(paidAt) : new Date();
  const updated = await prisma.financePayoutLine.update({
    where: { id: existing.id },
    data: {
      status: "PAID",
      paidAt: resolvedPaidAt,
      payoutReference: payoutReference?.trim() || null
    }
  });
  await prisma.outboxEvent.create({
    data: {
      eventType: "finance.payout_line_paid",
      aggregateType: "financePayoutLine",
      aggregateId: updated.id,
      payload: {
        lineId: updated.id,
        payoutRunId: updated.payoutRunId,
        professionalId: updated.professionalId,
        professionalNetCents: updated.professionalNetCents,
        paidAt: resolvedPaidAt.toISOString()
      }
    }
  });
  return { closedRun: false as const, payoutLine: updated };
}

export async function closePayoutRun(runId: string) {
  const run = await prisma.financePayoutRun.findUnique({
    where: { id: runId },
    include: { payoutLines: true }
  });
  if (!run) {
    return { notFound: true as const };
  }
  if (run.status === "CLOSED") {
    return { alreadyClosed: true as const };
  }
  const pendingLines = run.payoutLines.filter((line) => line.status !== "PAID");
  if (pendingLines.length > 0) {
    return {
      hasPendingLines: true as const,
      pendingLineIds: pendingLines.map((line) => line.id)
    };
  }
  const updated = await prisma.financePayoutRun.update({
    where: { id: run.id },
    data: { status: "CLOSED", closedAt: new Date() }
  });
  await prisma.outboxEvent.create({
    data: {
      eventType: "finance.payout_run_closed",
      aggregateType: "financePayoutRun",
      aggregateId: updated.id,
      payload: {
        runId: updated.id,
        totalNetCents: updated.totalNetCents
      }
    }
  });
  return { run: updated };
}

export async function rebuildFinanceDailyAggregates() {
  const rows = await prisma.financeSessionRecord.groupBy({
    by: ["bookingCompletedAt", "currency"],
    where: {
      bookingStatus: "COMPLETED",
      bookingCompletedAt: { not: null }
    },
    _sum: {
      sessionPriceCents: true,
      platformFeeCents: true,
      professionalNetCents: true
    },
    _count: { _all: true }
  });

  await prisma.financeDailyAggregate.deleteMany({});
  for (const row of rows) {
    if (!row.bookingCompletedAt) {
      continue;
    }
    const day = new Date(row.bookingCompletedAt);
    const normalizedDay = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0, 0));
    await prisma.financeDailyAggregate.create({
      data: {
        day: normalizedDay,
        currency: row.currency,
        sessionsCount: row._count._all,
        grossCents: row._sum.sessionPriceCents ?? 0,
        platformFeeCents: row._sum.platformFeeCents ?? 0,
        professionalNetCents: row._sum.professionalNetCents ?? 0
      }
    });
  }

  return { processedDays: rows.length };
}

export async function getFinanceDailyAggregates(params: { dateFrom?: string; dateTo?: string; currency?: string }) {
  return prisma.financeDailyAggregate.findMany({
    where: {
      ...(params.currency ? { currency: params.currency.toLowerCase() } : {}),
      ...(params.dateFrom || params.dateTo
        ? {
            day: {
              ...(params.dateFrom ? { gte: new Date(`${params.dateFrom}T00:00:00.000Z`) } : {}),
              ...(params.dateTo ? { lte: new Date(`${params.dateTo}T23:59:59.999Z`) } : {})
            }
          }
        : {})
    },
    orderBy: [{ day: "asc" }, { currency: "asc" }]
  });
}

type StripeOutboxStatus = "PENDING" | "PROCESSING" | "PROCESSED" | "DEAD_LETTER";

function asStripeOutboxStatus(value: string): StripeOutboxStatus | "UNKNOWN" {
  if (value === "PENDING" || value === "PROCESSING" || value === "PROCESSED" || value === "DEAD_LETTER") {
    return value;
  }
  return "UNKNOWN";
}

export async function getStripeOutboxOperations(params: {
  status?: StripeOutboxStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const skip = (page - 1) * pageSize;
  const search = params.search?.trim();

  const where: Prisma.OutboxEventWhereInput = {
    eventType: {
      startsWith: "stripe."
    },
    ...(params.status ? { status: params.status } : {}),
    ...(params.dateFrom || params.dateTo
      ? {
          createdAt: {
            ...(params.dateFrom ? { gte: new Date(`${params.dateFrom}T00:00:00.000Z`) } : {}),
            ...(params.dateTo ? { lte: new Date(`${params.dateTo}T23:59:59.999Z`) } : {})
          }
        }
      : {}),
    ...(search
      ? {
          OR: [
            { eventType: { contains: search } },
            { aggregateId: { contains: search } },
            { dedupeKey: { contains: search } },
            { errorMessage: { contains: search } }
          ]
        }
      : {})
  };

  const baseWhere: Prisma.OutboxEventWhereInput = {
    eventType: {
      startsWith: "stripe."
    }
  };

  const [total, events, groupedByStatus, oldestPending] = await Promise.all([
    prisma.outboxEvent.count({ where }),
    prisma.outboxEvent.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip,
      take: pageSize
    }),
    prisma.outboxEvent.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { _all: true }
    }),
    prisma.outboxEvent.findFirst({
      where: { ...baseWhere, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true }
    })
  ]);

  const counts = {
    pending: 0,
    processing: 0,
    processed: 0,
    deadLetter: 0,
    total: 0
  };

  for (const row of groupedByStatus) {
    const status = asStripeOutboxStatus(row.status);
    if (status === "PENDING") {
      counts.pending += row._count._all;
    } else if (status === "PROCESSING") {
      counts.processing += row._count._all;
    } else if (status === "PROCESSED") {
      counts.processed += row._count._all;
    } else if (status === "DEAD_LETTER") {
      counts.deadLetter += row._count._all;
    }
    counts.total += row._count._all;
  }

  return {
    page,
    pageSize,
    total,
    summary: {
      ...counts,
      oldestPendingCreatedAt: oldestPending?.createdAt ?? null
    },
    events: events.map((event) => ({
      id: event.id,
      dedupeKey: event.dedupeKey,
      eventType: event.eventType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      status: asStripeOutboxStatus(event.status),
      attempts: event.attempts,
      availableAt: event.availableAt,
      processedAt: event.processedAt,
      errorMessage: event.errorMessage,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    }))
  };
}

export async function retryStripeOutboxEvent(eventId: string) {
  const existing = await prisma.outboxEvent.findUnique({
    where: { id: eventId }
  });

  if (!existing) {
    return { notFound: true as const };
  }

  if (!existing.eventType.startsWith("stripe.")) {
    return { notStripeEvent: true as const };
  }

  if (existing.status === "PROCESSED") {
    return { alreadyProcessed: true as const };
  }

  if (existing.status === "PROCESSING") {
    return { currentlyProcessing: true as const };
  }

  const updated = await prisma.outboxEvent.update({
    where: { id: existing.id },
    data: {
      status: "PENDING",
      availableAt: new Date(),
      processedAt: null,
      errorMessage: null
    }
  });

  return {
    event: {
      id: updated.id,
      status: updated.status,
      attempts: updated.attempts,
      availableAt: updated.availableAt
    }
  };
}
