import {
  dlocalPayoutBankCodes,
  dlocalPayoutCurrencyForCountry,
  normalizePayoutCountry,
  type DlocalPayoutCountry
} from "@therapy/types";
import {
  convertFinanceMinorToUsdMinor,
  readSessionFxArsPerUsdSnapshot
} from "../../lib/professionalFinanceDisplay.js";
import { isDlocalGoConfigured } from "../../lib/dlocalGoPayouts.js";
import { prisma } from "../../lib/prisma.js";
import { payoutEligibleSessionWhere, shouldReleaseSessionsAfterDlocalFailure } from "../../lib/payoutEligibleSessions.js";
import {
  buildPackageSessionIndexByBookingId,
  formatPackageSessionSourceLabel
} from "../../lib/packageSessionAttribution.js";
import {
  parsePayoutLineSessionSnapshot,
  type PayoutLineSessionSnapshotItem
} from "../../lib/payoutLineSessionSnapshot.js";
import { getResilientUsdArsRate } from "../../lib/usdArsExchangeResilient.js";
import { getUsdDisplayFxRates } from "../../lib/usdDisplayFxRates.js";
import {
  assessPayoutReadiness,
  createProfessionalPayout,
  loadProfessionalPayoutAdmin,
  ProfessionalPayoutError
} from "../payouts/professionalPayouts.service.js";
import { applyDlocalStatusToPayoutLine } from "./payoutRunDlocal.service.js";
import { payProfessionalUnpaidBalance } from "./finance.service.js";

const LOG_PREFIX = "[finance-payout]";

async function resolveLiveFx() {
  const liveArsPerUsd = await getResilientUsdArsRate().catch(() => null);
  return liveArsPerUsd != null && liveArsPerUsd > 0 ? { arsPerUsd: liveArsPerUsd } : {};
}

export function utcMonthKeyFromDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function parseUnpaidMonthKeys(raw: string | null | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  return [
    ...new Set(
      raw
        .split(",")
        .map((part) => part.trim())
        .filter((part) => /^\d{4}-\d{2}$/.test(part))
    )
  ].sort();
}

function financeRecordMonthKey(row: {
  bookingCompletedAt: Date | null;
  bookingStartsAt: Date;
}): string {
  return utcMonthKeyFromDate(row.bookingCompletedAt ?? row.bookingStartsAt);
}

type MoneyTotals = {
  sessionsCount: number;
  grossUsdCents: number;
  platformFeeUsdCents: number;
  professionalNetUsdCents: number;
};

function emptyTotals(): MoneyTotals {
  return {
    sessionsCount: 0,
    grossUsdCents: 0,
    platformFeeUsdCents: 0,
    professionalNetUsdCents: 0
  };
}

function addTotals(target: MoneyTotals, gross: number, fee: number, net: number): void {
  target.sessionsCount += 1;
  target.grossUsdCents += gross;
  target.platformFeeUsdCents += fee;
  target.professionalNetUsdCents += net;
}

export type UnpaidMonthBucket = {
  monthKey: string;
} & MoneyTotals;

export type UnpaidProfessionalListRow = {
  professionalId: string;
  professionalName: string;
  sessionsCount: number;
  grossCents: number;
  platformFeeCents: number;
  professionalNetCents: number;
};

export type UnpaidProfessionalsOverview = {
  selectedMonths: string[];
  months: UnpaidMonthBucket[];
  totals: MoneyTotals;
  professionals: UnpaidProfessionalListRow[];
};

export async function listUnpaidProfessionalsOverview(input?: {
  months?: string[];
}): Promise<UnpaidProfessionalsOverview> {
  const selectedMonths = [...new Set((input?.months ?? []).filter((m) => /^\d{4}-\d{2}$/.test(m)))].sort();
  const liveFx = await resolveLiveFx();

  const rows = await prisma.financeSessionRecord.findMany({
    where: payoutEligibleSessionWhere,
    select: {
      currency: true,
      sessionPriceCents: true,
      platformFeeCents: true,
      professionalNetCents: true,
      professionalId: true,
      bookingCompletedAt: true,
      bookingStartsAt: true,
      purchase: { select: { fxArsPerUsdSnapshot: true } }
    }
  });

  const byMonth = new Map<string, MoneyTotals>();
  const byProfessional = new Map<string, MoneyTotals>();
  const selectionTotals = emptyTotals();

  for (const row of rows) {
    const monthKey = financeRecordMonthKey(row);
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

    const monthBucket = byMonth.get(monthKey) ?? emptyTotals();
    addTotals(monthBucket, gross, fee, net);
    byMonth.set(monthKey, monthBucket);

    const inSelection = selectedMonths.length === 0 || selectedMonths.includes(monthKey);
    if (!inSelection) {
      continue;
    }
    addTotals(selectionTotals, gross, fee, net);
    const proBucket = byProfessional.get(row.professionalId) ?? emptyTotals();
    addTotals(proBucket, gross, fee, net);
    byProfessional.set(row.professionalId, proBucket);
  }

  const months: UnpaidMonthBucket[] = [...byMonth.entries()]
    .map(([monthKey, totals]) => ({ monthKey, ...totals }))
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  let professionals: UnpaidProfessionalListRow[] = [];
  if (byProfessional.size > 0) {
    const profiles = await prisma.professionalProfile.findMany({
      where: { id: { in: [...byProfessional.keys()] } },
      select: { id: true, user: { select: { fullName: true } } }
    });
    const nameById = new Map(profiles.map((pro) => [pro.id, pro.user.fullName]));
    professionals = [...byProfessional.entries()]
      .map(([professionalId, totals]) => ({
        professionalId,
        professionalName: nameById.get(professionalId) ?? "Profesional",
        sessionsCount: totals.sessionsCount,
        grossCents: totals.grossUsdCents,
        platformFeeCents: totals.platformFeeUsdCents,
        professionalNetCents: totals.professionalNetUsdCents
      }))
      .sort((a, b) => b.professionalNetCents - a.professionalNetCents);
  }

  return {
    selectedMonths,
    months,
    totals: selectionTotals,
    professionals
  };
}

