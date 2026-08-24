import { Router } from "express";
import {
  createPayoutRunSchema,
  adminPlatformFinanceQuerySchema,
  financeDailyAggregateQuerySchema,
  financeOverviewQuerySchema,
  financeStripeEventsQuerySchema,
  financeSettingsSchema,
  listPayoutRunsQuerySchema,
  markPayoutLinePaidSchema,
  payUnpaidProfessionalSchema,
  unpaidProfessionalsQuerySchema
} from "./finance.schemas.js";
import {
  closePayoutRun,
  createPayoutRun,
  getFinanceDailyAggregates,
  getFinanceOverview,
  getFinanceRules,
  getPayoutRunDetail,
  getStripeOutboxOperations,
  listPayoutRuns,
  markPayoutLinePaid,
  rebuildFinanceDailyAggregates,
  rebuildFinanceRecords,
  retryStripeOutboxEvent,
  saveFinanceRules
} from "./finance.service.js";
import {
  getAdminPlatformExecutedEarnings,
  getAdminPlatformPackagePurchases
} from "./adminPlatformFinance.service.js";
import { sendApiError } from "../../lib/http.js";
import { requireAuth, requireRole } from "../../lib/auth.js";

export const financeRouter = Router();

financeRouter.use(requireAuth, requireRole(["ADMIN"]));

financeRouter.get("/settings", async (_req, res) => {
  const rules = await getFinanceRules();
  return res.json({ rules });
});

financeRouter.patch("/settings", async (req, res) => {
  const parsed = financeSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendApiError({ res, status: 400, code: "BAD_REQUEST", message: "Invalid payload", details: parsed.error.flatten() });
  }
  const current = await getFinanceRules();
  const nextMin = parsed.data.sessionPriceMinUsd ?? current.sessionPriceMinUsd;
  const nextMax = parsed.data.sessionPriceMaxUsd ?? current.sessionPriceMaxUsd;

  if (nextMin > nextMax) {
    return sendApiError({
      res,
      status: 400,
      code: "BAD_REQUEST",
      message: "Session price minimum cannot be greater than maximum"
    });
  }

  const rules = await saveFinanceRules(parsed.data);
  return res.json({ rules, message: "Finance settings updated" });
});

financeRouter.post("/rebuild-session-records", async (_req, res) => {
  const rebuilt = await rebuildFinanceRecords();
  return res.json({
    message: "Finance records rebuilt",
    processed: rebuilt.processed,
    failed: rebuilt.failed,
    errors: rebuilt.errors.slice(0, 50)
  });
});

financeRouter.post("/rebuild-daily-aggregates", async (_req, res) => {
  const rebuilt = await rebuildFinanceDailyAggregates();
  return res.json({ message: "Daily finance aggregates rebuilt", processedDays: rebuilt.processedDays });
});

financeRouter.get("/daily-aggregates", async (req, res) => {
  const parsed = financeDailyAggregateQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendApiError({ res, status: 400, code: "BAD_REQUEST", message: "Invalid query params", details: parsed.error.flatten() });
  }
  const rows = await getFinanceDailyAggregates(parsed.data);
  return res.json({ rows });
});

financeRouter.get("/overview", async (req, res) => {
  const parsed = financeOverviewQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendApiError({ res, status: 400, code: "BAD_REQUEST", message: "Invalid query params", details: parsed.error.flatten() });
  }
  const result = await getFinanceOverview(parsed.data);
  return res.json(result);
});

financeRouter.get("/platform/executed", async (req, res) => {
  const parsed = adminPlatformFinanceQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendApiError({ res, status: 400, code: "BAD_REQUEST", message: "Invalid query params", details: parsed.error.flatten() });
  }
  const result = await getAdminPlatformExecutedEarnings(req.query as Record<string, unknown>);
  return res.json(result);
});

financeRouter.get("/platform/purchases", async (req, res) => {
  const parsed = adminPlatformFinanceQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendApiError({ res, status: 400, code: "BAD_REQUEST", message: "Invalid query params", details: parsed.error.flatten() });
  }
  const result = await getAdminPlatformPackagePurchases(req.query as Record<string, unknown>);
  return res.json(result);
});

