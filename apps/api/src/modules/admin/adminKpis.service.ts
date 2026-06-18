import { prisma } from "../../lib/prisma.js";
import {
  convertFinanceMinorToUsdMinor,
  readSessionFxArsPerUsdSnapshot,
  resolvePurchasePriceUsdCents
} from "../../lib/professionalFinanceDisplay.js";
import { getResilientUsdArsRate } from "../../lib/usdArsExchangeResilient.js";
import { getFinanceRules, type FinanceRules } from "../finance/finance.service.js";

function splitPlatformFee(grossUsdCents: number, commissionPercent: number | null | undefined) {
  const pct = commissionPercent ?? 0;
  const platformFeeCents = Math.round((grossUsdCents * pct) / 100);
  return {
    platformFeeCents,
    professionalNetCents: Math.max(0, grossUsdCents - platformFeeCents)
  };
}

async function resolveLiveFx() {
  const liveArsPerUsd = await getResilientUsdArsRate().catch(() => null);
  return liveArsPerUsd != null && liveArsPerUsd > 0 ? { arsPerUsd: liveArsPerUsd } : {};
}

type FinanceRecordUsdRow = {
  currency: string;
  sessionPriceCents: number;
  platformFeeCents: number;
  professionalNetCents: number;
  purchase: { fxArsPerUsdSnapshot: unknown } | null;
};

function sumFinanceRecordsUsd(
  rows: FinanceRecordUsdRow[],
  liveFx: { arsPerUsd?: number | null }
): {
  grossCents: number;
  platformFeeCents: number;
  professionalNetCents: number;
  count: number;
} {
  let grossCents = 0;
  let platformFeeCents = 0;
  let professionalNetCents = 0;
  for (const row of rows) {
    const fx = readSessionFxArsPerUsdSnapshot({
      currency: row.currency,
      sessionPriceCents: row.sessionPriceCents,
      platformFeeCents: row.platformFeeCents,
      professionalNetCents: row.professionalNetCents,
      fxArsPerUsdSnapshot: row.purchase?.fxArsPerUsdSnapshot ?? null
    });
    grossCents += convertFinanceMinorToUsdMinor(row.sessionPriceCents, row.currency, fx, liveFx);
    platformFeeCents += convertFinanceMinorToUsdMinor(row.platformFeeCents, row.currency, fx, liveFx);
    professionalNetCents += convertFinanceMinorToUsdMinor(row.professionalNetCents, row.currency, fx, liveFx);
  }
  return { grossCents, platformFeeCents, professionalNetCents, count: rows.length };
}

const financeRecordUsdSelect = {
  currency: true,
  sessionPriceCents: true,
  platformFeeCents: true,
  professionalNetCents: true,
  professionalId: true,
  purchase: { select: { fxArsPerUsdSnapshot: true } }
} as const;

export type AdminUnpaidProfessionalUsd = {
  professionalId: string;
  professionalName: string;
  sessionsCount: number;
  grossCents: number;
  platformFeeCents: number;
  professionalNetCents: number;
};

export async function getAdminUnpaidProfessionalsUsd(input?: {
  professionalId?: string;
  patientId?: string;
}): Promise<AdminUnpaidProfessionalUsd[]> {
  const liveFx = await resolveLiveFx();
  const rows = await prisma.financeSessionRecord.findMany({
    where: {
      bookingStatus: "COMPLETED",
      payoutLineId: null,
      ...(input?.professionalId ? { professionalId: input.professionalId } : {}),
      ...(input?.patientId ? { patientId: input.patientId } : {})
    },
    select: financeRecordUsdSelect
  });

  const byProfessional = new Map<
    string,
    { grossCents: number; platformFeeCents: number; professionalNetCents: number; sessionsCount: number }
  >();

  for (const row of rows) {
    const fx = readSessionFxArsPerUsdSnapshot({
      currency: row.currency,
      sessionPriceCents: row.sessionPriceCents,
      platformFeeCents: row.platformFeeCents,
      professionalNetCents: row.professionalNetCents,
      fxArsPerUsdSnapshot: row.purchase?.fxArsPerUsdSnapshot ?? null
    });
    const gross = convertFinanceMinorToUsdMinor(row.sessionPriceCents, row.currency, fx, liveFx);
    const fee = convertFinanceMinorToUsdMinor(row.platformFeeCents, row.currency, fx, liveFx);
    const net = convertFinanceMinorToUsdMinor(row.professionalNetCents, row.currency, fx, liveFx);
    const current = byProfessional.get(row.professionalId) ?? {
      grossCents: 0,
      platformFeeCents: 0,
      professionalNetCents: 0,
      sessionsCount: 0
    };
    current.grossCents += gross;
    current.platformFeeCents += fee;
    current.professionalNetCents += net;
    current.sessionsCount += 1;
    byProfessional.set(row.professionalId, current);
  }

  if (byProfessional.size === 0) {
    return [];
  }

  const professionals = await prisma.professionalProfile.findMany({
    where: { id: { in: [...byProfessional.keys()] } },
    select: { id: true, user: { select: { fullName: true } } }
  });
  const nameById = new Map(professionals.map((pro) => [pro.id, pro.user.fullName]));

  return [...byProfessional.entries()]
    .map(([professionalId, totals]) => ({
      professionalId,
      professionalName: nameById.get(professionalId) ?? "Profesional",
      sessionsCount: totals.sessionsCount,
      grossCents: totals.grossCents,
      platformFeeCents: totals.platformFeeCents,
      professionalNetCents: totals.professionalNetCents
    }))
    .sort((a, b) => b.professionalNetCents - a.professionalNetCents);
}

