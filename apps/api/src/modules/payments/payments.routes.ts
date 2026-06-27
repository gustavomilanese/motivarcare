import express, { Router } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { env } from "../../config/env.js";
import { getActorContext } from "../../lib/actor.js";
import { requireAuth, type AuthenticatedRequest } from "../../lib/auth.js";
import { getIdempotencyValue, setIdempotencyValue } from "../../lib/idempotencyStore.js";
import type { Market } from "@prisma/client";
import { createDlocalCheckoutForIndividualSessions, createDlocalCheckoutForPackage, createDlocalCheckoutForTrialSession, processDlocalGoOrderSync, processDlocalGoPaymentNotification } from "./dlocalGoCheckout.service.js";
import { assertPatientOwnsPaymentCheckout } from "./paymentCheckout.service.js";
import { isDlocalGoConfigured, verifyDlocalGoNotificationSignature } from "../../lib/dlocalGoClient.js";
import { prisma } from "../../lib/prisma.js";
import {
  extendBookingSlotHold,
  requireBookingSlotHoldForPatient,
  SlotHoldError
} from "../../lib/bookingSlotHold.js";

const supportedCurrencySchema = z.enum(["USD", "EUR", "GBP", "BRL", "ARS"]);
type SupportedCurrency = z.infer<typeof supportedCurrencySchema>;
type PackageSize = "4" | "8" | "12";

const createCheckoutSchema = z.object({
  packageSize: z.enum(["4", "8", "12"]),
  currency: supportedCurrencySchema.default("USD"),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  idempotencyKey: z.string().trim().min(8).max(120).optional()
});

const usdLegacyPriceMap: Record<PackageSize, string> = {
  "4": env.STRIPE_PRICE_PACKAGE_4,
  "8": env.STRIPE_PRICE_PACKAGE_8,
  "12": env.STRIPE_PRICE_PACKAGE_12
};

function parsePriceMapFromEnv(): Partial<Record<SupportedCurrency, Partial<Record<PackageSize, string>>>> {
  if (!env.STRIPE_PRICE_MAP_JSON || env.STRIPE_PRICE_MAP_JSON.trim().length === 0) {
    return {};
  }

  try {
    const parsed = JSON.parse(env.STRIPE_PRICE_MAP_JSON) as unknown;
    const schema = z.record(
      supportedCurrencySchema,
      z.object({
        "4": z.string().optional(),
        "8": z.string().optional(),
        "12": z.string().optional()
      })
    );
    return schema.parse(parsed);
  } catch {
    return {};
  }
}

const priceMapFromEnv = parsePriceMapFromEnv();

function resolvePriceId(currency: SupportedCurrency, packageSize: PackageSize): string {
  const fromJson = priceMapFromEnv[currency]?.[packageSize];
  if (fromJson && fromJson.length > 0) {
    return fromJson;
  }

  if (currency === "USD") {
    return usdLegacyPriceMap[packageSize];
  }

  return "";
}

function asBuffer(body: unknown): Buffer {
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (typeof body === "string") {
    return Buffer.from(body);
  }
  return Buffer.from(JSON.stringify(body ?? {}));
}

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" })
  : null;