/** Líneas que Admin ve en “Enviado a dLocal”: en vuelo o con payout_id. Los FAILED sin ID no: nunca salieron y vuelven a Por enviar. */
export const dlocalSentPayoutLineWhere = {
  OR: [{ dlocalPayoutId: { not: null } }, { status: "SUBMITTED" }]
};

export type DlocalTransferDisplayStatus = "in_transit" | "delivered" | "failed";

export function resolveDlocalTransferDisplayStatus(input: {
  status: string;
  dlocalStatus: string | null;
}): DlocalTransferDisplayStatus {
  const dlocal = (input.dlocalStatus ?? "").trim().toUpperCase();
  if (
    input.status === "PAID"
    || dlocal === "DELIVERED"
    || dlocal === "COMPLETED"
  ) {
    return "delivered";
  }
  if (
    input.status === "FAILED"
    || dlocal === "FAILED"
    || dlocal === "REJECTED"
    || dlocal === "CANCELLED"
  ) {
    return "failed";
  }
  return "in_transit";
}

export type DlocalPayoutTransferRow = {
  id: string;
  professionalId: string;
  professionalName: string;
  sessionsCount: number;
  grossUsdCents: number;
  platformFeeUsdCents: number;
  professionalNetUsdCents: number;
  status: string;
  displayStatus: DlocalTransferDisplayStatus;
  dlocalPayoutId: string | null;
  dlocalStatus: string | null;
  submissionError: string | null;
  payoutReference: string | null;
  createdAt: string;
  paidAt: string | null;
};

function usdTripleFromFinanceRow(
  row: {
    currency: string;
    sessionPriceCents: number;
    platformFeeCents: number;
    professionalNetCents: number;
    fxArsPerUsdSnapshot?: unknown;
  },
  liveFx: Awaited<ReturnType<typeof resolveLiveFx>>
) {
  const fx = readSessionFxArsPerUsdSnapshot({
    currency: row.currency,
    sessionPriceCents: row.sessionPriceCents,
    platformFeeCents: row.platformFeeCents,
    professionalNetCents: row.professionalNetCents,
    fxArsPerUsdSnapshot: row.fxArsPerUsdSnapshot ?? null
  });
  return {
    grossUsdCents: convertFinanceMinorToUsdMinor(row.sessionPriceCents, row.currency, fx, liveFx),
    platformFeeUsdCents: convertFinanceMinorToUsdMinor(row.platformFeeCents, row.currency, fx, liveFx),
    professionalNetUsdCents: convertFinanceMinorToUsdMinor(row.professionalNetCents, row.currency, fx, liveFx)
  };
}

function payoutStatusForSentLine(status: string, paidAt: Date | null): UnpaidProfessionalSessionRow["payoutStatus"] {
  if (status === "PAID" || paidAt != null) {
    return "paid";
  }
  return "pending";
}

