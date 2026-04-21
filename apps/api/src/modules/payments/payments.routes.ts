import express, { Router } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { env } from "../../config/env.js";
import { getActorContext } from "../../lib/actor.js";
import { requireAuth, type AuthenticatedRequest } from "../../lib/auth.js";
import { getIdempotencyValue, setIdempotencyValue } from "../../lib/idempotencyStore.js";
import type { Market } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

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
  const checkoutMarket: Market = parsed.data.currency === "USD" ? "US" : "AR";
  if (patientRow && patientRow.market !== checkoutMarket) {
    return res.status(409).json({
      error: "Checkout currency does not match patient market",
      patientMarket: patientRow.market,
      requestedMarket: checkoutMarket
    });
  }

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
