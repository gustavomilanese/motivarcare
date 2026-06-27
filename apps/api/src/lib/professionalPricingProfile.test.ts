import { describe, expect, it } from "vitest";
import {
  listPriceUsdMajorForModality,
  profileDiscountPercentsForModality,
  validateCouplesPricingRequired
} from "./professionalPricingProfile.js";

describe("professionalPricingProfile", () => {
  const profile = {
    sessionPriceUsd: 80,
    couplesSessionPriceUsd: 95,
    discount4: 3,
    discount8: 6,
    discount12: 9,
    couplesDiscount4: 4,
    couplesDiscount8: 8,
    couplesDiscount12: 12,
    focusAreas: ["Terapia de pareja"]
  };

  it("uses couples list price for COUPLES modality", () => {
    expect(listPriceUsdMajorForModality(profile, "COUPLES")).toBe(95);
    expect(listPriceUsdMajorForModality(profile, "INDIVIDUAL")).toBe(80);
  });

  it("returns null couples list price when missing", () => {
    expect(
      listPriceUsdMajorForModality({ ...profile, couplesSessionPriceUsd: null }, "COUPLES")
    ).toBeNull();
  });

  it("prefers couples discounts with individual fallback", () => {
    expect(profileDiscountPercentsForModality(profile, "COUPLES")).toEqual({
      discount4: 4,
      discount8: 8,
      discount12: 12
    });
    expect(
      profileDiscountPercentsForModality({ ...profile, couplesDiscount4: null }, "COUPLES")
    ).toEqual({
      discount4: 3,
      discount8: 8,
      discount12: 12
    });
  });

  it("requires couples price when focus area includes couples therapy", () => {
    expect(validateCouplesPricingRequired({ focusAreas: ["Terapia de pareja"], couplesSessionPriceUsd: 90 })).toBeNull();
    expect(
      validateCouplesPricingRequired({ focusAreas: ["Terapia de pareja"], couplesSessionPriceUsd: null })
    ).toMatch(/required/i);
    expect(validateCouplesPricingRequired({ focusAreas: ["Ansiedad"], couplesSessionPriceUsd: null })).toBeNull();
  });
});
