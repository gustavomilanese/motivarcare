import type { AppLanguage, LocalizedText } from "@therapy/i18n-config";
import { textByLanguage } from "@therapy/i18n-config";
import type { PackagePlan } from "../../app/types";
import { describePackagePlan } from "../../app/lib/packageCatalog";

export const STANDARD_SESSION_BUNDLE_CREDITS = [4, 8, 12] as const;

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function bundleDisplayName(credits: number, language: AppLanguage): string {
  if (credits >= 12) {
    return t(language, {
      es: "Intensivo · 12 sesiones",
      en: "Intensive · 12 sessions",
      pt: "Intensivo · 12 sessoes"
    });
  }
  if (credits >= 8) {
    return t(language, {
      es: "Continuidad · 8 sesiones",
      en: "Continuity · 8 sessions",
      pt: "Continuidade · 8 sessoes"
    });
  }
  return t(language, {
    es: "Inicio · 4 sesiones",
    en: "Starter · 4 sessions",
    pt: "Inicio · 4 sessoes"
  });
}

/** Solo UI: sin precio hasta tener profesional asignado y catálogo del API. */
export function buildUnpricedBundlePlans(language: AppLanguage): PackagePlan[] {
  return STANDARD_SESSION_BUNDLE_CREDITS.map((credits) => ({
    id: `display-bundle-${credits}`,
    name: bundleDisplayName(credits, language),
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
  pricedPlans: PackagePlan[];
}): boolean {
  return (
    params.hasAssignedProfessional
    && params.catalogFromApi
    && params.pricedPlans.some((plan) => plan.credits > 1 && plan.priceCents > 0)
  );
}
