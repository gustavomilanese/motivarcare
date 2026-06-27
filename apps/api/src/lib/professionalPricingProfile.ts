import type { TherapyModality } from "@therapy/types";
import { focusAreasIncludeCouplesTherapy } from "@therapy/types";
import { listPriceUsdMajorUnits } from "./resolveSessionPackagePrice.js";

export type ProfessionalPricingProfile = {
  sessionPriceArs?: number | null;
  sessionPriceUsd?: number | null;
  couplesSessionPriceUsd?: number | null;
  discount4?: number | null;
  discount8?: number | null;
  discount12?: number | null;
  couplesDiscount4?: number | null;
  couplesDiscount8?: number | null;
  couplesDiscount12?: number | null;
  focusAreas?: string[] | null;
};

export function listPriceUsdMajorForModality(
  profile: ProfessionalPricingProfile,
  modality: TherapyModality,
  arsPerUsd?: number | null
): number | null {
  if (modality === "COUPLES") {
    if (profile.couplesSessionPriceUsd != null && profile.couplesSessionPriceUsd > 0) {
      return profile.couplesSessionPriceUsd;
    }
    return null;
  }
  return listPriceUsdMajorUnits(
    {
      sessionPriceArs: profile.sessionPriceArs ?? null,
      sessionPriceUsd: profile.sessionPriceUsd ?? null
    },
    arsPerUsd
  );
}

export function profileDiscountPercentsForModality(
  profile: ProfessionalPricingProfile,
  modality: TherapyModality
): {
  discount4: number | null | undefined;
  discount8: number | null | undefined;
  discount12: number | null | undefined;
} {
  if (modality === "COUPLES") {
    return {
      discount4: profile.couplesDiscount4 ?? profile.discount4,
      discount8: profile.couplesDiscount8 ?? profile.discount8,
      discount12: profile.couplesDiscount12 ?? profile.discount12
    };
  }
  return {
    discount4: profile.discount4,
    discount8: profile.discount8,
    discount12: profile.discount12
  };
}

export function validateCouplesPricingRequired(params: {
  focusAreas?: string[] | null;
  couplesSessionPriceUsd?: number | null;
}): string | null {
  if (!focusAreasIncludeCouplesTherapy(params.focusAreas)) {
    return null;
  }
  if (params.couplesSessionPriceUsd == null || params.couplesSessionPriceUsd <= 0) {
    return "Couples session list price (USD) is required when offering couples therapy";
  }
  return null;
}
