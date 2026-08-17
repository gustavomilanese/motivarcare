/**
 * Envío de liquidaciones (FinancePayoutRun) a dLocal Go: un POST /v1/payouts por línea.
 * El ledger solo pasa a PAID cuando el webhook/refresh confirma DELIVERED|COMPLETED.
 */
import {
  convertFinanceMinorToUsdMinor,
  readSessionFxArsPerUsdSnapshot
} from "../../lib/professionalFinanceDisplay.js";
import {
  isDlocalGoConfigured,
  isDlocalGoPayoutFailed,
  isDlocalGoPayoutSettled
} from "../../lib/dlocalGoPayouts.js";
import { prisma } from "../../lib/prisma.js";
import { getResilientUsdArsRate } from "../../lib/usdArsExchangeResilient.js";
import { getUsdDisplayFxRates } from "../../lib/usdDisplayFxRates.js";
import {
  assessPayoutReadiness,
  createProfessionalPayout,
  loadProfessionalPayoutAdmin,
  syncPayoutStatus
} from "../payouts/professionalPayouts.service.js";
import { markPayoutLinePaid } from "./finance.service.js";
import {
  dlocalPayoutCurrencyForCountry,
  normalizePayoutCountry
} from "@therapy/types";

const LOG_PREFIX = "[finance-payout-dlocal]";

export type PayoutLineSubmitResult = {
  lineId: string;
  professionalId: string;
  professionalName: string;
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  dlocalPayoutId?: string;
  dlocalStatus?: string;
  localAmount?: number;
  localCurrency?: string;
};

async function resolveLiveArsFx(): Promise<{ arsPerUsd: number } | Record<string, never>> {
  const liveArsPerUsd = await getResilientUsdArsRate().catch(() => null);
  return liveArsPerUsd != null && liveArsPerUsd > 0 ? { arsPerUsd: liveArsPerUsd } : {};
}

/** Neto del profesional en USD cents a partir de las sesiones de la línea. */
export async function lineProfessionalNetUsdCents(lineId: string): Promise<number> {
  const liveFx = await resolveLiveArsFx();
  const records = await prisma.financeSessionRecord.findMany({
    where: { payoutLineId: lineId },
    select: {
      currency: true,
      professionalNetCents: true,
      purchase: { select: { fxArsPerUsdSnapshot: true } }
    }
  });
  let total = 0;
  for (const record of records) {
    const fx = readSessionFxArsPerUsdSnapshot({
      currency: record.currency,
      sessionPriceCents: 0,
      platformFeeCents: 0,
      professionalNetCents: record.professionalNetCents,
      fxArsPerUsdSnapshot: record.purchase?.fxArsPerUsdSnapshot ?? null
    });
    total += convertFinanceMinorToUsdMinor(
      record.professionalNetCents,
      record.currency,
      fx,
      liveFx
    );
  }
  return total;
}

async function estimateLocalAmountForLine(params: {
  lineId: string;
  professionalId: string;
}): Promise<{
  ready: boolean;
  reason?: string;
  country: string | null;
  currency: string | null;
  amount: number | null;
  ratePerUsd: number | null;
  email: string | null;
  professionalName: string;
}> {
  const professional = await prisma.professionalProfile.findUnique({
    where: { id: params.professionalId },
    select: { user: { select: { fullName: true, email: true } } }
  });
  const professionalName = professional?.user.fullName ?? params.professionalId;
  const email = professional?.user.email ?? null;

  const admin = await loadProfessionalPayoutAdmin(params.professionalId);
  const readiness = assessPayoutReadiness(admin);
  if (!readiness.ready || !admin?.payoutBankAccount) {
    return {
      ready: false,
      reason: readiness.reason ?? "Perfil de cobro incompleto.",
      country: null,
      currency: null,
      amount: null,
      ratePerUsd: null,
      email,
      professionalName
    };
  }

  const country = normalizePayoutCountry(admin.payoutBankAccount.payoutCountry);
  const currency = country ? dlocalPayoutCurrencyForCountry(country) : null;
  if (!country || !currency) {
    return {
      ready: false,
      reason: "País de cobro no soportado por dLocal.",
      country,
      currency: null,
      amount: null,
      ratePerUsd: null,
      email,
      professionalName
    };
  }

  const netUsdCents = await lineProfessionalNetUsdCents(params.lineId);
  if (netUsdCents <= 0) {
    return {
      ready: false,
      reason: "El neto a pagar es 0.",
      country,
      currency,
      amount: null,
      ratePerUsd: null,
      email,
      professionalName
    };
  }

  const rates = await getUsdDisplayFxRates();
  const rate = currency === "USD" ? 1 : rates[currency] ?? null;
  if (rate == null || rate <= 0) {
    return {
      ready: false,
      reason: `Sin cotización USD/${currency} para el payout.`,
      country,
      currency,
      amount: null,
      ratePerUsd: null,
      email,
      professionalName
    };
  }

  const amount = Math.round((netUsdCents / 100) * rate * 100) / 100;
  return {
    ready: true,
    country,
    currency,
    amount,
    ratePerUsd: rate,
    email,
    professionalName
  };
}

