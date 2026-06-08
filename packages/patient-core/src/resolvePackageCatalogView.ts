import type { AppLanguage } from "@therapy/i18n-config";
import {
  buildUnpricedBundlePlans,
  catalogPricingReady,
  DEFAULT_DISPLAY_FEATURED_BUNDLE_CREDITS,
  isDisplayOnlyBundlePlanId
} from "./packageBundleTemplates.js";
import type { SessionPackagePlan } from "./sessionPackagePlan.js";

export type PackagesLoadingHint = "hidden" | "loading" | "empty" | "unpriced_formats" | "priced";

export type PackageCatalogViewInput = {
  hasProfessionalsOnPortal: boolean;
  hasAssignedProfessional: boolean;
  catalogFromApi: boolean;
  packagesLoading: boolean;
  pricedPlans: SessionPackagePlan[];
  featuredPackageIdFromApi: string | null;
  language: AppLanguage;
};

export type PackageCatalogView = {
  showPackageSection: boolean;
  pricingReady: boolean;
  displayPlans: SessionPackagePlan[];
  featuredPackageId: string | null;
  packagesLoadingHint: PackagesLoadingHint;
};

function topBundlePlans(plans: SessionPackagePlan[]): SessionPackagePlan[] {
  return plans.filter((plan) => plan.credits > 1).slice(0, 3);
}

function resolveFeaturedBundleId(
  bundles: SessionPackagePlan[],
  featuredPackageIdFromApi: string | null
): string | null {
  if (featuredPackageIdFromApi && bundles.some((plan) => plan.id === featuredPackageIdFromApi)) {
    return featuredPackageIdFromApi;
  }
  return bundles[0]?.id ?? null;
}

/**
 * Reglas de catálogo compartidas entre web, mobile browser y app nativa.
 */
export function resolvePackageCatalogView(input: PackageCatalogViewInput): PackageCatalogView {
  const pricingReady = catalogPricingReady({
    hasAssignedProfessional: input.hasAssignedProfessional,
    catalogFromApi: input.catalogFromApi,
    pricedPlans: input.pricedPlans
  });

  if (!input.hasProfessionalsOnPortal) {
    return {
      showPackageSection: false,
      pricingReady,
      displayPlans: [],
      featuredPackageId: null,
      packagesLoadingHint: "hidden"
    };
  }

  if (pricingReady) {
    const displayPlans = topBundlePlans(input.pricedPlans);
    return {
      showPackageSection: true,
      pricingReady: true,
      displayPlans,
      featuredPackageId: resolveFeaturedBundleId(displayPlans, input.featuredPackageIdFromApi),
      packagesLoadingHint: "priced"
    };
  }

  if (!input.hasAssignedProfessional) {
    const displayPlans = buildUnpricedBundlePlans(input.language);
    return {
      showPackageSection: true,
      pricingReady: false,
      displayPlans,
      featuredPackageId: `display-bundle-${DEFAULT_DISPLAY_FEATURED_BUNDLE_CREDITS}`,
      packagesLoadingHint: "unpriced_formats"
    };
  }

  if (input.packagesLoading) {
    return {
      showPackageSection: true,
      pricingReady: false,
      displayPlans: [],
      featuredPackageId: null,
      packagesLoadingHint: "loading"
    };
  }

  return {
    showPackageSection: true,
    pricingReady: false,
    displayPlans: [],
    featuredPackageId: null,
    packagesLoadingHint: "empty"
  };
}

export type PackagePurchaseGateReason = "allowed" | "pricing_not_ready" | "display_only_plan";

export type PackagePurchaseGate = {
  allowed: boolean;
  reason: PackagePurchaseGateReason;
};

/** Bloquea compra si no hay precios reales o el plan es solo display. */
export function resolvePackagePurchaseGate(params: {
  pricingReady: boolean;
  planId: string;
}): PackagePurchaseGate {
  if (!params.pricingReady) {
    return { allowed: false, reason: "pricing_not_ready" };
  }
  if (isDisplayOnlyBundlePlanId(params.planId)) {
    return { allowed: false, reason: "display_only_plan" };
  }
  return { allowed: true, reason: "allowed" };
}
