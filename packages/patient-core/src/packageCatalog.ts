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

/** Precio de lista por sesión (sin descuento de paquete), en unidades mayores USD. */
export function individualListUnitPriceMajorFromPlan(plan: SessionPackagePlan): number {
  const credits = Math.max(1, plan.credits);
  const discountPercent = plan.discountPercent ?? 0;
  const listTotalCents =
    discountPercent > 0
      ? Math.round(plan.priceCents / (1 - discountPercent / 100))
      : plan.priceCents;
  return listTotalCents / 100 / credits;
}

/** Precio unitario estimado para sesiones sueltas (sin descuento de paquete). */
export function estimateIndividualUnitPriceMajor(plans: SessionPackagePlan[]): number | null {
  const oneCredit = plans.find((plan) => plan.credits === 1);
  if (oneCredit) {
    return individualListUnitPriceMajorFromPlan(oneCredit);
  }
  const bundle = pickFirstBundlePlan(plans);
  return bundle ? individualListUnitPriceMajorFromPlan(bundle) : null;
}

/** Precio de lista por sesión en USD (mayor), alineado con la API de cobro. */
export function resolveSessionListUsdMajor(params: {
  sessionPriceUsd?: number | null;
  sessionPriceArs?: number | null;
  arsPerUsd?: number | null;
}): number | null {
  if (params.sessionPriceUsd != null && params.sessionPriceUsd > 0) {
    return params.sessionPriceUsd;
  }
  if (
    params.sessionPriceArs != null
    && params.sessionPriceArs > 0
    && params.arsPerUsd != null
    && Number.isFinite(params.arsPerUsd)
    && params.arsPerUsd > 0
  ) {
    return Math.max(1, Math.round(params.sessionPriceArs / params.arsPerUsd));
  }
  return null;
}

/**
 * Precio de lista por sesión suelta: prioriza la tarifa del profesional (como el checkout)
 * y sólo infiere desde paquetes si no hay tarifa disponible.
 */
export function resolveIndividualListUnitUsdMajor(
  plans: SessionPackagePlan[],
  sessionListUsdMajor?: number | null
): number | null {
  if (sessionListUsdMajor != null && sessionListUsdMajor > 0) {
    return sessionListUsdMajor;
  }
  return estimateIndividualUnitPriceMajor(plans);
}

/**
 * Precio unitario suelto para UI/checkout del paciente.
 * Prioriza el catálogo de paquetes (misma fuente que `/api/public/session-packages`)
 * para evitar desvíos con `sessionPriceUsd` stale del directorio demo/local.
 */
export function resolveIndividualListUnitUsdFromPackages(
  plans: SessionPackagePlan[],
  sessionListUsdMajor?: number | null
): number | null {
  const fromPlans = estimateIndividualUnitPriceMajor(plans);
  if (fromPlans != null && fromPlans > 0) {
    return fromPlans;
  }
  if (sessionListUsdMajor != null && sessionListUsdMajor > 0) {
    return sessionListUsdMajor;
  }
  return null;
}