const createDlocalCheckoutSchema = z.object({
  packageId: z.string().trim().min(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  idempotencyKey: z.string().trim().min(8).max(120).optional()
});

const createDlocalIndividualCheckoutSchema = z.object({
  sessionCount: z.number().int().min(1).max(99),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  idempotencyKey: z.string().trim().min(8).max(120).optional()
});

const createDlocalTrialCheckoutSchema = z.object({
  professionalId: z.string().trim().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  holdId: z.string().uuid(),
  patientTimezone: z.string().trim().min(3).max(120).optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  idempotencyKey: z.string().trim().min(8).max(120).optional()
});

const syncDlocalTrialPaymentSchema = z.object({
  paymentId: z.string().trim().min(1)
});

const syncDlocalOrderPaymentSchema = z.object({
  orderId: z.string().trim().min(1)
});

function respondDlocalSyncResult(
  res: express.Response,
  result: Awaited<ReturnType<typeof processDlocalGoPaymentNotification>>
) {
  return res.status(200).json({
    ok: true,
    fulfilled: result.fulfilled,
    paymentStatus: result.paymentStatus,
    purchaseId: result.purchaseId ?? null,
    checkoutId: result.checkoutId ?? null
  });
}

async function syncDlocalPaymentForPatient(params: {
  patientId: string;
  paymentId?: string;
  orderId?: string;
  actorRole: "PATIENT" | "ADMIN";
}) {
  await assertPatientOwnsPaymentCheckout({
    patientId: params.patientId,
    paymentId: params.paymentId,
    orderId: params.orderId
  });

  if (params.orderId && !params.paymentId) {
    return processDlocalGoOrderSync(params.orderId);
  }

  const paymentId = params.paymentId?.trim();
  if (!paymentId) {
    throw new Error("Missing paymentId");
  }

  return processDlocalGoPaymentNotification(paymentId);
}

export const paymentsRouter = Router();

paymentsRouter.post("/stripe/checkout-session", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PATIENT" || !actor.patientProfileId) {
    return res.status(403).json({ error: "Only patients can create checkout sessions" });
  }

  const parsed = createCheckoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid checkout payload", details: parsed.error.flatten() });
  }

  const rawIdempotencyKey = parsed.data.idempotencyKey ?? req.header("x-idempotency-key") ?? null;
  const idempotencyKey = rawIdempotencyKey?.trim() || null;
  if (rawIdempotencyKey && (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 120)) {
    return res.status(400).json({ error: "Invalid idempotency key. Expected 8-120 characters." });
  }

  const idempotencyStoreKey = idempotencyKey
    ? `stripe_checkout:${actor.patientProfileId}:${idempotencyKey}`
    : null;
  if (idempotencyStoreKey) {
    const replay = await getIdempotencyValue(idempotencyStoreKey);
    if (replay) {
      try {
        return res.status(200).json(JSON.parse(replay) as unknown);
      } catch {
        // ignore corrupted replay cache
      }
    }
  }

  const priceId = resolvePriceId(parsed.data.currency, parsed.data.packageSize);
  if (!stripe || !priceId) {
    return res.status(501).json({
      error: "Stripe not configured",
      required: [
        "STRIPE_SECRET_KEY",
        "STRIPE_PRICE_MAP_JSON (recommended)",
        "STRIPE_PRICE_PACKAGE_4/8/12 (legacy USD fallback)"
      ]
    });
  }

  const patientRow = await prisma.patientProfile.findUnique({
    where: { id: actor.patientProfileId },
    select: { market: true }
  });
  const checkoutMarket: Market = patientRow?.market ?? "AR";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: parsed.data.successUrl,
    cancel_url: parsed.data.cancelUrl,
    metadata: {
      patientId: actor.patientProfileId,
      packageSize: parsed.data.packageSize,
      currency: parsed.data.currency,
      stripePriceId: priceId,
      market: checkoutMarket
    }
  });

  const responsePayload = {
    checkoutUrl: session.url,
    sessionId: session.id,
    currency: parsed.data.currency
  };

  if (idempotencyStoreKey) {
    await setIdempotencyValue({
      key: idempotencyStoreKey,
      value: JSON.stringify(responsePayload),
      ttlSeconds: 24 * 60 * 60
    });
  }

  return res.status(201).json(responsePayload);
});

