import { Router } from "express";
import {
  createPayoutRunSchema,
  financeDailyAggregateQuerySchema,
  financeOverviewQuerySchema,
  financeStripeEventsQuerySchema,
  financeSettingsSchema,
  listPayoutRunsQuerySchema,
  markPayoutLinePaidSchema
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
  const rules = await saveFinanceRules(parsed.data);
  return res.json({ rules, message: "Finance settings updated" });
});

financeRouter.post("/rebuild-session-records", async (_req, res) => {
  const rebuilt = await rebuildFinanceRecords();
  return res.json({ message: "Finance records rebuilt", processed: rebuilt.processed });
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
  const created = await createPayoutRun({
    ...parsed.data,
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
      payoutLines: run.payoutLines.map((line) => ({
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
      }))
    }
  });
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
