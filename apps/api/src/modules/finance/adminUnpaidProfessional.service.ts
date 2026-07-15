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
import { getResilientUsdArsRate } from "../../lib/usdArsExchangeResilient.js";
import { getUsdDisplayFxRates } from "../../lib/usdDisplayFxRates.js";
import {
  assessPayoutReadiness,
  createProfessionalPayout,
  loadProfessionalPayoutAdmin,
  ProfessionalPayoutError
} from "../payouts/professionalPayouts.service.js";
import { payProfessionalUnpaidBalance } from "./finance.service.js";

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
    where: {
      bookingStatus: "COMPLETED",
      payoutLineId: null
    },
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
  /** `pending` = aún no liquidada al profesional; `paid` = ya incluida en un payout pagado. */
  payoutStatus: "pending" | "paid";
  payoutPaidAt: string | null;
  isTrial: boolean;
  sourceKind: "trial" | "package";
  sourceLabel: string;
  purchaseId: string | null;
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
          fxArsPerUsdSnapshot: true
        }
      },
      payoutLine: { select: { id: true, status: true, paidAt: true, payoutReference: true } }
    }
  });

  const records =
    selectedMonths.length === 0
      ? allRecords
      : allRecords.filter((record) => selectedMonths.includes(financeRecordMonthKey(record)));

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
    const payoutStatus = isPaid ? ("paid" as const) : ("pending" as const);
    if (isPaid) {
      paidSessionsCount += 1;
    } else {
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
    const sourceKind = record.isTrial ? ("trial" as const) : ("package" as const);
    const sourceLabel = record.isTrial
      ? "Rate × sesión"
      : packageName
        ? packageCredits != null
          ? `${packageName} (${packageCredits} cr)`
          : packageName
        : "Paquete";

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
}) {
  const detail = await getUnpaidProfessionalDetail(input.professionalId);
  if ("notFound" in detail) {
    return { notFound: true as const };
  }
  if (detail.totals.pendingSessionsCount === 0) {
    return { noRecords: true as const };
  }

  if (input.method === "ledger") {
    return payProfessionalUnpaidBalance(input.professionalId, input.payoutReference);
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

  const { payout, record } = await createProfessionalPayout({
    professionalProfileId: input.professionalId,
    amount: detail.payout.estimatedLocal.amount,
    externalReference: `mc-unpaid-${input.professionalId.slice(0, 8)}-${Date.now()}`,
    beneficiaryEmail: detail.professional.email,
    description: `MotivarCare · ${detail.totals.pendingSessionsCount} sesiones`
  });

  const ledger = await payProfessionalUnpaidBalance(
    input.professionalId,
    input.payoutReference?.trim() || `dlocal:${payout.payout_id}`
  );

  if ("notFound" in ledger || "noRecords" in ledger) {
    return ledger;
  }

  return {
    ...ledger,
    dlocalPayoutId: payout.payout_id,
    dlocalStatus: record.status,
    dlocalAmount: detail.payout.estimatedLocal.amount,
    dlocalCurrency: detail.payout.estimatedLocal.currency
  };
}