paymentsRouter.post("/stripe/webhook", express.raw({ type: "application/json", limit: "2mb" }), async (req, res) => {
  if (!stripe) {
    return res.status(501).json({ error: "Stripe not configured" });
  }

  const signature = req.header("stripe-signature");
  const payloadBuffer = asBuffer(req.body);
  let event: Stripe.Event;

  try {
    if (env.STRIPE_WEBHOOK_SECRET && env.STRIPE_WEBHOOK_SECRET.trim().length > 0) {
      if (!signature) {
        return res.status(400).json({ error: "Missing stripe-signature header" });
      }
      event = stripe.webhooks.constructEvent(payloadBuffer, signature, env.STRIPE_WEBHOOK_SECRET);
    } else {
      event = JSON.parse(payloadBuffer.toString("utf8")) as Stripe.Event;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook payload";
    return res.status(400).json({ error: `Webhook signature/payload error: ${message}` });
  }

  const dedupeKey = `stripe:event:${event.id}`;
  const existing = await prisma.outboxEvent.findUnique({ where: { dedupeKey } });
  if (existing) {
    return res.status(200).json({ received: true, deduplicated: true });
  }

  await prisma.outboxEvent.create({
    data: {
      dedupeKey,
      eventType: `stripe.${event.type}`,
      aggregateType: "stripeEvent",
      aggregateId: event.id,
      payload: event as unknown as object,
      status: "PENDING"
    }
  });

  return res.status(202).json({ received: true, queued: true });
});

paymentsRouter.post("/dlocal/checkout", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!isDlocalGoConfigured()) {
    return res.status(501).json({
      error: "dLocal Go not configured",
      required: ["DLOCALGO_API_KEY", "DLOCALGO_API_SECRET"]
    });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PATIENT" || !actor.patientProfileId) {
    return res.status(403).json({ error: "Only patients can create dLocal Go checkouts" });
  }

  const parsed = createDlocalCheckoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid checkout payload", details: parsed.error.flatten() });
  }

  const rawIdempotencyKey = parsed.data.idempotencyKey ?? req.header("x-idempotency-key") ?? null;
  const idempotencyKey = rawIdempotencyKey?.trim() || null;
  if (rawIdempotencyKey && (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 120)) {
    return res.status(400).json({ error: "Invalid idempotency key. Expected 8-120 characters." });
  }

  const idempotencyStoreKey = idempotencyKey
    ? `dlocal_checkout:${actor.patientProfileId}:${idempotencyKey}`
    : null;
  if (idempotencyStoreKey) {
    const replay = await getIdempotencyValue(idempotencyStoreKey);
    if (replay) {
      try {
        return res.status(200).json(JSON.parse(replay) as unknown);
      } catch {
        // ignore corrupted replay cache
      }
    }
  }

  try {
    const checkout = await createDlocalCheckoutForPackage({
      patientId: actor.patientProfileId,
      packageId: parsed.data.packageId,
      successUrl: parsed.data.successUrl,
      backUrl: parsed.data.cancelUrl
    });

    const responsePayload = {
      checkoutUrl: checkout.checkoutUrl,
      paymentId: checkout.paymentId,
      orderId: checkout.orderId,
      provider: "dlocal" as const
    };

    if (idempotencyStoreKey) {
      await setIdempotencyValue({
        key: idempotencyStoreKey,
        value: JSON.stringify(responsePayload),
        ttlSeconds: 24 * 60 * 60
      });
    }

    return res.status(201).json(responsePayload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create dLocal Go checkout";
    return res.status(400).json({ error: message });
  }
});

