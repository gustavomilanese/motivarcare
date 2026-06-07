import type { SessionPackagePlan } from "./sessionPackagePlan.js";

export function sortPlansByCredits(plans: SessionPackagePlan[]): SessionPackagePlan[] {
  return [...plans].sort((a, b) => a.credits - b.credits);
}

export function pickDefaultPurchasePlan(
  plans: SessionPackagePlan[],
  featuredPackageId: string | null | undefined
): SessionPackagePlan | null {
  if (plans.length === 0) {
    return null;
  }
  const sorted = sortPlansByCredits(plans);
  if (featuredPackageId) {
    const featured = sorted.find((plan) => plan.id === featuredPackageId);
    if (featured) {
      return featured;
    }
  }
  return sorted[0] ?? null;
}

export function pickFirstBundlePlan(plans: SessionPackagePlan[]): SessionPackagePlan | null {
  return plans.find((plan) => plan.credits > 1) ?? null;
}

export function packageUnitPriceMajor(plan: SessionPackagePlan): number {
  return plan.priceCents / 100 / Math.max(1, plan.credits);
}

/** Precio unitario estimado cuando no hay plan de 1 crédito. */
export function estimateIndividualUnitPriceMajor(plans: SessionPackagePlan[]): number | null {
  const oneCredit = plans.find((plan) => plan.credits === 1);
  if (oneCredit) {
    return packageUnitPriceMajor(oneCredit);
  }
  const bundle = pickFirstBundlePlan(plans);
  return bundle ? packageUnitPriceMajor(bundle) : null;
}