export async function getAdminKpisUsd(input: {
  monthStart: Date;
  monthEnd: Date;
  monthKey: string;
  professionalId?: string;
  patientId?: string;
}) {
  const scopePro = input.professionalId;
  const scopePat = input.patientId;
  const hasEntityScope = Boolean(scopePro || scopePat);
  const financeRecordScope = {
    ...(scopePro ? { professionalId: scopePro } : {}),
    ...(scopePat ? { patientId: scopePat } : {})
  };

  const liveFx = await resolveLiveFx();

  const [
    activePatients,
    activeProfessionals,
    scheduledSessions,
    packagePurchasesMonthRows,
    trialBookingsMonthRows,
    financeMonthRows,
    financeAllTimeRows,
    unpaidFinanceRows,
    plannedMonthBookings,
    rules
  ] = await Promise.all([
    hasEntityScope && scopePat
      ? prisma.patientProfile
          .count({ where: { id: scopePat, status: "active" } })
          .then((n) => (n > 0 ? 1 : 0))
      : hasEntityScope && scopePro
        ? prisma.booking
            .groupBy({
              by: ["patientId"],
              where: {
                professionalId: scopePro,
                startsAt: { gte: input.monthStart, lte: input.monthEnd }
              }
            })
            .then((rows) => rows.length)
        : prisma.patientProfile.count({ where: { status: "active" } }),
    hasEntityScope && scopePro
      ? prisma.professionalProfile
          .count({ where: { id: scopePro, visible: true } })
          .then((n) => (n > 0 ? 1 : 0))
      : hasEntityScope && scopePat
        ? prisma.booking
            .groupBy({
              by: ["professionalId"],
              where: {
                patientId: scopePat,
                startsAt: { gte: input.monthStart, lte: input.monthEnd }
              }
            })
            .then((rows) => rows.length)
        : prisma.professionalProfile.count({ where: { visible: true } }),
    prisma.booking.count({
      where: {
        status: "CONFIRMED",
        startsAt: { gte: input.monthStart, lte: input.monthEnd },
        ...(scopePro ? { professionalId: scopePro } : {}),
        ...(scopePat ? { patientId: scopePat } : {})
      }
    }),
    prisma.patientPackagePurchase.findMany({
      where: {
        purchasedAt: { gte: input.monthStart, lte: input.monthEnd },
        ...(scopePat ? { patientId: scopePat } : {}),
        ...(scopePro ? { professionalIdSnapshot: scopePro } : {})
      },
      select: {
        packagePriceUsdCentsSnapshot: true,
        packagePriceCentsSnapshot: true,
        packageCurrencySnapshot: true,
        fxArsPerUsdSnapshot: true,
        platformCommissionPercentSnapshot: true
      }
    }),
    prisma.booking.findMany({
      where: {
        startsAt: { gte: input.monthStart, lte: input.monthEnd },
        OR: [{ consumedPurchaseId: null }, { consumedCredits: 0 }],
        AND: [
          { status: { in: ["CONFIRMED", "COMPLETED"] } },
          {
            OR: [
              { status: "CONFIRMED" },
              { AND: [{ status: "COMPLETED" }, { financeRecord: { is: null } }] }
            ]
          }
        ],
        ...(scopePro ? { professionalId: scopePro } : {}),
        ...(scopePat ? { patientId: scopePat } : {})
      },
      select: {
        professional: { select: { sessionPriceUsd: true } }
      }
    }),
    prisma.financeSessionRecord.findMany({
      where: {
        bookingCompletedAt: { not: null, gte: input.monthStart, lte: input.monthEnd },
        ...financeRecordScope
      },
      select: financeRecordUsdSelect
    }),
    prisma.financeSessionRecord.findMany({
      where: hasEntityScope ? financeRecordScope : {},
      select: financeRecordUsdSelect
    }),
    prisma.financeSessionRecord.findMany({
      where: {
        bookingStatus: "COMPLETED",
        payoutLineId: null,
        ...financeRecordScope
      },
      select: financeRecordUsdSelect
    }),
    prisma.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "REQUESTED"] },
        startsAt: { gte: input.monthStart, lte: input.monthEnd },
        ...(scopePro ? { professionalId: scopePro } : {}),
        ...(scopePat ? { patientId: scopePat } : {})
      },
      select: { professional: { select: { sessionPriceUsd: true } } }
    }),
    getFinanceRules()
  ]);

  let plannedGrossMonthCents = 0;
  let plannedPlatformFeeMonthCents = 0;
  let plannedProfessionalNetMonthCents = 0;
  for (const row of plannedMonthBookings) {
    const sessionPriceCents = resolveTrialSessionPriceUsdCents(row.professional.sessionPriceUsd, rules);
    const fee = Math.round((sessionPriceCents * rules.platformCommissionPercent) / 100);
    plannedGrossMonthCents += sessionPriceCents;
    plannedPlatformFeeMonthCents += fee;
    plannedProfessionalNetMonthCents += Math.max(0, sessionPriceCents - fee);
  }

  let packagePurchasesMonthCents = 0;
  let packagePlatformFeeFromPurchasesMonthCents = 0;
  let packageProfessionalNetFromPurchasesMonthCents = 0;
  for (const row of packagePurchasesMonthRows) {
    const priceUsd = resolvePurchasePriceUsdCents(row);
    if (priceUsd <= 0) {
      continue;
    }
    packagePurchasesMonthCents += priceUsd;
    const pct = row.platformCommissionPercentSnapshot ?? rules.platformCommissionPercent;
    const split = splitPlatformFee(priceUsd, pct);
    packagePlatformFeeFromPurchasesMonthCents += split.platformFeeCents;
    packageProfessionalNetFromPurchasesMonthCents += split.professionalNetCents;
  }
  const packagePurchasesMonthCount = packagePurchasesMonthRows.filter(
    (row) => resolvePurchasePriceUsdCents(row) > 0
  ).length;

  let trialGrossMonthCents = 0;
  let trialPlatformFeeMonthCents = 0;
  let trialProfessionalNetMonthCents = 0;
  const trialPct = rules.trialPlatformPercent;
  for (const row of trialBookingsMonthRows) {
    const sessionPriceCents = resolveTrialSessionPriceUsdCents(row.professional.sessionPriceUsd, rules);
    const fee = Math.round((sessionPriceCents * trialPct) / 100);
    trialGrossMonthCents += sessionPriceCents;
    trialPlatformFeeMonthCents += fee;
    trialProfessionalNetMonthCents += Math.max(0, sessionPriceCents - fee);
  }
  const trialSessionsMonthCount = trialBookingsMonthRows.length;

  const monthFinance = sumFinanceRecordsUsd(financeMonthRows, liveFx);
  const allTimeFinance = sumFinanceRecordsUsd(financeAllTimeRows, liveFx);
  const unpaidFinance = sumFinanceRecordsUsd(unpaidFinanceRows, liveFx);
  const unpaidByProfessional = await getAdminUnpaidProfessionalsUsd({
    professionalId: scopePro,
    patientId: scopePat
  });

  const platformFeeMonthCents = monthFinance.platformFeeCents;
  const professionalNetMonthCents = monthFinance.professionalNetCents;
  const grossSessionsMonthCents = monthFinance.grossCents;

  return {
    currency: "usd" as const,
    kpis: {
      activePatients,
      activeProfessionals,
      scheduledSessions,
      monthlyRevenueCents: platformFeeMonthCents,
      packagePurchasesMonthCents,
      packagePurchasesMonthCount,
      packagePlatformFeeFromPurchasesMonthCents,
      packageProfessionalNetFromPurchasesMonthCents,
      trialSessionsMonthCount,
      trialGrossMonthCents,
      trialPlatformFeeMonthCents,
      trialProfessionalNetMonthCents,
      trialPlatformPercentApplied: trialPct,
      platformFeeMonthCents,
      professionalNetMonthCents,
      grossSessionsMonthCents,
      completedSessionsMonthCount: monthFinance.count,
      platformFeeAllTimeCents: allTimeFinance.platformFeeCents,
      professionalNetUnpaidCents: unpaidFinance.professionalNetCents,
      unpaidSessionRecordsCount: unpaidFinance.count,
      platformFeeUnpaidCents: unpaidFinance.platformFeeCents,
      plannedMonetizableSessionsMonthCount: plannedMonthBookings.length,
      plannedGrossMonthCents,
      plannedPlatformFeeMonthCents,
      plannedProfessionalNetMonthCents
    },
    unpaidByProfessional,
    period: {
      month: input.monthKey,
      monthStart: input.monthStart.toISOString(),
      monthEnd: input.monthEnd.toISOString()
    }
  };
}

function resolveTrialSessionPriceUsdCents(sessionPriceUsd: number | null, rules: FinanceRules): number {
  return sessionPriceUsd != null ? Math.round(sessionPriceUsd * 100) : rules.defaultSessionPriceCents;
}