function monthLabelFromPeriod(periodStart: Date, periodEnd: Date): string {
  const y = periodStart.getUTCFullYear();
  const m = String(periodStart.getUTCMonth() + 1).padStart(2, "0");
  const y2 = periodEnd.getUTCFullYear();
  const m2 = String(periodEnd.getUTCMonth() + 1).padStart(2, "0");
  return y === y2 && m === m2 ? `${y}-${m}` : `${y}-${m}_${y2}-${m2}`;
}

/** Aplica un estado dLocal a la línea del ledger (webhook / refresh). */
export async function applyDlocalStatusToPayoutLine(params: {
  payoutId: string;
  status: string;
  payoutLineId?: string | null;
}): Promise<{ updated: boolean; lineId?: string; lineStatus?: string }> {
  const payoutId = params.payoutId.trim();
  const line = await prisma.financePayoutLine.findFirst({
    where: params.payoutLineId
      ? { OR: [{ dlocalPayoutId: payoutId }, { id: params.payoutLineId }] }
      : { dlocalPayoutId: payoutId },
    include: { payoutRun: { select: { id: true, status: true } } }
  });
  if (!line) {
    return { updated: false };
  }
  if (line.payoutRun.status === "CLOSED" || line.status === "PAID") {
    await prisma.financePayoutLine.update({
      where: { id: line.id },
      data: { dlocalPayoutId: payoutId, dlocalStatus: params.status }
    });
    return { updated: true, lineId: line.id, lineStatus: line.status };
  }

  const upper = String(params.status).trim().toUpperCase();
  if (isDlocalGoPayoutSettled(upper)) {
    const marked = await markPayoutLinePaid(line.id, `dlocal:${payoutId}`);
    if (marked?.payoutLine) {
      await prisma.financePayoutLine.update({
        where: { id: line.id },
        data: { dlocalPayoutId: payoutId, dlocalStatus: upper, submissionError: null }
      });
      return { updated: true, lineId: line.id, lineStatus: "PAID" };
    }
    return { updated: false, lineId: line.id, lineStatus: line.status };
  }

  if (isDlocalGoPayoutFailed(upper)) {
    const updated = await prisma.financePayoutLine.update({
      where: { id: line.id },
      data: {
        status: "FAILED",
        dlocalPayoutId: payoutId,
        dlocalStatus: upper,
        submissionError: `dLocal status: ${upper}`
      }
    });
    return { updated: true, lineId: updated.id, lineStatus: "FAILED" };
  }

  await prisma.financePayoutLine.update({
    where: { id: line.id },
    data: {
      dlocalPayoutId: payoutId,
      dlocalStatus: upper,
      status: line.status === "PENDING" ? "SUBMITTED" : line.status
    }
  });
  return { updated: true, lineId: line.id, lineStatus: "SUBMITTED" };
}