paymentsRouter.post("/dlocal/checkout-individual", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!isDlocalGoConfigured()) {
    return res.status(501).json({
      error: "dLocal Go not configured",
      required: ["DLOCALGO_API_KEY", "DLOCALGO_API_SECRET"]
    });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PATIENT" || !actor.patientProfileId) {
    return res.status(403).json({ error: "Only patients can create dLocal Go checkouts" });
  }

  const parsed = createDlocalIndividualCheckoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid checkout payload", details: parsed.error.flatten() });
  }

  const rawIdempotencyKey = parsed.data.idempotencyKey ?? req.header("x-idempotency-key") ?? null;
  const idempotencyKey = rawIdempotencyKey?.trim() || null;
  if (rawIdempotencyKey && (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 120)) {
    return res.status(400).json({ error: "Invalid idempotency key. Expected 8-120 characters." });
  }

  const idempotencyStoreKey = idempotencyKey
    ? `dlocal_checkout_individual:${actor.patientProfileId}:${idempotencyKey}`
    : null;
  if (idempotencyStoreKey) {
    const replay = await getIdempotencyValue(idempotencyStoreKey);
    if (replay) {
      try {
        return res.status(200).json(JSON.parse(replay) as unknown);
      } catch {
        // ignore corrupted replay cache
      }
    }
  }

  try {
    const checkout = await createDlocalCheckoutForIndividualSessions({
      patientId: actor.patientProfileId,
      sessionCount: parsed.data.sessionCount,
      successUrl: parsed.data.successUrl,
      backUrl: parsed.data.cancelUrl
    });

    const responsePayload = {
      checkoutUrl: checkout.checkoutUrl,
      paymentId: checkout.paymentId,
      orderId: checkout.orderId,
      provider: "dlocal" as const
    };

    if (idempotencyStoreKey) {
      await setIdempotencyValue({
        key: idempotencyStoreKey,
        value: JSON.stringify(responsePayload),
        ttlSeconds: 24 * 60 * 60
      });
    }

    return res.status(201).json(responsePayload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create dLocal Go checkout";
    return res.status(400).json({ error: message });
  }
});

paymentsRouter.post("/dlocal/checkout-trial", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!isDlocalGoConfigured()) {
    return res.status(501).json({
      error: "dLocal Go not configured",
      required: ["DLOCALGO_API_KEY", "DLOCALGO_API_SECRET"]
    });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PATIENT" || !actor.patientProfileId) {
    return res.status(403).json({ error: "Only patients can create dLocal Go checkouts" });
  }

  const parsed = createDlocalTrialCheckoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid checkout payload", details: parsed.error.flatten() });
  }

  const rawIdempotencyKey = parsed.data.idempotencyKey ?? req.header("x-idempotency-key") ?? null;
  const idempotencyKey = rawIdempotencyKey?.trim() || null;
  if (rawIdempotencyKey && (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 120)) {
    return res.status(400).json({ error: "Invalid idempotency key. Expected 8-120 characters." });
  }

  const idempotencyStoreKey = idempotencyKey
    ? `dlocal_trial_checkout:${actor.patientProfileId}:${idempotencyKey}`
    : null;
  if (idempotencyStoreKey) {
    const replay = await getIdempotencyValue(idempotencyStoreKey);
    if (replay) {
      try {
        return res.status(200).json(JSON.parse(replay) as unknown);
      } catch {
        // ignore corrupted replay cache
      }
    }
  }

  try {
    await requireBookingSlotHoldForPatient({
      holdId: parsed.data.holdId,
      patientId: actor.patientProfileId,
      professionalId: parsed.data.professionalId,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt
    });
    await extendBookingSlotHold(parsed.data.holdId, actor.patientProfileId);

    const checkout = await createDlocalCheckoutForTrialSession({
      patientId: actor.patientProfileId,
      professionalId: parsed.data.professionalId,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
      patientTimezone: parsed.data.patientTimezone,
      successUrl: parsed.data.successUrl,
      backUrl: parsed.data.cancelUrl
    });

    const responsePayload = {
      checkoutUrl: checkout.checkoutUrl,
      paymentId: checkout.paymentId,
      orderId: checkout.orderId,
      provider: "dlocal" as const
    };

    if (idempotencyStoreKey) {
      await setIdempotencyValue({
        key: idempotencyStoreKey,
        value: JSON.stringify(responsePayload),
        ttlSeconds: 24 * 60 * 60
      });
    }

    return res.status(201).json(responsePayload);
  } catch (error) {
    if (error instanceof SlotHoldError) {
      return res.status(409).json({ error: error.message, code: error.code });
    }
    const message = error instanceof Error ? error.message : "Could not create dLocal Go trial checkout";
    return res.status(400).json({ error: message });
  }
});