export async function listDlocalPayoutTransfers(input?: {
  months?: string[];
}): Promise<{ selectedMonths: string[]; transfers: DlocalPayoutTransferRow[] }> {
  const selectedMonths = [...new Set((input?.months ?? []).filter((m) => /^\d{4}-\d{2}$/.test(m)))].sort();
  const liveFx = await resolveLiveFx();

  const lines = await prisma.financePayoutLine.findMany({
    where: dlocalSentPayoutLineWhere,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      professional: { select: { user: { select: { fullName: true } } } },
      sessionRecords: {
        select: {
          currency: true,
          sessionPriceCents: true,
          platformFeeCents: true,
          professionalNetCents: true,
          bookingCompletedAt: true,
          bookingStartsAt: true,
          purchase: { select: { fxArsPerUsdSnapshot: true } }
        }
      }
    }
  });

  const transfers: DlocalPayoutTransferRow[] = [];
  for (const line of lines) {
    const createdMonth = utcMonthKeyFromDate(line.createdAt);
    if (selectedMonths.length > 0 && !selectedMonths.includes(createdMonth)) {
      continue;
    }

    let grossUsdCents = 0;
    let platformFeeUsdCents = 0;
    let professionalNetUsdCents = 0;
    if (line.sessionRecords.length > 0) {
      for (const row of line.sessionRecords) {
        const usd = usdTripleFromFinanceRow(
          {
            currency: row.currency,
            sessionPriceCents: row.sessionPriceCents,
            platformFeeCents: row.platformFeeCents,
            professionalNetCents: row.professionalNetCents,
            fxArsPerUsdSnapshot: row.purchase?.fxArsPerUsdSnapshot ?? null
          },
          liveFx
        );
        grossUsdCents += usd.grossUsdCents;
        platformFeeUsdCents += usd.platformFeeUsdCents;
        professionalNetUsdCents += usd.professionalNetUsdCents;
      }
    } else {
      const snapshot = parsePayoutLineSessionSnapshot(line.sessionSnapshot);
      if (snapshot.length > 0) {
        for (const row of snapshot) {
          const usd = usdTripleFromFinanceRow(row, liveFx);
          grossUsdCents += usd.grossUsdCents;
          platformFeeUsdCents += usd.platformFeeUsdCents;
          professionalNetUsdCents += usd.professionalNetUsdCents;
        }
      } else {
        grossUsdCents = line.grossCents;
        platformFeeUsdCents = line.platformFeeCents;
        professionalNetUsdCents = line.professionalNetCents;
      }
    }

    transfers.push({
      id: line.id,
      professionalId: line.professionalId,
      professionalName: line.professional.user.fullName,
      sessionsCount: line.sessionsCount,
      grossUsdCents,
      platformFeeUsdCents,
      professionalNetUsdCents,
      status: line.status,
      displayStatus: resolveDlocalTransferDisplayStatus({
        status: line.status,
        dlocalStatus: line.dlocalStatus
      }),
      dlocalPayoutId: line.dlocalPayoutId,
      dlocalStatus: line.dlocalStatus,
      submissionError: line.submissionError,
      payoutReference: line.payoutReference,
      createdAt: line.createdAt.toISOString(),
      paidAt: line.paidAt?.toISOString() ?? null
    });
  }

  return { selectedMonths, transfers };
}

function maskAccount(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) {
    return "••••";
  }
  return `•••• ${trimmed.slice(-4)}`;
}

function resolveBankName(country: string | null, bankCode: string | null): string | null {
  if (!country || !bankCode) {
    return null;
  }
  const list = dlocalPayoutBankCodes(country as DlocalPayoutCountry);
  return list?.find((bank) => bank.code === bankCode)?.name ?? null;
}

export type UnpaidProfessionalSessionRow = {
  id: string;
  bookingId: string;
  bookingStartsAt: string;
  bookingCompletedAt: string | null;
  monthKey: string;
  /** `pending` = enviada a cobro; `not_submitted` = realizada sin enviar; `paid` = depositada. */
  payoutStatus: "pending" | "not_submitted" | "paid";
  payoutPaidAt: string | null;
  isTrial: boolean;
  sourceKind: "trial" | "package";
  sourceLabel: string;
  purchaseId: string | null;
  packageSessionNumber?: number | null;
  packageCredits?: number | null;
  packageDiscountPercent?: number | null;
  paymentCheckoutId: string | null;
  currency: string;
  sessionPriceCents: number;
  platformCommissionPercent: number;
  platformFeeCents: number;
  professionalNetCents: number;
  sessionPriceUsdCents: number;
  platformFeeUsdCents: number;
  professionalNetUsdCents: number;
  patient: { id: string; fullName: string; email: string };
  package: { id: string; name: string; credits: number } | null;
};

export type UnpaidProfessionalDetail = {
  professional: {
    id: string;
    fullName: string;
    email: string;
    residencyCountry: string | null;
    listSessionPriceUsd: number | null;
  };
  selectedMonths: string[];
  totals: {
    sessionsCount: number;
    pendingSessionsCount: number;
    paidSessionsCount: number;
    grossUsdCents: number;
    platformFeeUsdCents: number;
    professionalNetUsdCents: number;
    pendingGrossUsdCents: number;
    pendingPlatformFeeUsdCents: number;
    pendingProfessionalNetUsdCents: number;
  };
  sessions: UnpaidProfessionalSessionRow[];
  payout: {
    dlocalConfigured: boolean;
    ready: boolean;
    reason: string | null;
    status: string | null;
    method: string | null;
    country: string | null;
    currency: string | null;
    beneficiaryName: string | null;
    bankName: string | null;
    bankCode: string | null;
    accountMasked: string | null;
    documentType: string | null;
    estimatedLocal: { currency: string; amount: number; ratePerUsd: number } | null;
  };
};

export type DlocalPayoutTransferDetail = {
  transfer: DlocalPayoutTransferRow;
  sessions: UnpaidProfessionalSessionRow[];
  sessionsFromSnapshot: boolean;
};