financeRouter.get("/stripe/events", async (req, res) => {
  const parsed = financeStripeEventsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendApiError({ res, status: 400, code: "BAD_REQUEST", message: "Invalid query params", details: parsed.error.flatten() });
  }
  const result = await getStripeOutboxOperations(parsed.data);
  return res.json(result);
});

financeRouter.post("/stripe/events/:eventId/retry", async (req, res) => {
  const eventId = req.params.eventId?.trim();
  if (!eventId) {
    return sendApiError({ res, status: 400, code: "BAD_REQUEST", message: "Invalid event id" });
  }

  const retried = await retryStripeOutboxEvent(eventId);
  if ("notFound" in retried) {
    return sendApiError({ res, status: 404, code: "NOT_FOUND", message: "Stripe event not found" });
  }
  if ("notStripeEvent" in retried) {
    return sendApiError({ res, status: 400, code: "BAD_REQUEST", message: "Event is not a Stripe webhook event" });
  }
  if ("alreadyProcessed" in retried) {
    return sendApiError({ res, status: 409, code: "CONFLICT", message: "Event already processed" });
  }
  if ("currentlyProcessing" in retried) {
    return sendApiError({ res, status: 409, code: "CONFLICT", message: "Event is currently processing" });
  }

  return res.json({
    message: "Event queued for retry",
    event: retried.event
  });
});

financeRouter.get("/payouts/runs", async (req, res) => {
  const parsed = listPayoutRunsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendApiError({ res, status: 400, code: "BAD_REQUEST", message: "Invalid query params", details: parsed.error.flatten() });
  }
  const result = await listPayoutRuns(parsed.data);
  return res.json(result);
});

financeRouter.post("/payouts/runs", async (req, res) => {
  const parsed = createPayoutRunSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendApiError({ res, status: 400, code: "BAD_REQUEST", message: "Invalid payload", details: parsed.error.flatten() });
  }
  const headerIdempotencyKey = req.header("x-idempotency-key")?.trim();
  let periodStart = parsed.data.periodStart;
  let periodEnd = parsed.data.periodEnd;
  if (parsed.data.months && parsed.data.months.length > 0) {
    const { periodBoundsFromMonthKeys } = await import("./payoutRunDlocal.service.js");
    const bounds = periodBoundsFromMonthKeys(parsed.data.months);
    if (!bounds) {
      return sendApiError({ res, status: 400, code: "BAD_REQUEST", message: "Invalid months" });
    }
    periodStart = bounds.periodStart;
    periodEnd = bounds.periodEnd;
  }
  if (!periodStart || !periodEnd) {
    return sendApiError({ res, status: 400, code: "BAD_REQUEST", message: "periodStart and periodEnd are required" });
  }
  const created = await createPayoutRun({
    periodStart,
    periodEnd,
    notes:
      parsed.data.notes?.trim()
      || (parsed.data.months?.length
        ? `Liquidación ${parsed.data.months.join(", ")}`
        : undefined),
    includePreviouslyPaid: parsed.data.includePreviouslyPaid,
    idempotencyKey: parsed.data.idempotencyKey?.trim() || headerIdempotencyKey || null
  });

  if (created.alreadyExists) {
    return res.json({
      message: "Payout run already exists for this idempotency key",
      run: created.run
    });
  }

  if (!created.run) {
    return sendApiError({ res, status: 409, code: "CONFLICT", message: "No completed session finance records found for selected period." });
  }

  return res.status(201).json({
    message: "Payout run created",
    run: {
      id: created.run.id,
      idempotencyKey: created.run.idempotencyKey,
      periodStart: created.run.periodStart,
      periodEnd: created.run.periodEnd,
      status: created.run.status,
      totalGrossCents: created.run.totalGrossCents,
      totalFeeCents: created.run.totalFeeCents,
      totalNetCents: created.run.totalNetCents,
      linesCount: created.linesCount,
      sessionsCount: created.sessionsCount
    }
  });
});

