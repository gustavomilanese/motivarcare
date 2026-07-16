import { Prisma } from "@prisma/client";

export type FinancePurchasePricingInput = {
  id: string;
  packageId: string;
  packageNameSnapshot: string | null;
  packageCreditsSnapshot: number | null;
  packagePriceCentsSnapshot: number | null;
  packagePriceUsdCentsSnapshot: number | null;
  packageCurrencySnapshot: string | null;
  packageDiscountPercentSnapshot?: number | null;
  platformCommissionPercentSnapshot: number | null;
  trialPlatformPercentSnapshot: number | null;
  sessionPackage: {
    id: string;
    name?: string | null;
    currency: string | null;
    priceCents: number | null;
    credits: number | null;
  };
};

export type FinanceTrialCheckoutPricingInput = {
  id: string;
  chargeAmountMajor: Prisma.Decimal | number | string | null;
  chargeCurrency: string | null;
  displayName: string | null;
  metadata?: unknown;
};

export type ResolvedFinanceSessionPricing = {
  isTrial: boolean;
  sessionPriceCents: number;
  currency: string;
  platformCommissionPercent: number;
  platformFeeCents: number;
  professionalNetCents: number;
  packageId: string | null;
  purchaseId: string | null;
  paymentCheckoutId: string | null;
  sourceLabel: string;
  packageCredits: number | null;
};

function roundCents(value: number): number {
  return Math.round(value);
}

function decimalToNumber(value: Prisma.Decimal | number | string | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * USD list price snapshotted on trial checkout (= tarifa del profesional al pagar,
 * misma base que una sesión individual).
 */
export function readTrialProfessionalRateUsdCents(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const pricing = (metadata as { pricing?: unknown }).pricing;
  if (!pricing || typeof pricing !== "object" || Array.isArray(pricing)) {
    return null;
  }
  const record = pricing as { listPriceCents?: unknown; priceCents?: unknown };
  for (const key of ["listPriceCents", "priceCents"] as const) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return roundCents(value);
    }
  }
  return null;
}

/** Misma regla que el portal: trial = sin purchase / 0 créditos consumidos. */
export function isTrialBookingForFinance(booking: {
  consumedPurchaseId: string | null;
  consumedCredits: number;
}): boolean {
  return booking.consumedPurchaseId == null || booking.consumedCredits === 0;
}

export function resolvePackageSessionPricing(params: {
  purchase: FinancePurchasePricingInput;
  regularCommissionPercentFallback: number;
}): Omit<ResolvedFinanceSessionPricing, "isTrial" | "paymentCheckoutId"> {
  const purchase = params.purchase;
  const credits = purchase.packageCreditsSnapshot ?? purchase.sessionPackage.credits;
  if (credits == null || !Number.isInteger(credits) || credits <= 0) {
    throw new Error("Package purchase is missing a valid credits snapshot");
  }

  let sessionPriceCents: number;
  let currency: string;

  if (purchase.packagePriceUsdCentsSnapshot != null && purchase.packagePriceUsdCentsSnapshot > 0) {
    sessionPriceCents = roundCents(purchase.packagePriceUsdCentsSnapshot / credits);
    currency = "usd";
  } else {
    const packagePriceCents = purchase.packagePriceCentsSnapshot ?? purchase.sessionPackage.priceCents;
    if (packagePriceCents == null || packagePriceCents <= 0) {
      throw new Error("Package purchase is missing a price snapshot");
    }
    sessionPriceCents = roundCents(packagePriceCents / credits);
    currency = (
      purchase.packageCurrencySnapshot
      ?? purchase.sessionPackage.currency
      ?? "usd"
    )
      .trim()
      .toLowerCase() || "usd";
  }

  if (sessionPriceCents <= 0) {
    throw new Error("Resolved package session price is invalid");
  }

  const platformCommissionPercent =
    purchase.platformCommissionPercentSnapshot ?? params.regularCommissionPercentFallback;
  if (platformCommissionPercent < 0 || platformCommissionPercent > 100) {
    throw new Error("Invalid platform commission percent on purchase");
  }

  const platformFeeCents = roundCents((sessionPriceCents * platformCommissionPercent) / 100);
  const professionalNetCents = Math.max(0, sessionPriceCents - platformFeeCents);
  const packageName =
    purchase.packageNameSnapshot?.trim()
    || purchase.sessionPackage.name?.trim()
    || "Package";
  const discountPercent = purchase.packageDiscountPercentSnapshot ?? null;
  const sourceLabel =
    discountPercent != null && discountPercent > 0
      ? `${packageName} (${credits} cr · −${discountPercent}%)`
      : `${packageName} (${credits} cr)`;

  return {
    sessionPriceCents,
    currency,
    platformCommissionPercent,
    platformFeeCents,
    professionalNetCents,
    packageId: purchase.packageId,
    purchaseId: purchase.id,
    sourceLabel,
    packageCredits: credits
  };
}

export function resolveTrialSessionPricing(params: {
  checkout: FinanceTrialCheckoutPricingInput;
  trialCommissionPercent: number;
}): Omit<ResolvedFinanceSessionPricing, "isTrial" | "packageId" | "purchaseId" | "packageCredits"> {
  const professionalRateUsdCents = readTrialProfessionalRateUsdCents(params.checkout.metadata);
  let sessionPriceCents: number;
  let currency: string;

  if (professionalRateUsdCents != null) {
    // Misma base económica que una sesión individual: tarifa del profesional al checkout.
    sessionPriceCents = professionalRateUsdCents;
    currency = "usd";
  } else {
    const major = decimalToNumber(params.checkout.chargeAmountMajor);
    if (major == null || major <= 0) {
      throw new Error(
        "Trial payment checkout is missing the professional session rate (and charge amount)"
      );
    }
    currency = (params.checkout.chargeCurrency ?? "usd").trim().toLowerCase() || "usd";
    sessionPriceCents = roundCents(major * 100);
  }

  if (sessionPriceCents <= 0) {
    throw new Error("Trial session price is invalid");
  }

  const platformCommissionPercent = params.trialCommissionPercent;
  if (platformCommissionPercent < 0 || platformCommissionPercent > 100) {
    throw new Error("Invalid trial platform commission percent");
  }
  const platformFeeCents = roundCents((sessionPriceCents * platformCommissionPercent) / 100);
  const professionalNetCents = Math.max(0, sessionPriceCents - platformFeeCents);

  return {
    sessionPriceCents,
    currency,
    platformCommissionPercent,
    platformFeeCents,
    professionalNetCents,
    paymentCheckoutId: params.checkout.id,
    sourceLabel: "Rate × sesión"
  };
}
