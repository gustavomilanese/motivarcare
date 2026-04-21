import type { Market, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { getFinanceRules } from "../modules/finance/finance.service.js";

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
  market: Market | null;
}) {
  if (params.stripePriceId) {
    if (params.market) {
      const byComposite = await params.tx.sessionPackage.findUnique({
        where: { market_stripePriceId: { market: params.market, stripePriceId: params.stripePriceId } }
      });
      if (byComposite) {
        return byComposite;
      }
    }
    const byPrice = await params.tx.sessionPackage.findFirst({
      where: { stripePriceId: params.stripePriceId, active: true },
      orderBy: { createdAt: "asc" }
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
        active: true,
        ...(params.market ? { market: params.market } : {})
      },
      orderBy: { createdAt: "asc" }
    });
    if (byCreditsAndCurrency) {
      return byCreditsAndCurrency;
    }

    return params.tx.sessionPackage.findFirst({
      where: {
        credits: params.packageCredits,
        ...(params.market ? { market: params.market } : {})
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
  const marketRaw = metadata?.market;
  const market: Market | null =
    marketRaw === "AR" || marketRaw === "US" ? marketRaw : stripePriceId ? "US" : "AR";
  const paymentStatus = typeof checkoutSession?.payment_status === "string" ? checkoutSession.payment_status : "unknown";

  if (!checkoutSessionId || !patientId) {
    throw new Error("Webhook payload missing checkoutSessionId/patientId metadata");
  }

  if (paymentStatus !== "paid") {
    return;
  }

  const financeRules = await getFinanceRules();

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
      currency,
      market
    });
    if (!sessionPackage) {
      throw new Error("Could not resolve package for checkout session");
    }

    const creditSummary = await tx.patientPackagePurchase.aggregate({
      where: { patientId: patient.id },
      _sum: {
        remainingCredits: true
      }
    });
    const carryOverCredits = creditSummary._sum.remainingCredits ?? 0;

    if (carryOverCredits > 0) {
      await tx.patientPackagePurchase.updateMany({
        where: {
          patientId: patient.id,
          remainingCredits: { gt: 0 }
        },
        data: {
          remainingCredits: 0
        }
      });
    }

    const nextWalletCredits = carryOverCredits + sessionPackage.credits;

    const discountPct = sessionPackage.discountPercent ?? 0;
    const listPriceCents =
      discountPct > 0 && discountPct < 100
        ? Math.round(sessionPackage.priceCents / (1 - discountPct / 100))
        : sessionPackage.priceCents;

    const purchase = await tx.patientPackagePurchase.create({
      data: {
        patientId: patient.id,
        packageId: sessionPackage.id,
        stripeCheckoutSessionId: checkoutSessionId,
        totalCredits: nextWalletCredits,
        remainingCredits: nextWalletCredits,
        packageNameSnapshot: sessionPackage.name,
        packageCreditsSnapshot: sessionPackage.credits,
        packageListPriceCentsSnapshot: listPriceCents,
        packagePriceCentsSnapshot: sessionPackage.priceCents,
        packageDiscountPercentSnapshot: discountPct,
        packageCurrencySnapshot: sessionPackage.currency?.toLowerCase() ?? currency,
        platformCommissionPercentSnapshot: financeRules.platformCommissionPercent,
        trialPlatformPercentSnapshot: financeRules.trialPlatformPercent,
        professionalIdSnapshot: sessionPackage.professionalId ?? null
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
