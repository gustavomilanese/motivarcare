import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
}

function normalizeCurrency(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "usd";
  }
  return value.trim().toLowerCase();
}

function parsePackageCredits(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function resolvePackageForCheckout(params: {
  tx: Prisma.TransactionClient;
  stripePriceId: string | null;
  packageCredits: number | null;
  currency: string;
}) {
  if (params.stripePriceId) {
    const byPrice = await params.tx.sessionPackage.findUnique({
      where: { stripePriceId: params.stripePriceId }
    });
    if (byPrice) {
      return byPrice;
    }
  }

  if (params.packageCredits) {
    const byCreditsAndCurrency = await params.tx.sessionPackage.findFirst({
      where: {
        credits: params.packageCredits,
        currency: params.currency,
        active: true
      },
      orderBy: { createdAt: "asc" }
    });
    if (byCreditsAndCurrency) {
      return byCreditsAndCurrency;
    }

    return params.tx.sessionPackage.findFirst({
      where: {
        credits: params.packageCredits
      },
      orderBy: { createdAt: "asc" }
    });
  }

  return null;
}

async function processStripeCheckoutCompleted(payload: unknown) {
  const event = asRecord(payload);
  const data = asRecord(event?.data);
  const checkoutSession = asRecord(data?.object);
  const metadata = asRecord(checkoutSession?.metadata);

  const checkoutSessionId = typeof checkoutSession?.id === "string" ? checkoutSession.id : null;
  const patientId = typeof metadata?.patientId === "string" ? metadata.patientId : null;
  const stripePriceId = typeof metadata?.stripePriceId === "string" ? metadata.stripePriceId : null;
  const packageCredits = parsePackageCredits(metadata?.packageSize);
  const currency = normalizeCurrency(checkoutSession?.currency ?? metadata?.currency);
  const paymentStatus = typeof checkoutSession?.payment_status === "string" ? checkoutSession.payment_status : "unknown";

  if (!checkoutSessionId || !patientId) {
    throw new Error("Webhook payload missing checkoutSessionId/patientId metadata");
  }

  if (paymentStatus !== "paid") {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const existingPurchase = await tx.patientPackagePurchase.findUnique({
      where: { stripeCheckoutSessionId: checkoutSessionId }
    });
    if (existingPurchase) {
      return;
    }

    const patient = await tx.patientProfile.findUnique({
      where: { id: patientId },
      select: { id: true }
    });
    if (!patient) {
      throw new Error("Patient profile not found for checkout session");
    }

    const sessionPackage = await resolvePackageForCheckout({
      tx,
      stripePriceId,
      packageCredits,
      currency
    });
    if (!sessionPackage) {
      throw new Error("Could not resolve package for checkout session");
    }

    const purchase = await tx.patientPackagePurchase.create({
      data: {
        patientId: patient.id,
        packageId: sessionPackage.id,
        stripeCheckoutSessionId: checkoutSessionId,
        totalCredits: sessionPackage.credits,
        remainingCredits: sessionPackage.credits
      }
    });

    await tx.creditLedger.create({
      data: {
        patientId: patient.id,
        bookingId: null,
        type: "PACKAGE_PURCHASE",
        amount: sessionPackage.credits,
        note: `Stripe checkout ${checkoutSessionId}`
      }
    });

    await tx.outboxEvent.create({
      data: {
        dedupeKey: `billing:package_purchase:${purchase.id}`,
        eventType: "billing.package_purchase_recorded",
        aggregateType: "patientPackagePurchase",
        aggregateId: purchase.id,
        payload: {
          purchaseId: purchase.id,
          patientId: patient.id,
          packageId: sessionPackage.id,
          checkoutSessionId
        }
      }
    });
  });
}

export async function processOutboxEvent(params: {
  eventType: string;
  payload: Prisma.JsonValue;
}): Promise<void> {
  if (params.eventType === "stripe.checkout.session.completed") {
    await processStripeCheckoutCompleted(params.payload);
    return;
  }

  // Unknown events are intentionally no-op here.
}