financeRouter.get("/payouts/runs/:runId", async (req, res) => {
  const run = await getPayoutRunDetail(req.params.runId);
  if (!run) {
    return sendApiError({ res, status: 404, code: "NOT_FOUND", message: "Payout run not found" });
  }
  const { enrichPayoutLinesForAdmin } = await import("./payoutRunDlocal.service.js");
  const enrichment = await enrichPayoutLinesForAdmin(
    run.payoutLines.map((line) => ({
      id: line.id,
      professionalId: line.professionalId,
      status: line.status,
      dlocalPayoutId: line.dlocalPayoutId,
      dlocalStatus: line.dlocalStatus,
      submissionError: line.submissionError,
      professionalNetCents: line.professionalNetCents
    }))
  );
  const enrichById = new Map(enrichment.map((item) => [item.lineId, item]));

  return res.json({
    run: {
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
      payoutLines: run.payoutLines.map((line) => {
        const extra = enrichById.get(line.id);
        return {
          id: line.id,
          professionalId: line.professionalId,
          professionalName: line.professional.user.fullName,
          professionalEmail: line.professional.user.email,
          sessionsCount: line.sessionsCount,
          grossCents: line.grossCents,
          platformFeeCents: line.platformFeeCents,
          professionalNetCents: line.professionalNetCents,
          status: line.status,
          paidAt: line.paidAt,
          payoutReference: line.payoutReference,
          dlocalPayoutId: line.dlocalPayoutId,
          dlocalStatus: line.dlocalStatus,
          submissionError: line.submissionError,
          ready: extra?.ready ?? false,
          readyReason: extra?.readyReason ?? null,
          payoutCountry: extra?.payoutCountry ?? null,
          estimatedLocal: extra?.estimatedLocal ?? null,
          sessionRecords: line.sessionRecords.map((record) => ({
            id: record.id,
            bookingId: record.bookingId,
            bookingStartsAt: record.bookingStartsAt,
            bookingCompletedAt: record.bookingCompletedAt,
            isTrial: record.isTrial,
            patientId: record.patientId,
            patientName: record.patient.user.fullName,
            patientEmail: record.patient.user.email,
            packageId: record.packageId,
            packageName: record.package?.name ?? null,
            sessionPriceCents: record.sessionPriceCents,
            platformFeeCents: record.platformFeeCents,
            professionalNetCents: record.professionalNetCents
          }))
        };
      })
    }
  });
});

financeRouter.post("/payouts/runs/:runId/submit-dlocal", async (req, res) => {
  const { submitPayoutRunToDlocal } = await import("./payoutRunDlocal.service.js");
  const { ProfessionalPayoutError } = await import("../payouts/professionalPayouts.service.js");
  try {
    const result = await submitPayoutRunToDlocal(req.params.runId);
    if ("notFound" in result && result.notFound) {
      return sendApiError({ res, status: 404, code: "NOT_FOUND", message: "Payout run not found" });
    }
    if ("closedRun" in result && result.closedRun) {
      return sendApiError({ res, status: 409, code: "CONFLICT", message: "Payout run already closed" });
    }
    if ("dlocalNotConfigured" in result && result.dlocalNotConfigured) {
      return sendApiError({
        res,
        status: 501,
        code: "SERVICE_UNAVAILABLE",
        message: "dLocal Go no está configurado en este entorno."
      });
    }
    return res.json({
      message: "Envío a dLocal finalizado",
      submitted: result.submitted,
      failed: result.failed,
      skipped: result.skipped,
      results: result.results
    });
  } catch (error) {
    if (error instanceof ProfessionalPayoutError) {
      return sendApiError({
        res,
        status: 422,
        code: "BAD_REQUEST",
        message: error.message,
        details: { payoutErrorCode: error.code }
      });
    }
    throw error;
  }
});