function sessionRowFromSnapshotItem(
  item: PayoutLineSessionSnapshotItem,
  line: { status: string; paidAt: Date | null },
  liveFx: Awaited<ReturnType<typeof resolveLiveFx>>
): UnpaidProfessionalSessionRow {
  const usd = usdTripleFromFinanceRow(item, liveFx);
  const completedAt = item.bookingCompletedAt ? new Date(item.bookingCompletedAt) : null;
  const startsAt = new Date(item.bookingStartsAt);
  return {
    id: item.id,
    bookingId: item.bookingId,
    bookingStartsAt: item.bookingStartsAt,
    bookingCompletedAt: item.bookingCompletedAt,
    monthKey: financeRecordMonthKey({
      bookingCompletedAt: completedAt,
      bookingStartsAt: startsAt
    }),
    payoutStatus: payoutStatusForSentLine(line.status, line.paidAt),
    payoutPaidAt: line.paidAt?.toISOString() ?? null,
    isTrial: item.isTrial,
    sourceKind: item.sourceKind,
    sourceLabel: item.sourceLabel,
    purchaseId: item.purchaseId,
    packageSessionNumber: item.packageSessionNumber,
    packageCredits: item.packageCredits,
    packageDiscountPercent: item.packageDiscountPercent,
    paymentCheckoutId: null,
    currency: item.currency,
    sessionPriceCents: item.sessionPriceCents,
    platformCommissionPercent: item.platformCommissionPercent,
    platformFeeCents: item.platformFeeCents,
    professionalNetCents: item.professionalNetCents,
    sessionPriceUsdCents: usd.grossUsdCents,
    platformFeeUsdCents: usd.platformFeeUsdCents,
    professionalNetUsdCents: usd.professionalNetUsdCents,
    patient: { id: item.patientId, fullName: item.patientName, email: "" },
    package: null
  };
}

export async function getDlocalPayoutTransferDetail(
  lineId: string
): Promise<DlocalPayoutTransferDetail | { notFound: true }> {
  const line = await prisma.financePayoutLine.findFirst({
    where: { id: lineId, ...dlocalSentPayoutLineWhere },
    include: {
      professional: { select: { user: { select: { fullName: true } } } },
      sessionRecords: {
        orderBy: [{ bookingCompletedAt: "asc" }, { bookingStartsAt: "asc" }],
        include: {
          patient: { select: { id: true, user: { select: { fullName: true, email: true } } } },
          package: { select: { id: true, name: true, credits: true } },
          purchase: {
            select: {
              id: true,
              packageNameSnapshot: true,
              packageCreditsSnapshot: true,
              packageDiscountPercentSnapshot: true,
              fxArsPerUsdSnapshot: true
            }
          },
          booking: { select: { packageSessionOrdinal: true } }
        }
      }
    }
  });
  if (!line) {
    return { notFound: true };
  }

  const liveFx = await resolveLiveFx();
  const displayStatus = resolveDlocalTransferDisplayStatus({
    status: line.status,
    dlocalStatus: line.dlocalStatus
  });
  let sessions: UnpaidProfessionalSessionRow[] = [];
  let sessionsFromSnapshot = false;

  if (line.sessionRecords.length > 0) {
    const packageSessionIndexByBookingId = await buildPackageSessionIndexByBookingId(
      line.sessionRecords.flatMap((row) => (row.purchaseId ? [row.purchaseId] : []))
    );
    sessions = line.sessionRecords.map((record) => {
      const usd = usdTripleFromFinanceRow(
        {
          currency: record.currency,
          sessionPriceCents: record.sessionPriceCents,
          platformFeeCents: record.platformFeeCents,
          professionalNetCents: record.professionalNetCents,
          fxArsPerUsdSnapshot: record.purchase?.fxArsPerUsdSnapshot ?? null
        },
        liveFx
      );
      const packageName =
        record.purchase?.packageNameSnapshot?.trim()
        || record.package?.name?.trim()
        || null;
      const packageCredits =
        record.purchase?.packageCreditsSnapshot
        ?? record.package?.credits
        ?? null;
      const packageSessionNumber = record.purchaseId
        ? packageSessionIndexByBookingId.get(record.bookingId)
          ?? record.booking.packageSessionOrdinal
          ?? null
        : null;
      const sourceKind = record.isTrial ? ("trial" as const) : ("package" as const);
      return {
        id: record.id,
        bookingId: record.bookingId,
        bookingStartsAt: record.bookingStartsAt.toISOString(),
        bookingCompletedAt: record.bookingCompletedAt?.toISOString() ?? null,
        monthKey: financeRecordMonthKey(record),
        payoutStatus: payoutStatusForSentLine(line.status, line.paidAt),
        payoutPaidAt: line.paidAt?.toISOString() ?? null,
        isTrial: record.isTrial,
        sourceKind,
        sourceLabel: record.isTrial
          ? "Rate × sesión"
          : formatPackageSessionSourceLabel({
              packageName: packageName ?? "Paquete",
              packageCredits,
              packageSessionNumber,
              discountPercent: record.purchase?.packageDiscountPercentSnapshot ?? null
            }),
        purchaseId: record.purchaseId,
        packageSessionNumber,
        packageCredits,
        packageDiscountPercent: record.purchase?.packageDiscountPercentSnapshot ?? null,
        paymentCheckoutId: null,
        currency: record.currency,
        sessionPriceCents: record.sessionPriceCents,
        platformCommissionPercent: record.platformCommissionPercent,
        platformFeeCents: record.platformFeeCents,
        professionalNetCents: record.professionalNetCents,
        sessionPriceUsdCents: usd.grossUsdCents,
        platformFeeUsdCents: usd.platformFeeUsdCents,
        professionalNetUsdCents: usd.professionalNetUsdCents,
        patient: {
          id: record.patient.id,
          fullName: record.patient.user.fullName,
          email: record.patient.user.email
        },
        package: record.package
          ? {
              id: record.package.id,
              name: packageName ?? record.package.name,
              credits: packageCredits ?? record.package.credits
            }
          : null
      };
    });
  } else {
    const snapshot = parsePayoutLineSessionSnapshot(line.sessionSnapshot);
    sessions = snapshot.map((item) => sessionRowFromSnapshotItem(item, line, liveFx));
    sessionsFromSnapshot = snapshot.length > 0;
  }

  let grossUsdCents = 0;
  let platformFeeUsdCents = 0;
  let professionalNetUsdCents = 0;
  if (sessions.length > 0) {
    for (const session of sessions) {
      grossUsdCents += session.sessionPriceUsdCents;
      platformFeeUsdCents += session.platformFeeUsdCents;
      professionalNetUsdCents += session.professionalNetUsdCents;
    }
  } else {
    grossUsdCents = line.grossCents;
    platformFeeUsdCents = line.platformFeeCents;
    professionalNetUsdCents = line.professionalNetCents;
  }

  return {
    transfer: {
      id: line.id,
      professionalId: line.professionalId,
      professionalName: line.professional.user.fullName,
      sessionsCount: line.sessionsCount,
      grossUsdCents,
      platformFeeUsdCents,
      professionalNetUsdCents,
      status: line.status,
      displayStatus,
      dlocalPayoutId: line.dlocalPayoutId,
      dlocalStatus: line.dlocalStatus,
      submissionError: line.submissionError,
      payoutReference: line.payoutReference,
      createdAt: line.createdAt.toISOString(),
      paidAt: line.paidAt?.toISOString() ?? null
    },
    sessions,
    sessionsFromSnapshot
  };
}

