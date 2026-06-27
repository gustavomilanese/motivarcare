import type { Market, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { computeFxSnapshot } from "../../lib/fxSnapshot.js";
import { getFinanceRules } from "../finance/finance.service.js";

export async function fulfillPaidPackagePurchase(params: {
  checkoutSessionId: string;
  patientId: string;
  packageId: string;
  professionalIdSnapshot: string | null;
  pricing: {
    listPriceCents: number;
    priceCents: number;
    discountPercent: number;
  };
  market: Market;
  billingCurrency: string;
  paymentProviderSnapshot: string;
}): Promise<string | null> {
  const financeRules = await getFinanceRules();
  let purchaseIdForEmail: string | null = null;

  await prisma.$transaction(async (tx) => {
    const existingPurchase = await tx.patientPackagePurchase.findUnique({
      where: { stripeCheckoutSessionId: params.checkoutSessionId }
    });
    if (existingPurchase) {
      purchaseIdForEmail = existingPurchase.id;
      return;
    }

    const patient = await tx.patientProfile.findUnique({
      where: { id: params.patientId },
      select: { id: true }
    });
    if (!patient) {
      throw new Error("Patient profile not found for checkout");
    }

    const sessionPackage = await tx.sessionPackage.findUnique({
      where: { id: params.packageId }
    });
    if (!sessionPackage || !sessionPackage.active) {
      throw new Error("Session package not found or inactive");
    }

    const creditSummary = await tx.patientPackagePurchase.aggregate({
      where: { patientId: patient.id },
      _sum: { remainingCredits: true }
    });
    const carryOverCredits = creditSummary._sum.remainingCredits ?? 0;

    if (carryOverCredits > 0) {
      await tx.patientPackagePurchase.updateMany({
        where: { patientId: patient.id, remainingCredits: { gt: 0 } },
        data: { remainingCredits: 0 }
      });
    }

    const nextWalletCredits = carryOverCredits + sessionPackage.credits;
    const purchaseCurrency = params.billingCurrency.toLowerCase();
    const fxSnapshot = await computeFxSnapshot({
      priceCents: params.pricing.priceCents,
      currency: purchaseCurrency
    });

    const purchase = await tx.patientPackagePurchase.create({
      data: {
        patientId: patient.id,
        packageId: sessionPackage.id,
        stripeCheckoutSessionId: params.checkoutSessionId,
        totalCredits: nextWalletCredits,
        remainingCredits: nextWalletCredits,
        packageNameSnapshot: sessionPackage.name,
        packageCreditsSnapshot: sessionPackage.credits,
        packageListPriceCentsSnapshot: params.pricing.listPriceCents,
        packagePriceCentsSnapshot: params.pricing.priceCents,
        packageDiscountPercentSnapshot: params.pricing.discountPercent,
        packageCurrencySnapshot: purchaseCurrency,
        platformCommissionPercentSnapshot: financeRules.platformCommissionPercent,
        trialPlatformPercentSnapshot: financeRules.trialPlatformPercent,
        professionalIdSnapshot: params.professionalIdSnapshot,
        packagePriceUsdCentsSnapshot: fxSnapshot.packagePriceUsdCentsSnapshot,
        fxArsPerUsdSnapshot: fxSnapshot.fxArsPerUsdSnapshot,
        fxProviderSnapshot: fxSnapshot.fxProviderSnapshot,
        fxFetchedAt: fxSnapshot.fxFetchedAt,
        paymentProviderSnapshot: params.paymentProviderSnapshot
      }
    });

    purchaseIdForEmail = purchase.id;

    await tx.creditLedger.create({
      data: {
        patientId: patient.id,
        bookingId: null,
        type: "PACKAGE_PURCHASE",
        amount: sessionPackage.credits,
        note: `${params.paymentProviderSnapshot} checkout ${params.checkoutSessionId}`
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
          checkoutSessionId: params.checkoutSessionId
        } satisfies Prisma.InputJsonObject
      }
    });
  });

  return purchaseIdForEmail;
}

export async function fulfillPaidIndividualSessionsPurchase(params: {
  checkoutSessionId: string;
  patientId: string;
  packageId: string;
  sessionCount: number;
  displayName: string;
  professionalIdSnapshot: string | null;
  pricing: {
    listPriceCents: number;
    priceCents: number;
    discountPercent: number;
  };
  market: Market;
  billingCurrency: string;
  paymentProviderSnapshot: string;
}): Promise<string | null> {
  const financeRules = await getFinanceRules();
  let purchaseIdForEmail: string | null = null;

  await prisma.$transaction(async (tx) => {
    const existingPurchase = await tx.patientPackagePurchase.findUnique({
      where: { stripeCheckoutSessionId: params.checkoutSessionId }
    });
    if (existingPurchase) {
      purchaseIdForEmail = existingPurchase.id;
      return;
    }

    const patient = await tx.patientProfile.findUnique({
      where: { id: params.patientId },
      select: { id: true }
    });
    if (!patient) {
      throw new Error("Patient profile not found for checkout");
    }

    const creditSummary = await tx.patientPackagePurchase.aggregate({
      where: { patientId: patient.id },
      _sum: { remainingCredits: true }
    });
    const carryOverCredits = creditSummary._sum.remainingCredits ?? 0;

    if (carryOverCredits > 0) {
      await tx.patientPackagePurchase.updateMany({
        where: { patientId: patient.id, remainingCredits: { gt: 0 } },
        data: { remainingCredits: 0 }
      });
    }

    const nextWalletCredits = carryOverCredits + params.sessionCount;
    const purchaseCurrency = params.billingCurrency.toLowerCase();
    const fxSnapshot = await computeFxSnapshot({
      priceCents: params.pricing.priceCents,
      currency: purchaseCurrency
    });

    const purchase = await tx.patientPackagePurchase.create({
      data: {
        patientId: patient.id,
        packageId: params.packageId,
        stripeCheckoutSessionId: params.checkoutSessionId,
        totalCredits: nextWalletCredits,
        remainingCredits: nextWalletCredits,
        packageNameSnapshot: params.displayName,
        packageCreditsSnapshot: params.sessionCount,
        packageListPriceCentsSnapshot: params.pricing.listPriceCents,
        packagePriceCentsSnapshot: params.pricing.priceCents,
        packageDiscountPercentSnapshot: params.pricing.discountPercent,
        packageCurrencySnapshot: purchaseCurrency,
        platformCommissionPercentSnapshot: financeRules.platformCommissionPercent,
        trialPlatformPercentSnapshot: financeRules.trialPlatformPercent,
        professionalIdSnapshot: params.professionalIdSnapshot,
        packagePriceUsdCentsSnapshot: fxSnapshot.packagePriceUsdCentsSnapshot,
        fxArsPerUsdSnapshot: fxSnapshot.fxArsPerUsdSnapshot,
        fxProviderSnapshot: fxSnapshot.fxProviderSnapshot,
        fxFetchedAt: fxSnapshot.fxFetchedAt,
        paymentProviderSnapshot: params.paymentProviderSnapshot
      }
    });

    purchaseIdForEmail = purchase.id;

    await tx.creditLedger.create({
      data: {
        patientId: patient.id,
        bookingId: null,
        type: "PACKAGE_PURCHASE",
        amount: params.sessionCount,
        note: `${params.paymentProviderSnapshot} individual checkout ${params.checkoutSessionId}`
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
          packageId: params.packageId,
          checkoutSessionId: params.checkoutSessionId
        } satisfies Prisma.InputJsonObject
      }
    });
  });

  return purchaseIdForEmail;
}