financeRouter.post("/payouts/runs/:runId/refresh-dlocal", async (req, res) => {
  const { refreshPayoutRunDlocalStatuses } = await import("./payoutRunDlocal.service.js");
  const result = await refreshPayoutRunDlocalStatuses(req.params.runId);
  if ("notFound" in result && result.notFound) {
    return sendApiError({ res, status: 404, code: "NOT_FOUND", message: "Payout run not found" });
  }
  return res.json({ message: "Estados dLocal actualizados", refreshed: result.refreshed });
});

financeRouter.post("/payouts/lines/:lineId/retry-dlocal", async (req, res) => {
  const { retryPayoutLineDlocal } = await import("./payoutRunDlocal.service.js");
  const result = await retryPayoutLineDlocal(req.params.lineId);
  if ("notFound" in result && result.notFound) {
    return sendApiError({ res, status: 404, code: "NOT_FOUND", message: "Payout line not found" });
  }
  if ("closedRun" in result && result.closedRun) {
    return sendApiError({ res, status: 409, code: "CONFLICT", message: "Payout run already closed" });
  }
  if ("dlocalNotConfigured" in result && result.dlocalNotConfigured) {
    return sendApiError({
      res,
      status: 501,
      code: "SERVICE_UNAVAILABLE",
      message: "dLocal Go no está configurado en este entorno."
    });
  }
  return res.json({ message: "Reintento dLocal", result: result.result });
});

financeRouter.post("/payouts/lines/:lineId/mark-paid", async (req, res) => {
  const parsed = markPayoutLinePaidSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendApiError({ res, status: 400, code: "BAD_REQUEST", message: "Invalid payload", details: parsed.error.flatten() });
  }
  const marked = await markPayoutLinePaid(req.params.lineId, parsed.data.payoutReference, parsed.data.paidAt);
  if (!marked) {
    return sendApiError({ res, status: 404, code: "NOT_FOUND", message: "Payout line not found" });
  }
  if (marked.closedRun) {
    return sendApiError({ res, status: 409, code: "CONFLICT", message: "Payout run already closed" });
  }
  return res.json({ message: "Payout line marked as paid", payoutLine: marked.payoutLine });
});

financeRouter.post("/payouts/runs/:runId/close", async (req, res) => {
  const closed = await closePayoutRun(req.params.runId);
  if ("notFound" in closed) {
    return sendApiError({ res, status: 404, code: "NOT_FOUND", message: "Payout run not found" });
  }
  if ("alreadyClosed" in closed) {
    return sendApiError({ res, status: 409, code: "CONFLICT", message: "Payout run already closed" });
  }
  if ("hasPendingLines" in closed) {
    return sendApiError({
      res,
      status: 409,
      code: "CONFLICT",
      message: "Cannot close payout run with pending lines",
      details: { pendingLines: closed.pendingLineIds }
    });
  }
  return res.json({ message: "Payout run closed", run: closed.run });
});

financeRouter.get("/unpaid-professionals", async (req, res) => {
  const parsed = unpaidProfessionalsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendApiError({
      res,
      status: 400,
      code: "BAD_REQUEST",
      message: "Invalid query params",
      details: parsed.error.flatten()
    });
  }
  const {
    listUnpaidProfessionalsOverview,
    parseUnpaidMonthKeys
  } = await import("./adminUnpaidProfessional.service.js");
  const overview = await listUnpaidProfessionalsOverview({
    months: parseUnpaidMonthKeys(parsed.data.months)
  });
  return res.json({
    currency: "usd",
    selectedMonths: overview.selectedMonths,
    months: overview.months,
    totals: overview.totals,
    professionals: overview.professionals
  });
});

financeRouter.get("/dlocal-payouts", async (req, res) => {
  const parsed = unpaidProfessionalsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendApiError({
      res,
      status: 400,
      code: "BAD_REQUEST",
      message: "Invalid query params",
      details: parsed.error.flatten()
    });
  }
  const { listDlocalPayoutTransfers, parseUnpaidMonthKeys } = await import("./adminUnpaidProfessional.service.js");
  const overview = await listDlocalPayoutTransfers({
    months: parseUnpaidMonthKeys(parsed.data.months)
  });
  return res.json({
    currency: "usd",
    selectedMonths: overview.selectedMonths,
    transfers: overview.transfers
  });
});