export async function getUnpaidProfessionalDetail(
  professionalId: string,
  input?: { months?: string[] }
): Promise<UnpaidProfessionalDetail | { notFound: true }> {
  const selectedMonths = [...new Set((input?.months ?? []).filter((m) => /^\d{4}-\d{2}$/.test(m)))].sort();
  const professional = await prisma.professionalProfile.findUnique({
    where: { id: professionalId },
    select: {
      id: true,
      residencyCountry: true,
      sessionPriceUsd: true,
      user: { select: { fullName: true, email: true } }
    }
  });
  if (!professional) {
    return { notFound: true };
  }

  const allRecords = await prisma.financeSessionRecord.findMany({
    where: {
      professionalId,
      bookingStatus: "COMPLETED"
    },
    orderBy: [{ bookingCompletedAt: "asc" }, { bookingStartsAt: "asc" }],
    include: {
      patient: { select: { id: true, user: { select: { fullName: true, email: true } } } },
      package: { select: { id: true, name: true, credits: true } },
      purchase: {
        select: {
          id: true,
          packageNameSnapshot: true,
          packageCreditsSnapshot: true,
          packageDiscountPercentSnapshot: true,
          fxArsPerUsdSnapshot: true
        }
      },
      booking: {
        select: {
          packageSessionOrdinal: true
        }
      },
      payoutLine: { select: { id: true, status: true, paidAt: true, payoutReference: true } }
    }
  });

  const records =
    selectedMonths.length === 0
      ? allRecords
      : allRecords.filter((record) => selectedMonths.includes(financeRecordMonthKey(record)));

  const packageSessionIndexByBookingId = await buildPackageSessionIndexByBookingId(
    records.flatMap((row) => (row.purchaseId ? [row.purchaseId] : []))
  );

  const bookingIds = records.map((record) => record.bookingId);
  const trialCheckouts = bookingIds.length
    ? await prisma.paymentCheckout.findMany({
        where: {
          kind: "TRIAL",
          fulfillmentBookingId: { in: bookingIds }
        },
        select: {
          id: true,
          fulfillmentBookingId: true,
          displayName: true,
          chargeAmountMajor: true,
          chargeCurrency: true
        }
      })
    : [];
  const trialCheckoutByBookingId = new Map(
    trialCheckouts
      .filter((checkout) => checkout.fulfillmentBookingId != null)
      .map((checkout) => [checkout.fulfillmentBookingId as string, checkout])
  );

  const liveFx = await resolveLiveFx();
  let grossUsdCents = 0;
  let platformFeeUsdCents = 0;
  let professionalNetUsdCents = 0;
  let pendingGrossUsdCents = 0;
  let pendingPlatformFeeUsdCents = 0;
  let pendingProfessionalNetUsdCents = 0;
  let pendingSessionsCount = 0;
  let paidSessionsCount = 0;

  const sessions: UnpaidProfessionalSessionRow[] = records.map((record) => {
    const fx = readSessionFxArsPerUsdSnapshot({
      currency: record.currency,
      sessionPriceCents: record.sessionPriceCents,
      platformFeeCents: record.platformFeeCents,
      professionalNetCents: record.professionalNetCents,
      fxArsPerUsdSnapshot: record.purchase?.fxArsPerUsdSnapshot ?? null
    });
    const sessionPriceUsdCents = convertFinanceMinorToUsdMinor(
      record.sessionPriceCents,
      record.currency,
      fx,
      liveFx
    );
    const feeUsdCents = convertFinanceMinorToUsdMinor(
      record.platformFeeCents,
      record.currency,
      fx,
      liveFx
    );
    const netUsdCents = convertFinanceMinorToUsdMinor(
      record.professionalNetCents,
      record.currency,
      fx,
      liveFx
    );
    grossUsdCents += sessionPriceUsdCents;
    platformFeeUsdCents += feeUsdCents;
    professionalNetUsdCents += netUsdCents;

    const line = record.payoutLine;
    const isPaid = Boolean(line && (line.status === "PAID" || line.paidAt != null));
    const submittedForPayout = Boolean(record.submittedForPayoutAt || line);
    const eligibleToPay =
      Boolean(record.submittedForPayoutAt)
      && !isPaid
      && (line == null || line.status === "FAILED");
    const payoutStatus = isPaid
      ? ("paid" as const)
      : submittedForPayout
        ? ("pending" as const)
        : ("not_submitted" as const);
    if (isPaid) {
      paidSessionsCount += 1;
    } else if (eligibleToPay) {
      pendingSessionsCount += 1;
      pendingGrossUsdCents += sessionPriceUsdCents;
      pendingPlatformFeeUsdCents += feeUsdCents;
      pendingProfessionalNetUsdCents += netUsdCents;
    }

    const trialCheckout = record.isTrial ? trialCheckoutByBookingId.get(record.bookingId) : undefined;
    const packageName =
      record.purchase?.packageNameSnapshot?.trim()
      || record.package?.name?.trim()
      || null;
    const packageCredits =
      record.purchase?.packageCreditsSnapshot
      ?? record.package?.credits
      ?? null;
    const packageSessionNumber = record.purchaseId
      ? packageSessionIndexByBookingId.get(record.bookingId)
        ?? record.booking.packageSessionOrdinal
        ?? null
      : null;
    const sourceKind = record.isTrial ? ("trial" as const) : ("package" as const);
    const sourceLabel = record.isTrial
      ? "Rate × sesión"
      : formatPackageSessionSourceLabel({
          packageName: packageName ?? "Paquete",
          packageCredits,
          packageSessionNumber,
          discountPercent: record.purchase?.packageDiscountPercentSnapshot ?? null
        });

    return {
      id: record.id,
      bookingId: record.bookingId,
      bookingStartsAt: record.bookingStartsAt.toISOString(),
      bookingCompletedAt: record.bookingCompletedAt?.toISOString() ?? null,
      monthKey: financeRecordMonthKey(record),
      payoutStatus,
      payoutPaidAt: line?.paidAt?.toISOString() ?? null,
      isTrial: record.isTrial,
      sourceKind,
      sourceLabel,
      purchaseId: record.purchaseId,
      packageSessionNumber,
      packageCredits,
      packageDiscountPercent: record.purchase?.packageDiscountPercentSnapshot ?? null,
      paymentCheckoutId: trialCheckout?.id ?? null,
      currency: record.currency,
      sessionPriceCents: record.sessionPriceCents,
      platformCommissionPercent: record.platformCommissionPercent,
      platformFeeCents: record.platformFeeCents,
      professionalNetCents: record.professionalNetCents,
      sessionPriceUsdCents,
      platformFeeUsdCents: feeUsdCents,
      professionalNetUsdCents: netUsdCents,
      patient: {
        id: record.patient.id,
        fullName: record.patient.user.fullName,
        email: record.patient.user.email
      },
      package: record.package
        ? {
            id: record.package.id,
            name: packageName ?? record.package.name,
            credits: packageCredits ?? record.package.credits
          }
        : null
    };
  });

  const payoutAdmin = await loadProfessionalPayoutAdmin(professionalId);
  const readiness = assessPayoutReadiness(payoutAdmin);
  const bank = payoutAdmin?.payoutBankAccount;
  const payoutCountry = normalizePayoutCountry(bank?.payoutCountry ?? null);
  const payoutCurrency = payoutCountry ? dlocalPayoutCurrencyForCountry(payoutCountry) : null;

  let estimatedLocal: UnpaidProfessionalDetail["payout"]["estimatedLocal"] = null;
  if (payoutCurrency && pendingProfessionalNetUsdCents > 0) {
    const rates = await getUsdDisplayFxRates();
    const rate =
      payoutCurrency === "USD" ? 1 : rates[payoutCurrency] ?? null;
    if (rate != null && rate > 0) {
      estimatedLocal = {
        currency: payoutCurrency,
        amount: Math.round((pendingProfessionalNetUsdCents / 100) * rate * 100) / 100,
        ratePerUsd: rate
      };
    }
  }

  const beneficiaryName = bank
    ? `${bank.beneficiaryFirstName ?? ""} ${bank.beneficiaryLastName ?? ""}`.trim() || bank.accountHolderName
    : null;

  return {
    professional: {
      id: professional.id,
      fullName: professional.user.fullName,
      email: professional.user.email,
      residencyCountry: professional.residencyCountry,
      listSessionPriceUsd: professional.sessionPriceUsd
    },
    selectedMonths,
    totals: {
      sessionsCount: sessions.length,
      pendingSessionsCount,
      paidSessionsCount,
      grossUsdCents,
      platformFeeUsdCents,
      professionalNetUsdCents,
      pendingGrossUsdCents,
      pendingPlatformFeeUsdCents,
      pendingProfessionalNetUsdCents
    },
    sessions,
    payout: {
      dlocalConfigured: isDlocalGoConfigured(),
      ready: readiness.ready,
      reason: readiness.reason ?? null,
      status: payoutAdmin?.payoutStatus ?? null,
      method: payoutAdmin?.payoutMethod ?? null,
      country: payoutCountry,
      currency: payoutCurrency,
      beneficiaryName: beneficiaryName ?? null,
      bankName: resolveBankName(payoutCountry, bank?.bankCode ?? null),
      bankCode: bank?.bankCode ?? null,
      accountMasked: bank?.accountValue ? maskAccount(bank.accountValue) : null,
      documentType: bank?.documentType ?? null,
      estimatedLocal
    }
  };
}

