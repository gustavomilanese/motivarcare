import { z } from "zod";

export const unpaidProfessionalsQuerySchema = z.object({
  /** Meses UTC `YYYY-MM` separados por coma (multi-selección). Vacío = todos. */
  months: z.string().trim().max(200).optional(),
  /** IDs de sesión separados por coma (detalle / recorte de un lote). */
  sessionIds: z.string().trim().max(12000).optional()
});

export const financeSettingsSchema = z.object({
  platformCommissionPercent: z.number().int().min(0).max(100).optional(),
  trialPlatformPercent: z.number().int().min(0).max(100).optional(),
  defaultSessionPriceCents: z.number().int().min(100).max(200000).optional(),
  sessionPriceMinUsd: z.number().int().min(1).max(100000).optional(),
  sessionPriceMaxUsd: z.number().int().min(1).max(100000).optional()
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

export const createPayoutRunSchema = z
  .object({
    periodStart: z.string().datetime().optional(),
    periodEnd: z.string().datetime().optional(),
    notes: z.string().trim().max(2000).optional(),
    includePreviouslyPaid: z.boolean().optional().default(false),
    idempotencyKey: z.string().trim().min(8).max(120).optional(),
    /** Atajo: meses UTC YYYY-MM; si vienen, se usan para derivar periodStart/End. */
    months: z.array(z.string().regex(/^\d{4}-\d{2}$/)).max(24).optional()
  })
  .superRefine((data, ctx) => {
    const hasMonths = (data.months?.length ?? 0) > 0;
    if (!hasMonths && (!data.periodStart || !data.periodEnd)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide periodStart/periodEnd or months",
        path: ["periodStart"]
      });
    }
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

export const payUnpaidProfessionalSchema = z.object({
  method: z.enum(["ledger", "dlocal"]).default("ledger"),
  payoutReference: z.string().trim().min(2).max(120).optional(),
  /** Meses UTC YYYY-MM (vacío = todas las sesiones unpaid). */
  months: z.array(z.string().regex(/^\d{4}-\d{2}$/)).max(24).optional(),
  /** Si viene, solo se pagan esas sesiones elegibles (no el paquete entero). */
  sessionIds: z.array(z.string().trim().min(8).max(80)).max(500).optional()
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

/** Mismos parámetros de rango que ingresos profesional + filtros admin. */
export const adminPlatformFinanceQuerySchema = z.object({
  statsFrom: z.string().datetime().optional(),
  statsTo: z.string().datetime().optional(),
  statsAll: z.enum(["1", "true"]).optional(),
  professionalId: z.string().min(1).optional(),
  patientId: z.string().min(1).optional(),
  movementsPage: z.coerce.number().int().min(1).optional(),
  movementsPageSize: z.coerce.number().int().min(1).max(100).optional(),
  movementsSearch: z.string().trim().max(120).optional(),
  movementsPricing: z.enum(["all", "package", "list"]).optional(),
  movementsSort: z.enum(["date_desc", "date_asc", "gross_desc", "gross_asc"]).optional(),
  purchasesPage: z.coerce.number().int().min(1).optional(),
  purchasesPageSize: z.coerce.number().int().min(1).max(100).optional(),
  purchasesSearch: z.string().trim().max(120).optional(),
  purchasesSort: z.enum(["date_desc", "date_asc", "gross_desc", "gross_asc"]).optional()
});