financeRouter.get("/dlocal-payouts/:lineId", async (req, res) => {
  const { getDlocalPayoutTransferDetail } = await import("./adminUnpaidProfessional.service.js");
  const detail = await getDlocalPayoutTransferDetail(req.params.lineId);
  if ("notFound" in detail) {
    return sendApiError({ res, status: 404, code: "NOT_FOUND", message: "dLocal transfer not found" });
  }
  return res.json({ currency: "usd", ...detail });
});

financeRouter.get("/unpaid-professionals/:professionalId", async (req, res) => {
  const parsed = unpaidProfessionalsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendApiError({
      res,
      status: 400,
      code: "BAD_REQUEST",
      message: "Invalid query params",
      details: parsed.error.flatten()
    });
  }
  const { getUnpaidProfessionalDetail, parseUnpaidMonthKeys } = await import("./adminUnpaidProfessional.service.js");
  const detail = await getUnpaidProfessionalDetail(req.params.professionalId, {
    months: parseUnpaidMonthKeys(parsed.data.months)
  });
  if ("notFound" in detail) {
    return sendApiError({ res, status: 404, code: "NOT_FOUND", message: "Professional not found" });
  }
  return res.json({ currency: "usd", ...detail });
});

financeRouter.post("/unpaid-professionals/:professionalId/pay", async (req, res) => {
  const parsed = payUnpaidProfessionalSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return sendApiError({ res, status: 400, code: "BAD_REQUEST", message: "Invalid payload", details: parsed.error.flatten() });
  }
  const { payUnpaidProfessional } = await import("./adminUnpaidProfessional.service.js");
  const { ProfessionalPayoutError } = await import("../payouts/professionalPayouts.service.js");
  try {
    const result = await payUnpaidProfessional({
      professionalId: req.params.professionalId,
      method: parsed.data.method,
      payoutReference: parsed.data.payoutReference,
      months: parsed.data.months
    });
    if ("notFound" in result) {
      return sendApiError({ res, status: 404, code: "NOT_FOUND", message: "Professional not found" });
    }
    if ("noRecords" in result) {
      return sendApiError({ res, status: 409, code: "CONFLICT", message: "No unpaid sessions for this professional" });
    }
    return res.json({
      message:
        parsed.data.method === "dlocal"
          ? "Payout enviado a dLocal; el ledger se marcará pagado cuando dLocal confirme la entrega"
          : "Professional payout recorded",
      currency: "usd",
      method: parsed.data.method,
      payoutRunId: result.payoutRunId,
      payoutLineId: result.payoutLineId,
      sessionsCount: result.sessionsCount,
      professionalNetCents: result.professionalNetCents,
      dlocalPayoutId: "dlocalPayoutId" in result ? result.dlocalPayoutId : undefined,
      dlocalStatus: "dlocalStatus" in result ? result.dlocalStatus : undefined,
      dlocalAmount: "dlocalAmount" in result ? result.dlocalAmount : undefined,
      dlocalCurrency: "dlocalCurrency" in result ? result.dlocalCurrency : undefined
    });
  } catch (error) {
    if (error instanceof ProfessionalPayoutError) {
      console.error("[finance-payout] pay endpoint rejected", {
        professionalId: req.params.professionalId,
        method: parsed.data.method,
        code: error.code,
        message: error.message
      });
      const status = error.code === "dlocal_not_configured" ? 501 : 422;
      return sendApiError({
        res,
        status,
        code: status === 501 ? "SERVICE_UNAVAILABLE" : "BAD_REQUEST",
        message: error.message,
        details: { payoutErrorCode: error.code }
      });
    }
    console.error("[finance-payout] pay endpoint failed", {
      professionalId: req.params.professionalId,
      method: parsed.data.method,
      message: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
});
