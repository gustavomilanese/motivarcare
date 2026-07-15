import { describe, expect, it } from "vitest";
import {
  isTrialBookingForFinance,
  resolvePackageSessionPricing,
  resolveTrialSessionPricing
} from "./resolveFinanceSessionPricing.js";

describe("isTrialBookingForFinance", () => {
  it("marks bookings without purchase as trial", () => {
    expect(isTrialBookingForFinance({ consumedPurchaseId: null, consumedCredits: 0 })).toBe(true);
  });

  it("marks credit bookings as package sessions", () => {
    expect(isTrialBookingForFinance({ consumedPurchaseId: "pur_1", consumedCredits: 1 })).toBe(false);
  });
});

describe("resolvePackageSessionPricing", () => {
  it("uses USD package snapshot divided by credits", () => {
    const resolved = resolvePackageSessionPricing({
      regularCommissionPercentFallback: 25,
      purchase: {
        id: "pur_1",
        packageId: "pkg_1",
        packageNameSnapshot: "Pack 4",
        packageCreditsSnapshot: 4,
        packagePriceCentsSnapshot: 4000000,
        packagePriceUsdCentsSnapshot: 10800,
        packageCurrencySnapshot: "ars",
        platformCommissionPercentSnapshot: 30,
        trialPlatformPercentSnapshot: 100,
        sessionPackage: { id: "pkg_1", name: "Pack 4", currency: "ars", priceCents: 4000000, credits: 4 }
      }
    });

    expect(resolved.sessionPriceCents).toBe(2700);
    expect(resolved.currency).toBe("usd");
    expect(resolved.platformCommissionPercent).toBe(30);
    expect(resolved.platformFeeCents).toBe(810);
    expect(resolved.professionalNetCents).toBe(1890);
    expect(resolved.sourceLabel).toContain("Pack 4");
    expect(resolved.purchaseId).toBe("pur_1");
  });

  it("never invents a price when snapshots are missing", () => {
    expect(() =>
      resolvePackageSessionPricing({
        regularCommissionPercentFallback: 25,
        purchase: {
          id: "pur_1",
          packageId: "pkg_1",
          packageNameSnapshot: null,
          packageCreditsSnapshot: 4,
          packagePriceCentsSnapshot: null,
          packagePriceUsdCentsSnapshot: null,
          packageCurrencySnapshot: null,
          platformCommissionPercentSnapshot: null,
          trialPlatformPercentSnapshot: null,
          sessionPackage: { id: "pkg_1", name: "Pack", currency: "usd", priceCents: null, credits: 4 }
        }
      })
    ).toThrow(/missing a price snapshot/i);
  });
});

describe("resolveTrialSessionPricing", () => {
  it("uses professional list rate from checkout metadata (same as individual)", () => {
    const resolved = resolveTrialSessionPricing({
      trialCommissionPercent: 100,
      checkout: {
        id: "chk_1",
        chargeAmountMajor: 35000,
        chargeCurrency: "ARS",
        displayName: "Sesión de prueba",
        metadata: {
          pricing: {
            listPriceCents: 6500,
            priceCents: 6500
          }
        }
      }
    });
    expect(resolved.sessionPriceCents).toBe(6500);
    expect(resolved.currency).toBe("usd");
    expect(resolved.platformFeeCents).toBe(6500);
    expect(resolved.professionalNetCents).toBe(0);
    expect(resolved.sourceLabel).toMatch(/rate/i);
  });

  it("falls back to charge amount only when rate snapshot is missing", () => {
    const resolved = resolveTrialSessionPricing({
      trialCommissionPercent: 100,
      checkout: {
        id: "chk_1",
        chargeAmountMajor: 27,
        chargeCurrency: "USD",
        displayName: "MotivarCare · trial",
        metadata: null
      }
    });
    expect(resolved.sessionPriceCents).toBe(2700);
    expect(resolved.currency).toBe("usd");
  });

  it("rejects trial without rate or charge", () => {
    expect(() =>
      resolveTrialSessionPricing({
        trialCommissionPercent: 100,
        checkout: {
          id: "chk_1",
          chargeAmountMajor: null,
          chargeCurrency: "ARS",
          displayName: null,
          metadata: {}
        }
      })
    ).toThrow(/missing the professional session rate/i);
  });
});
