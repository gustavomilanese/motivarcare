import { Router } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { env } from "../../config/env.js";

const supportedCurrencySchema = z.enum(["USD", "EUR", "GBP", "BRL", "ARS"]);
type SupportedCurrency = z.infer<typeof supportedCurrencySchema>;
type PackageSize = "4" | "8" | "12";

const createCheckoutSchema = z.object({
  patientId: z.string().min(1),
  packageSize: z.enum(["4", "8", "12"]),
  currency: supportedCurrencySchema.default("USD"),
  successUrl: z.string().url(),
  cancelUrl: z.string().url()
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

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" })
  : null;

export const paymentsRouter = Router();

paymentsRouter.post("/stripe/checkout-session", async (req, res) => {
  const parsed = createCheckoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid checkout payload", details: parsed.error.flatten() });
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

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: parsed.data.successUrl,
    cancel_url: parsed.data.cancelUrl,
    metadata: {
      patientId: parsed.data.patientId,
      packageSize: parsed.data.packageSize,
      currency: parsed.data.currency
    }
  });

  return res.status(201).json({
    checkoutUrl: session.url,
    sessionId: session.id,
    currency: parsed.data.currency
  });
});

paymentsRouter.post("/stripe/webhook", (_req, res) => {
  // TODO: validar firma webhook y acreditar creditos de sesion.
  res.status(200).send("ok");
});
