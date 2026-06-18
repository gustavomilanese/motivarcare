import {
  buildMovementsWhere,
  buildPackageSessionIndexByBookingId,
  movementsOrderBy,
  parseMovementsListQuery
} from "../../lib/financeMovementsQuery.js";
import {
  financeCompletedReferenceWhere,
  firstQueryString,
  packagePurchasedAtRangeWhere,
  parseProfessionalStatsRange
} from "../../lib/financeStatsRange.js";
import { prisma } from "../../lib/prisma.js";
import {
  convertFinanceMinorToUsdMinor,
  mapFinanceRecordForDisplay,
  readSessionFxArsPerUsdSnapshot,
  resolvePurchasePriceUsdCents
} from "../../lib/professionalFinanceDisplay.js";
import { getResilientUsdArsRate } from "../../lib/usdArsExchangeResilient.js";
import { getFinanceRules } from "./finance.service.js";

const BOOKING_STATUS_COMPLETED = "COMPLETED" as const;

function parsePurchasesListQuery(query: Record<string, unknown>) {
  const pageRaw = Number.parseInt(String(query.purchasesPage ?? "1"), 10);
  const pageSizeRaw = Number.parseInt(String(query.purchasesPageSize ?? "25"), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const pageSize =
    Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.min(100, pageSizeRaw) : 25;
  const sortRaw = String(query.purchasesSort ?? "");
  const sort =
    sortRaw === "date_asc" || sortRaw === "gross_desc" || sortRaw === "gross_asc"
      ? sortRaw
      : "date_desc";
  return {
    page,
    pageSize,
    search: String(query.purchasesSearch ?? "").trim(),
    sort: sort as "date_desc" | "date_asc" | "gross_desc" | "gross_asc"
  };
}

function purchasesOrderBy(sort: ReturnType<typeof parsePurchasesListQuery>["sort"]) {
  switch (sort) {
    case "date_asc":
      return [{ purchasedAt: "asc" as const }];
    case "gross_desc":
      return [{ packagePriceUsdCentsSnapshot: "desc" as const }, { purchasedAt: "desc" as const }];
    case "gross_asc":
      return [{ packagePriceUsdCentsSnapshot: "asc" as const }, { purchasedAt: "desc" as const }];
    default:
      return [{ purchasedAt: "desc" as const }];
  }
}

function buildPurchasesWhere(input: {
  statsFrom: Date | null;
  statsTo: Date;
  professionalId?: string;
  patientId?: string;
  purchases: ReturnType<typeof parsePurchasesListQuery>;
  searchProfessionalIds?: string[];
}) {
  return {
    ...packagePurchasedAtRangeWhere(input.statsFrom, input.statsTo),
    ...(input.professionalId ? { professionalIdSnapshot: input.professionalId } : {}),
    ...(input.patientId ? { patientId: input.patientId } : {}),
    ...(input.purchases.search
      ? {
          OR: [
            {
              patient: {
                user: {
                  fullName: { contains: input.purchases.search }
                }
              }
            },
            {
              packageNameSnapshot: { contains: input.purchases.search }
            },
            ...(input.searchProfessionalIds && input.searchProfessionalIds.length > 0
              ? [{ professionalIdSnapshot: { in: input.searchProfessionalIds } }]
              : [])
          ]
        }
      : {})
  };
}

function splitPlatformFee(grossUsdCents: number, commissionPercent: number | null | undefined) {
  const pct = commissionPercent ?? 0;
  const platformFeeCents = Math.round((grossUsdCents * pct) / 100);
  return {
    platformFeeCents,
    professionalNetCents: Math.max(0, grossUsdCents - platformFeeCents)
  };
}

export async function getAdminPlatformExecutedEarnings(query: Record<string, unknown>) {
  const { statsFrom, statsTo, statsAll } = parseProfessionalStatsRange(query);
  const professionalId = firstQueryString(query.professionalId);
  const patientId = firstQueryString(query.patientId);
  const movementsQuery = parseMovementsListQuery(query);

  const baseCompleted = {
    bookingStatus: BOOKING_STATUS_COMPLETED,
    ...(professionalId ? { professionalId } : {}),
    ...(patientId ? { patientId } : {})
  };

  const rangeWhere = {
    ...baseCompleted,
    ...financeCompletedReferenceWhere(statsFrom, statsTo)
  };

  const movementsWhere = buildMovementsWhere({
    baseCompleted,
    statsFrom,
    statsTo,
    movements: movementsQuery,
    professionalId,
    patientId
  });

  const movementsSkip = (movementsQuery.page - 1) * movementsQuery.pageSize;
  const liveArsPerUsd = await getResilientUsdArsRate().catch(() => null);
  const liveFx = liveArsPerUsd != null && liveArsPerUsd > 0 ? { arsPerUsd: liveArsPerUsd } : {};

  const financeRecordSelect = {
    currency: true,
    sessionPriceCents: true,
    platformFeeCents: true,
    professionalNetCents: true,
    purchase: { select: { fxArsPerUsdSnapshot: true } }
  } as const;

  const [rangeRows, movementRows, movementsTotal, financeRules] = await Promise.all([
    prisma.financeSessionRecord.findMany({
      where: rangeWhere,
      select: financeRecordSelect
    }),
    prisma.financeSessionRecord.findMany({
      where: movementsWhere,
      include: {
        patient: { include: { user: { select: { fullName: true } } } },
        professional: { include: { user: { select: { fullName: true } } } },
        purchase: {
          select: {
            fxArsPerUsdSnapshot: true,
            packagePriceCentsSnapshot: true,
            packageCreditsSnapshot: true
          }
        },
        package: { select: { name: true, credits: true } },
        booking: { select: { endsAt: true } }
      },
      orderBy: movementsOrderBy(movementsQuery.sort),
      skip: movementsSkip,
      take: movementsQuery.pageSize
    }),
    prisma.financeSessionRecord.count({ where: movementsWhere }),
    getFinanceRules()
  ]);

  let grossCents = 0;
  let platformFeeCents = 0;
  let professionalNetCents = 0;
  for (const row of rangeRows) {
    const mapped = mapFinanceRecordForDisplay(row);
    const fx = readSessionFxArsPerUsdSnapshot(mapped);
    grossCents += convertFinanceMinorToUsdMinor(row.sessionPriceCents, row.currency, fx, liveFx);
    platformFeeCents += convertFinanceMinorToUsdMinor(row.platformFeeCents, row.currency, fx, liveFx);
    professionalNetCents += convertFinanceMinorToUsdMinor(row.professionalNetCents, row.currency, fx, liveFx);
  }

  const packageSessionIndexByBookingId = await buildPackageSessionIndexByBookingId(
    movementRows.flatMap((row) => (row.purchaseId ? [row.purchaseId] : []))
  );

  const completedSessions = rangeRows.length;

  return {
    currency: "usd",
    range: {
      from: statsFrom ? statsFrom.toISOString() : null,
      to: statsTo.toISOString(),
      allTime: statsAll || statsFrom === null
    },
    summary: {
      grossCents,
      platformFeeCents,
      professionalNetCents,
      completedSessions,
      platformCommissionPercent: financeRules.platformCommissionPercent
    },
    movements: movementRows.map((record) => {
      const mapped = mapFinanceRecordForDisplay(record);
      const fx = readSessionFxArsPerUsdSnapshot(mapped);
      const packageCredits =
        record.purchase?.packageCreditsSnapshot ?? record.package?.credits ?? null;
      const fromPackage = Boolean(record.packageId);
      return {
        bookingId: record.bookingId,
        patientId: record.patientId,
        patientName: record.patient.user.fullName,
        professionalId: record.professionalId,
        professionalName: record.professional.user.fullName,
        startsAt: record.bookingStartsAt.toISOString(),
        endsAt: record.booking.endsAt.toISOString(),
        completedAt: record.bookingCompletedAt?.toISOString() ?? record.bookingStartsAt.toISOString(),
        isTrial: record.isTrial,
        pricingSource: fromPackage ? "package" : "list",
        packageName: record.package?.name ?? null,
        packageCredits,
        packageSessionNumber: record.purchaseId
          ? packageSessionIndexByBookingId.get(record.bookingId) ?? null
          : null,
        grossCents: convertFinanceMinorToUsdMinor(record.sessionPriceCents, record.currency, fx, liveFx),
        platformFeeCents: convertFinanceMinorToUsdMinor(record.platformFeeCents, record.currency, fx, liveFx),
        amountCents: convertFinanceMinorToUsdMinor(record.professionalNetCents, record.currency, fx, liveFx),
        currency: "usd",
        sourceCurrency: record.currency
      };
    }),
    movementsPagination: {
      page: movementsQuery.page,
      pageSize: movementsQuery.pageSize,
      total: movementsTotal,
      totalPages: Math.max(1, Math.ceil(movementsTotal / movementsQuery.pageSize))
    }
  };
}

export async function getAdminPlatformPackagePurchases(query: Record<string, unknown>) {
  const { statsFrom, statsTo, statsAll } = parseProfessionalStatsRange(query);
  const professionalId = firstQueryString(query.professionalId);
  const patientId = firstQueryString(query.patientId);
  const purchasesQuery = parsePurchasesListQuery(query);

  const searchProfessionalIds =
    purchasesQuery.search.length > 0
      ? (
          await prisma.professionalProfile.findMany({
            where: {
              user: {
                fullName: { contains: purchasesQuery.search }
              }
            },
            select: { id: true }
          })
        ).map((row) => row.id)
      : [];

  const purchasesWhere = buildPurchasesWhere({
    statsFrom,
    statsTo,
    professionalId,
    patientId,
    purchases: purchasesQuery,
    searchProfessionalIds
  });

  const purchasesSkip = (purchasesQuery.page - 1) * purchasesQuery.pageSize;

  const [allRangePurchases, purchaseRows, purchasesTotal, financeRules] = await Promise.all([
    prisma.patientPackagePurchase.findMany({
      where: {
        ...packagePurchasedAtRangeWhere(statsFrom, statsTo),
        ...(professionalId ? { professionalIdSnapshot: professionalId } : {}),
        ...(patientId ? { patientId } : {})
      },
      select: {
        packagePriceUsdCentsSnapshot: true,
        packagePriceCentsSnapshot: true,
        packageCurrencySnapshot: true,
        fxArsPerUsdSnapshot: true,
        platformCommissionPercentSnapshot: true
      }
    }),
    prisma.patientPackagePurchase.findMany({
      where: purchasesWhere,
      include: {
        patient: { include: { user: { select: { fullName: true } } } },
        sessionPackage: { select: { name: true, credits: true } }
      },
      orderBy: purchasesOrderBy(purchasesQuery.sort),
      skip: purchasesSkip,
      take: purchasesQuery.pageSize
    }),
    prisma.patientPackagePurchase.count({ where: purchasesWhere }),
    getFinanceRules()
  ]);

  const professionalIds = [
    ...new Set(purchaseRows.map((row) => row.professionalIdSnapshot).filter(Boolean) as string[])
  ];
  const professionalsById = new Map<string, string>();
  if (professionalIds.length > 0) {
    const professionals = await prisma.professionalProfile.findMany({
      where: { id: { in: professionalIds } },
      select: { id: true, user: { select: { fullName: true } } }
    });
    for (const pro of professionals) {
      professionalsById.set(pro.id, pro.user.fullName);
    }
  }

  let grossCents = 0;
  let platformFeeCents = 0;
  let professionalNetCents = 0;
  for (const row of allRangePurchases) {
    const priceUsd = resolvePurchasePriceUsdCents(row);
    if (priceUsd <= 0) {
      continue;
    }
    const split = splitPlatformFee(
      priceUsd,
      row.platformCommissionPercentSnapshot ?? financeRules.platformCommissionPercent
    );
    grossCents += priceUsd;
    platformFeeCents += split.platformFeeCents;
    professionalNetCents += split.professionalNetCents;
  }

  return {
    currency: "usd",
    range: {
      from: statsFrom ? statsFrom.toISOString() : null,
      to: statsTo.toISOString(),
      allTime: statsAll || statsFrom === null
    },
    summary: {
      grossCents,
      platformFeeCents,
      professionalNetCents,
      purchaseCount: allRangePurchases.length,
      platformCommissionPercent: financeRules.platformCommissionPercent
    },
    purchases: purchaseRows.map((row) => {
      const grossUsd = resolvePurchasePriceUsdCents(row);
      const split = splitPlatformFee(
        grossUsd,
        row.platformCommissionPercentSnapshot ?? financeRules.platformCommissionPercent
      );
      const proId = row.professionalIdSnapshot;
      return {
        purchaseId: row.id,
        purchasedAt: row.purchasedAt.toISOString(),
        patientId: row.patientId,
        patientName: row.patient.user.fullName,
        professionalId: proId,
        professionalName: proId ? professionalsById.get(proId) ?? "—" : "—",
        packageName: row.packageNameSnapshot ?? row.sessionPackage.name,
        packageCredits: row.packageCreditsSnapshot ?? row.sessionPackage.credits,
        totalCredits: row.totalCredits,
        remainingCredits: row.remainingCredits,
        grossCents: grossUsd,
        platformFeeCents: split.platformFeeCents,
        professionalNetCents: split.professionalNetCents,
        currency: "usd"
      };
    }),
    purchasesPagination: {
      page: purchasesQuery.page,
      pageSize: purchasesQuery.pageSize,
      total: purchasesTotal,
      totalPages: Math.max(1, Math.ceil(purchasesTotal / purchasesQuery.pageSize))
    }
  };
}
