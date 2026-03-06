import { Router } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { env } from "../../config/env.js";

const createCheckoutSchema = z.object({
  patientId: z.string().min(1),
  packageSize: z.enum(["4", "8", "12"]),
  successUrl: z.string().url(),
  cancelUrl: z.string().url()
});

const priceMap: Record<"4" | "8" | "12", string> = {
  "4": env.STRIPE_PRICE_PACKAGE_4,
  "8": env.STRIPE_PRICE_PACKAGE_8,
  "12": env.STRIPE_PRICE_PACKAGE_12
};

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" })
  : null;

export const paymentsRouter = Router();

paymentsRouter.post("/stripe/checkout-session", async (req, res) => {
  const parsed = createCheckoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid checkout payload", details: parsed.error.flatten() });
  }

  const priceId = priceMap[parsed.data.packageSize];
  if (!stripe || !priceId) {
    return res.status(501).json({
      error: "Stripe not configured",
      required: ["STRIPE_SECRET_KEY", "STRIPE_PRICE_PACKAGE_4", "STRIPE_PRICE_PACKAGE_8", "STRIPE_PRICE_PACKAGE_12"]
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: parsed.data.successUrl,
    cancel_url: parsed.data.cancelUrl,
    metadata: {
      patientId: parsed.data.patientId,
      packageSize: parsed.data.packageSize
    }
  });

  return res.status(201).json({ checkoutUrl: session.url, sessionId: session.id });
});

paymentsRouter.post("/stripe/webhook", (_req, res) => {
  // TODO: validar firma webhook y acreditar creditos de sesion.
  res.status(200).send("ok");
});
