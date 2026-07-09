import type { AppLanguage } from "@therapy/i18n-config";
import { textByLanguage } from "@therapy/i18n-config";
import { bundleDisplayName, describePackagePlan } from "./packageCopy.js";
import type { SessionPackagePlan } from "./sessionPackagePlan.js";

export const STANDARD_SESSION_BUNDLE_CREDITS = [4, 8, 12] as const;

export type StandardSessionBundleCredits = (typeof STANDARD_SESSION_BUNDLE_CREDITS)[number];

/** Un paquete por tier estándar (4 / 8 / 12), respetando el orden de preferencia si se pasa. */
export function pickStandardSessionBundles<T extends { credits: number }>(
  items: T[],
  options?: { preferredFirst?: T[] }
): T[] {
  const bundles = items.filter((item) => item.credits > 1);
  const preferred = options?.preferredFirst?.filter((item) => item.credits > 1) ?? [];
  const picked: T[] = [];

  for (const tier of STANDARD_SESSION_BUNDLE_CREDITS) {
    const match =
      preferred.find((item) => item.credits === tier)
      ?? bundles.find((item) => item.credits === tier && !picked.some((existing) => existing.credits === tier));
    if (match) {
      picked.push(match);
    }
  }

  return picked;
}

export const DEFAULT_DISPLAY_FEATURED_BUNDLE_CREDITS = 8;

function t(language: AppLanguage, values: Parameters<typeof textByLanguage>[1]): string {
  return textByLanguage(language, values);
}

/** Solo UI: sin precio hasta tener profesional asignado y catálogo del API. */
export function buildUnpricedBundlePlans(language: AppLanguage): SessionPackagePlan[] {
  return STANDARD_SESSION_BUNDLE_CREDITS.map((credits) => ({
    id: `display-bundle-${credits}`,
    name: bundleDisplayName(credits, (values) => t(language, values)),
    credits,
    priceCents: 0,
    currency: "USD",
    discountPercent: 0,
    description: describePackagePlan(credits, (values) => t(language, values))
  }));
}

export function isDisplayOnlyBundlePlanId(planId: string): boolean {
  return planId.startsWith("display-bundle-");
}

export function catalogPricingReady(params: {
  hasAssignedProfessional: boolean;
  catalogFromApi: boolean;
  pricedPlans: SessionPackagePlan[];
}): boolean {
  return (
    params.hasAssignedProfessional
    && params.catalogFromApi
    && params.pricedPlans.some((plan) => plan.credits > 1 && plan.priceCents > 0)
  );
}
