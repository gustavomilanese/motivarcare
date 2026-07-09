import express, { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../../lib/auth.js";
import { getActorContext } from "../../lib/actor.js";
import {
  isDlocalGoConfigured,
  verifyDlocalGoPayoutNotificationSignature
} from "../../lib/dlocalGoPayouts.js";
import {
  ProfessionalPayoutError,
  assessPayoutReadiness,
  createProfessionalPayout,
  getStoredPayoutRecord,
  loadProfessionalPayoutAdmin,
  syncPayoutStatus
} from "./professionalPayouts.service.js";

const LOG_PREFIX = "[dlocal-payouts]";

function asBuffer(body: unknown): Buffer {
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (typeof body === "string") {
    return Buffer.from(body, "utf8");
  }
  return Buffer.from("");
}

export const payoutsRouter = Router();

/**
 * Webhook de payouts de dLocal. dLocal envía `{ payout_id }`; consultamos el estado real y
 * lo persistimos. Idempotente (la misma notificación puede llegar más de una vez).
 */
payoutsRouter.post(
  "/dlocal/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
  async (req, res) => {
    if (!isDlocalGoConfigured()) {
      return res.status(501).json({ error: "dLocal Go not configured" });
    }

    const rawBody = asBuffer(req.body).toString("utf8");
    if (!verifyDlocalGoPayoutNotificationSignature({ authorizationHeader: req.header("authorization"), rawBody })) {
      console.warn(`${LOG_PREFIX} webhook signature rejected`);
      return res.status(401).json({ error: "Invalid dLocal Go notification signature" });
    }

    let payoutId: string | null = null;
    try {
      const parsed = JSON.parse(rawBody) as { payout_id?: unknown };
      payoutId = typeof parsed.payout_id === "string" ? parsed.payout_id.trim() : null;
    } catch {
      return res.status(400).json({ error: "Invalid notification payload" });
    }

    if (!payoutId) {
      return res.status(400).json({ error: "Missing payout_id" });
    }

    // Respondemos rápido y sincronizamos el estado. Si algo falla, dLocal reintenta.
    try {
      await syncPayoutStatus(payoutId);
    } catch (error) {
      console.error(`${LOG_PREFIX} webhook processing failed`, {
        payoutId,
        message: error instanceof Error ? error.message : String(error)
      });
      return res.status(500).json({ error: "Webhook processing failed" });
    }

    return res.status(200).json({ received: true });
  }
);

/**
 * Estado de "listo para cobrar" del profesional autenticado. Lo usa el portal pro para
 * mostrar si su configuración de cobro está completa o qué le falta.
 */
payoutsRouter.get("/me/readiness", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PROFESSIONAL" || !actor.professionalProfileId) {
    return res.status(403).json({ error: "Only professionals can check payout readiness" });
  }
  const admin = await loadProfessionalPayoutAdmin(actor.professionalProfileId);
  const readiness = assessPayoutReadiness(admin);
  return res.json({
    ready: readiness.ready,
    reason: readiness.reason ?? null,
    payoutCountry: admin?.payoutBankAccount?.payoutCountry ?? null,
    payoutStatus: admin?.payoutStatus ?? null
  });
});

const createPayoutSchema = z.object({
  professionalProfileId: z.string().trim().min(1),
  amount: z.number().positive(),
  externalReference: z.string().trim().max(120).optional(),
  beneficiaryEmail: z.string().email().optional(),
  description: z.string().trim().max(200).optional()
});

/**
 * Dispara un payout a un profesional (uso admin/finanzas). El `amount` va en la moneda local
 * del país de cobro; la conversión desde el neto interno la resuelve quien llama.
 */
payoutsRouter.post(
  "/admin/create",
  requireAuth,
  requireRole(["ADMIN"]),
  async (req: AuthenticatedRequest, res) => {
    const parsed = createPayoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    try {
      const { payout, record } = await createProfessionalPayout({
        professionalProfileId: parsed.data.professionalProfileId,
        amount: parsed.data.amount,
        externalReference: parsed.data.externalReference ?? null,
        beneficiaryEmail: parsed.data.beneficiaryEmail ?? null,
        description: parsed.data.description ?? null
      });
      return res.status(201).json({ payout, record });
    } catch (error) {
      if (error instanceof ProfessionalPayoutError) {
        const status = error.code === "dlocal_not_configured" ? 501 : 422;
        return res.status(status).json({ error: error.message, code: error.code });
      }
      console.error(`${LOG_PREFIX} admin create payout failed`, {
        message: error instanceof Error ? error.message : String(error)
      });
      return res.status(502).json({ error: "Payout provider error" });
    }
  }
);

/** Estado de un payout (uso admin/finanzas). Refresca contra dLocal. */
payoutsRouter.get(
  "/admin/:payoutId",
  requireAuth,
  requireRole(["ADMIN"]),
  async (req: AuthenticatedRequest, res) => {
    const payoutId = req.params.payoutId?.trim();
    if (!payoutId) {
      return res.status(400).json({ error: "Missing payout id" });
    }
    try {
      const record = (await syncPayoutStatus(payoutId)) ?? (await getStoredPayoutRecord(payoutId));
      if (!record) {
        return res.status(404).json({ error: "Payout not found" });
      }
      return res.json({ record });
    } catch (error) {
      console.error(`${LOG_PREFIX} admin get payout failed`, {
        payoutId,
        message: error instanceof Error ? error.message : String(error)
      });
      return res.status(502).json({ error: "Payout provider error" });
    }
  }
);