async function submitOneLine(params: {
  lineId: string;
  runId: string;
  periodLabel: string;
  forceRetry?: boolean;
}): Promise<PayoutLineSubmitResult> {
  const line = await prisma.financePayoutLine.findUnique({
    where: { id: params.lineId },
    include: {
      professional: { include: { user: { select: { fullName: true, email: true } } } },
      payoutRun: { select: { id: true, status: true } }
    }
  });
  if (!line || line.payoutRunId !== params.runId) {
    return {
      lineId: params.lineId,
      professionalId: "",
      professionalName: "",
      ok: false,
      reason: "Línea no encontrada en esta corrida."
    };
  }
  if (line.payoutRun.status === "CLOSED") {
    return {
      lineId: line.id,
      professionalId: line.professionalId,
      professionalName: line.professional.user.fullName,
      ok: false,
      skipped: true,
      reason: "La corrida ya está cerrada."
    };
  }
  if (line.status === "PAID") {
    return {
      lineId: line.id,
      professionalId: line.professionalId,
      professionalName: line.professional.user.fullName,
      ok: false,
      skipped: true,
      reason: "La línea ya está pagada."
    };
  }
  if (line.status === "SUBMITTED" && line.dlocalPayoutId && !params.forceRetry) {
    return {
      lineId: line.id,
      professionalId: line.professionalId,
      professionalName: line.professional.user.fullName,
      ok: false,
      skipped: true,
      reason: "Ya tiene un payout dLocal en curso.",
      dlocalPayoutId: line.dlocalPayoutId,
      dlocalStatus: line.dlocalStatus ?? undefined
    };
  }
  if (!params.forceRetry && line.status !== "PENDING" && line.status !== "FAILED") {
    return {
      lineId: line.id,
      professionalId: line.professionalId,
      professionalName: line.professional.user.fullName,
      ok: false,
      skipped: true,
      reason: `Estado no enviable: ${line.status}`
    };
  }

  const estimate = await estimateLocalAmountForLine({
    lineId: line.id,
    professionalId: line.professionalId
  });
  if (!estimate.ready || !estimate.amount || !estimate.currency) {
    await prisma.financePayoutLine.update({
      where: { id: line.id },
      data: {
        status: "FAILED",
        submissionError: estimate.reason ?? "No listo para dLocal"
      }
    });
    return {
      lineId: line.id,
      professionalId: line.professionalId,
      professionalName: estimate.professionalName,
      ok: false,
      reason: estimate.reason ?? "No listo para dLocal"
    };
  }

  try {
    const { payout, record } = await createProfessionalPayout({
      professionalProfileId: line.professionalId,
      amount: estimate.amount,
      externalReference: `mc-run-${params.runId.slice(0, 10)}-line-${line.id.slice(0, 10)}`,
      beneficiaryEmail: estimate.email,
      description: `MotivarCare liquidacion ${params.runId} / ${line.professionalId} / ${params.periodLabel}`,
      payoutLineId: line.id
    });

    await prisma.financePayoutLine.update({
      where: { id: line.id },
      data: {
        status: "SUBMITTED",
        dlocalPayoutId: payout.payout_id,
        dlocalStatus: record.status,
        payoutReference: `dlocal:${payout.payout_id}`,
        submissionError: null
      }
    });

    await applyDlocalStatusToPayoutLine({ payoutId: payout.payout_id, status: record.status });

    return {
      lineId: line.id,
      professionalId: line.professionalId,
      professionalName: estimate.professionalName,
      ok: true,
      dlocalPayoutId: payout.payout_id,
      dlocalStatus: record.status,
      localAmount: estimate.amount,
      localCurrency: estimate.currency
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${LOG_PREFIX} submit line failed`, { lineId: line.id, message });
    await prisma.financePayoutLine.update({
      where: { id: line.id },
      data: {
        status: "FAILED",
        submissionError: message.slice(0, 2000)
      }
    });
    return {
      lineId: line.id,
      professionalId: line.professionalId,
      professionalName: estimate.professionalName,
      ok: false,
      reason: message
    };
  }
}

export async function submitPayoutRunToDlocal(runId: string): Promise<{
  notFound?: true;
  closedRun?: true;
  dlocalNotConfigured?: true;
  results: PayoutLineSubmitResult[];
  submitted: number;
  failed: number;
  skipped: number;
}> {
  if (!isDlocalGoConfigured()) {
    return { dlocalNotConfigured: true, results: [], submitted: 0, failed: 0, skipped: 0 };
  }

  const run = await prisma.financePayoutRun.findUnique({
    where: { id: runId },
    include: { payoutLines: { select: { id: true, status: true } } }
  });
  if (!run) {
    return { notFound: true, results: [], submitted: 0, failed: 0, skipped: 0 };
  }
  if (run.status === "CLOSED") {
    return { closedRun: true, results: [], submitted: 0, failed: 0, skipped: 0 };
  }

  const periodLabel = monthLabelFromPeriod(run.periodStart, run.periodEnd);
  const eligible = run.payoutLines.filter((line) => line.status === "PENDING" || line.status === "FAILED");
  const results: PayoutLineSubmitResult[] = [];

  for (const line of eligible) {
    results.push(
      await submitOneLine({
        lineId: line.id,
        runId: run.id,
        periodLabel,
        forceRetry: line.status === "FAILED"
      })
    );
  }

  return {
    results,
    submitted: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok && !r.skipped).length,
    skipped: results.filter((r) => r.skipped).length
  };
}

export async function retryPayoutLineDlocal(lineId: string): Promise<{
  notFound?: true;
  closedRun?: true;
  dlocalNotConfigured?: true;
  result: PayoutLineSubmitResult | null;
}> {
  if (!isDlocalGoConfigured()) {
    return { dlocalNotConfigured: true, result: null };
  }
  const line = await prisma.financePayoutLine.findUnique({
    where: { id: lineId },
    include: { payoutRun: true }
  });
  if (!line) {
    return { notFound: true, result: null };
  }
  if (line.payoutRun.status === "CLOSED") {
    return { closedRun: true, result: null };
  }

  const periodLabel = monthLabelFromPeriod(line.payoutRun.periodStart, line.payoutRun.periodEnd);
  const result = await submitOneLine({
    lineId: line.id,
    runId: line.payoutRunId,
    periodLabel,
    forceRetry: true
  });
  return { result };
}

export async function refreshPayoutRunDlocalStatuses(runId: string): Promise<{
  notFound?: true;
  refreshed: Array<{ lineId: string; dlocalPayoutId: string; status: string | null }>;
}> {
  const run = await prisma.financePayoutRun.findUnique({
    where: { id: runId },
    include: {
      payoutLines: {
        where: { dlocalPayoutId: { not: null } },
        select: { id: true, dlocalPayoutId: true }
      }
    }
  });
  if (!run) {
    return { notFound: true, refreshed: [] };
  }

  const refreshed: Array<{ lineId: string; dlocalPayoutId: string; status: string | null }> = [];
  for (const line of run.payoutLines) {
    const payoutId = line.dlocalPayoutId?.trim();
    if (!payoutId) {
      continue;
    }
    try {
      const record = await syncPayoutStatus(payoutId);
      refreshed.push({
        lineId: line.id,
        dlocalPayoutId: payoutId,
        status: record?.status ?? null
      });
    } catch (error) {
      console.error(`${LOG_PREFIX} refresh failed`, {
        lineId: line.id,
        payoutId,
        message: error instanceof Error ? error.message : String(error)
      });
      refreshed.push({ lineId: line.id, dlocalPayoutId: payoutId, status: null });
    }
  }
  return { refreshed };
}

/** Enrichment for run detail: readiness + estimated local per line. */
export async function enrichPayoutLinesForAdmin(
  lines: Array<{
    id: string;
    professionalId: string;
    status: string;
    dlocalPayoutId: string | null;
    dlocalStatus: string | null;
    submissionError: string | null;
    professionalNetCents: number;
  }>
) {
  const out = [];
  for (const line of lines) {
    const estimate = await estimateLocalAmountForLine({
      lineId: line.id,
      professionalId: line.professionalId
    });
    out.push({
      lineId: line.id,
      ready: estimate.ready,
      readyReason: estimate.reason ?? null,
      payoutCountry: estimate.country,
      estimatedLocal:
        estimate.amount != null && estimate.currency
          ? { currency: estimate.currency, amount: estimate.amount, ratePerUsd: estimate.ratePerUsd }
          : null
    });
  }
  return out;
}

/** UTC month keys → periodStart/periodEnd ISO bounds. */
export function periodBoundsFromMonthKeys(months: string[]): { periodStart: string; periodEnd: string } | null {
  const keys = [...new Set(months.filter((m) => /^\d{4}-\d{2}$/.test(m)))].sort();
  if (keys.length === 0) {
    return null;
  }
  const first = keys[0]!;
  const last = keys[keys.length - 1]!;
  const [y1, m1] = first.split("-").map(Number) as [number, number];
  const [y2, m2] = last.split("-").map(Number) as [number, number];
  const periodStart = new Date(Date.UTC(y1, m1 - 1, 1, 0, 0, 0, 0));
  const periodEnd = new Date(Date.UTC(y2, m2, 0, 23, 59, 59, 999)); // day 0 of next month = last day
  return { periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() };
}