export async function payUnpaidProfessional(input: {
  professionalId: string;
  method: "ledger" | "dlocal";
  payoutReference?: string;
  months?: string[];
}) {
  const months = [...new Set((input.months ?? []).filter((m) => /^\d{4}-\d{2}$/.test(m)))].sort();
  console.info(`${LOG_PREFIX} pay start`, {
    professionalId: input.professionalId,
    method: input.method,
    months,
    hasReference: Boolean(input.payoutReference?.trim())
  });

  const detail = await getUnpaidProfessionalDetail(input.professionalId, { months });
  if ("notFound" in detail) {
    console.warn(`${LOG_PREFIX} pay aborted: professional not found`, { professionalId: input.professionalId });
    return { notFound: true as const };
  }
  if (detail.totals.pendingSessionsCount === 0) {
    console.warn(`${LOG_PREFIX} pay aborted: no eligible sessions`, {
      professionalId: input.professionalId,
      method: input.method
    });
    return { noRecords: true as const };
  }

  if (input.method === "ledger") {
    const ledger = await payProfessionalUnpaidBalance(input.professionalId, input.payoutReference, {
      months,
      markPaidImmediately: true
    });
    console.info(`${LOG_PREFIX} ledger payment recorded`, {
      professionalId: input.professionalId,
      result: "notFound" in ledger || "noRecords" in ledger ? ledger : {
        payoutLineId: ledger.payoutLineId,
        sessionsCount: ledger.sessionsCount,
        professionalNetCents: ledger.professionalNetCents
      }
    });
    return ledger;
  }

  if (!detail.payout.dlocalConfigured) {
    throw new ProfessionalPayoutError("dlocal_not_configured", "dLocal Go no está configurado en este entorno.");
  }
  if (!detail.payout.ready) {
    throw new ProfessionalPayoutError(
      "profile_incomplete",
      detail.payout.reason ?? "El profesional no tiene datos de cobro completos."
    );
  }
  if (!detail.payout.estimatedLocal || detail.payout.estimatedLocal.amount <= 0) {
    throw new ProfessionalPayoutError(
      "invalid_amount",
      "No se pudo calcular el monto en moneda local para el payout."
    );
  }

  const expectedSessions = detail.totals.pendingSessionsCount;
  const estimatedLocal = detail.payout.estimatedLocal;
  console.info(`${LOG_PREFIX} reserving sessions before dLocal`, {
    professionalId: input.professionalId,
    expectedSessions,
    pendingNetUsdCents: detail.totals.pendingProfessionalNetUsdCents,
    estimatedLocal
  });

  const ledger = await payProfessionalUnpaidBalance(input.professionalId, undefined, {
    months,
    markPaidImmediately: false,
    notes: "Pago dLocal desde pendientes (awaiting webhook)"
  });
  if ("notFound" in ledger || "noRecords" in ledger) {
    console.warn(`${LOG_PREFIX} reservation returned empty`, {
      professionalId: input.professionalId,
      ledger
    });
    return ledger;
  }

  if (ledger.sessionsCount !== expectedSessions) {
    console.error(`${LOG_PREFIX} session count mismatch; releasing reservation (no dLocal call)`, {
      professionalId: input.professionalId,
      payoutLineId: ledger.payoutLineId,
      expectedSessions,
      reservedSessions: ledger.sessionsCount
    });
    await releaseReservedSessions(ledger.payoutLineId, "session_count_mismatch: reservation did not match eligible sessions");
    throw new ProfessionalPayoutError(
      "session_count_mismatch",
      "El lote a pagar cambió mientras se armaba la transferencia. No se envió nada a dLocal; recargá y reintentá."
    );
  }

  const externalReference = `mc-unpaid-${input.professionalId.slice(0, 8)}-${Date.now()}`;
  let createdPayoutId: string | null = null;
  try {
    console.info(`${LOG_PREFIX} calling dLocal`, {
      professionalId: input.professionalId,
      payoutLineId: ledger.payoutLineId,
      payoutRunId: ledger.payoutRunId,
      sessionsCount: ledger.sessionsCount,
      amount: estimatedLocal.amount,
      currency: estimatedLocal.currency,
      ref: externalReference
    });

    const { payout, record } = await createProfessionalPayout({
      professionalProfileId: input.professionalId,
      amount: estimatedLocal.amount,
      externalReference,
      beneficiaryEmail: detail.professional.email,
      description: `MotivarCare · ${ledger.sessionsCount} sesiones${months.length ? ` · ${months.join(",")}` : ""}`,
      payoutLineId: ledger.payoutLineId
    });
    createdPayoutId = payout.payout_id;

    try {
      await prisma.financePayoutLine.update({
        where: { id: ledger.payoutLineId },
        data: {
          dlocalPayoutId: payout.payout_id,
          dlocalStatus: record.status,
          payoutReference: input.payoutReference?.trim() || `dlocal:${payout.payout_id}`,
          submissionError: null
        }
      });

      await applyDlocalStatusToPayoutLine({
        payoutId: payout.payout_id,
        status: String(record.status)
      });
    } catch (persistError) {
      console.error(`${LOG_PREFIX} dLocal created payout but local persist failed; sessions stay reserved`, {
        professionalId: input.professionalId,
        payoutLineId: ledger.payoutLineId,
        dlocalPayoutId: payout.payout_id,
        dlocalStatus: record.status,
        message: persistError instanceof Error ? persistError.message : String(persistError)
      });
      throw persistError;
    }

    console.info(`${LOG_PREFIX} dLocal payout accepted`, {
      professionalId: input.professionalId,
      payoutLineId: ledger.payoutLineId,
      dlocalPayoutId: payout.payout_id,
      dlocalStatus: record.status,
      sessionsCount: ledger.sessionsCount,
      amount: estimatedLocal.amount,
      currency: estimatedLocal.currency,
      ref: externalReference
    });

    return {
      ...ledger,
      dlocalPayoutId: payout.payout_id,
      dlocalStatus: record.status,
      dlocalAmount: estimatedLocal.amount,
      dlocalCurrency: estimatedLocal.currency
    };
  } catch (error) {
    const submissionError = (error instanceof Error ? error.message : String(error)).slice(0, 2000);
    const line = await prisma.financePayoutLine.findUnique({
      where: { id: ledger.payoutLineId },
      select: { id: true, dlocalPayoutId: true, status: true }
    });
    const knownPayoutId = createdPayoutId || line?.dlocalPayoutId || null;

    if (!shouldReleaseSessionsAfterDlocalFailure({ dlocalPayoutId: knownPayoutId })) {
      console.error(`${LOG_PREFIX} dLocal payout already exists; NOT releasing sessions`, {
        professionalId: input.professionalId,
        payoutLineId: ledger.payoutLineId,
        dlocalPayoutId: knownPayoutId,
        lineStatus: line?.status ?? null,
        message: submissionError
      });
      if (line && !line.dlocalPayoutId) {
        await prisma.financePayoutLine.update({
          where: { id: ledger.payoutLineId },
          data: {
            dlocalPayoutId: knownPayoutId,
            submissionError: submissionError.slice(0, 2000)
          }
        }).catch((persistError: unknown) => {
          console.error(`${LOG_PREFIX} could not persist known dLocal payout id`, {
            payoutLineId: ledger.payoutLineId,
            dlocalPayoutId: knownPayoutId,
            message: persistError instanceof Error ? persistError.message : String(persistError)
          });
        });
      }
    } else {
      const timedOut = /timeout/i.test(submissionError);
      if (timedOut) {
        console.error(`${LOG_PREFIX} dLocal timed out before payout_id; releasing sessions. If dLocal created it anyway, check the sandbox dashboard before retrying.`, {
          professionalId: input.professionalId,
          payoutLineId: ledger.payoutLineId,
          ref: externalReference,
          message: submissionError
        });
      } else {
        console.error(`${LOG_PREFIX} dLocal did not create a payout; releasing sessions back to pending`, {
          professionalId: input.professionalId,
          payoutLineId: ledger.payoutLineId,
          ref: externalReference,
          message: submissionError
        });
      }
      await releaseReservedSessions(ledger.payoutLineId, submissionError);
    }

    if (error instanceof ProfessionalPayoutError) {
      throw error;
    }
    throw new ProfessionalPayoutError("dlocal_rejected", submissionError);
  }
}

async function releaseReservedSessions(payoutLineId: string, submissionError: string): Promise<void> {
  const attached = await prisma.financeSessionRecord.findMany({
    where: { payoutLineId },
    select: { id: true, bookingId: true, professionalNetCents: true }
  });
  await prisma.$transaction([
    prisma.financeSessionRecord.updateMany({
      where: { payoutLineId },
      data: { payoutLineId: null }
    }),
    prisma.financePayoutLine.update({
      where: { id: payoutLineId },
      data: {
        status: "FAILED",
        submissionError: submissionError.slice(0, 2000)
      }
    })
  ]);
  console.warn(`${LOG_PREFIX} released reserved sessions`, {
    payoutLineId,
    releasedCount: attached.length,
    sessionIds: attached.map((row) => row.id),
    bookingIds: attached.map((row) => row.bookingId)
  });
}
