import { z } from "zod";

export const financeSettingsSchema = z.object({
  platformCommissionPercent: z.number().int().min(0).max(100).optional(),
  trialPlatformPercent: z.number().int().min(0).max(100).optional(),
  defaultSessionPriceCents: z.number().int().min(100).max(200000).optional()
});

export const financeOverviewQuerySchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  professionalId: z.string().min(1).optional(),
  patientId: z.string().min(1).optional(),
  packageId: z.string().min(1).optional(),
  isTrial: z.enum(["true", "false"]).optional(),
  bookingStatus: z.enum(["REQUESTED", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

export const createPayoutRunSchema = z.object({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  notes: z.string().trim().max(2000).optional(),
  includePreviouslyPaid: z.boolean().optional().default(false),
  idempotencyKey: z.string().trim().min(8).max(120).optional()
});

export const listPayoutRunsQuerySchema = z.object({
  status: z.enum(["DRAFT", "CLOSED"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

export const markPayoutLinePaidSchema = z.object({
  payoutReference: z.string().trim().min(2).max(120).optional(),
  paidAt: z.string().datetime().optional()
});

export const financeDailyAggregateQuerySchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  currency: z.string().trim().min(3).max(8).optional()
});

export const financeStripeEventsQuerySchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "PROCESSED", "DEAD_LETTER"]).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional()
});