paymentsRouter.post("/dlocal/sync-trial", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!isDlocalGoConfigured()) {
    return res.status(501).json({ error: "dLocal Go not configured" });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PATIENT" || !actor.patientProfileId) {
    return res.status(403).json({ error: "Only patients can sync trial payments" });
  }

  const parsed = syncDlocalTrialPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  try {
    const result = await syncDlocalPaymentForPatient({
      patientId: actor.patientProfileId,
      paymentId: parsed.data.paymentId,
      actorRole: "PATIENT"
    });
    return respondDlocalSyncResult(res, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not sync trial payment";
    return res.status(400).json({ error: message });
  }
});

paymentsRouter.post("/dlocal/sync-payment", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!isDlocalGoConfigured()) {
    return res.status(501).json({ error: "dLocal Go not configured" });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PATIENT" || !actor.patientProfileId) {
    return res.status(403).json({ error: "Only patients can sync payments" });
  }

  const parsed = syncDlocalTrialPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  try {
    const result = await syncDlocalPaymentForPatient({
      patientId: actor.patientProfileId,
      paymentId: parsed.data.paymentId,
      actorRole: "PATIENT"
    });
    return respondDlocalSyncResult(res, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not sync payment";
    return res.status(400).json({ error: message });
  }
});

paymentsRouter.post("/dlocal/sync-order", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!isDlocalGoConfigured()) {
    return res.status(501).json({ error: "dLocal Go not configured" });
  }

  const actor = await getActorContext(req.auth);
  if (!actor || actor.role !== "PATIENT" || !actor.patientProfileId) {
    return res.status(403).json({ error: "Only patients can sync payments" });
  }

  const parsed = syncDlocalOrderPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  try {
    const result = await syncDlocalPaymentForPatient({
      patientId: actor.patientProfileId,
      orderId: parsed.data.orderId,
      actorRole: "PATIENT"
    });
    return respondDlocalSyncResult(res, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not sync payment";
    return res.status(400).json({ error: message });
  }
});

paymentsRouter.post("/dlocal/webhook", express.raw({ type: "application/json", limit: "1mb" }), async (req, res) => {
  if (!isDlocalGoConfigured()) {
    return res.status(501).json({ error: "dLocal Go not configured" });
  }

  const payloadBuffer = asBuffer(req.body);
  const rawBody = payloadBuffer.toString("utf8");

  if (!verifyDlocalGoNotificationSignature({ authorizationHeader: req.header("authorization"), rawBody })) {
    return res.status(401).json({ error: "Invalid dLocal Go notification signature" });
  }

  let paymentId: string | null = null;
  try {
    const parsed = JSON.parse(rawBody) as { payment_id?: unknown };
    paymentId = typeof parsed.payment_id === "string" ? parsed.payment_id.trim() : null;
  } catch {
    return res.status(400).json({ error: "Invalid notification payload" });
  }

  if (!paymentId) {
    return res.status(400).json({ error: "Missing payment_id" });
  }

  const dedupeKey = `dlocal:payment:${paymentId}`;
  const existing = await prisma.outboxEvent.findUnique({ where: { dedupeKey } });
  if (existing) {
    return res.status(200).json({ received: true, deduplicated: true });
  }

  try {
    await processDlocalGoPaymentNotification(paymentId);
    await prisma.outboxEvent.create({
      data: {
        dedupeKey,
        eventType: "dlocal.payment.notified",
        aggregateType: "dlocalPayment",
        aggregateId: paymentId,
        payload: { paymentId },
        status: "COMPLETED"
      }
    });
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("dLocal Go webhook processing failed", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
});
