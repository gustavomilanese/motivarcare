import { describe, expect, it } from "vitest";
import {
  buildPayoutLineSessionSnapshot,
  parsePayoutLineSessionSnapshot
} from "./payoutLineSessionSnapshot.js";

describe("parsePayoutLineSessionSnapshot", () => {
  it("returns an empty list for garbage", () => {
    expect(parsePayoutLineSessionSnapshot(null)).toEqual([]);
    expect(parsePayoutLineSessionSnapshot({})).toEqual([]);
    expect(parsePayoutLineSessionSnapshot([{ id: "x" }])).toEqual([]);
  });

  it("keeps complete session rows", () => {
    const parsed = parsePayoutLineSessionSnapshot([
      {
        id: "ses_1",
        bookingId: "bkg_1",
        bookingStartsAt: "2026-08-23T15:00:00.000Z",
        bookingCompletedAt: "2026-08-23T16:00:00.000Z",
        isTrial: false,
        sourceKind: "package",
        sourceLabel: "Pack 8 · 2/8",
        purchaseId: "pur_1",
        packageSessionNumber: 2,
        packageCredits: 8,
        packageDiscountPercent: 10,
        currency: "usd",
        sessionPriceCents: 4500,
        platformCommissionPercent: 30,
        platformFeeCents: 1350,
        professionalNetCents: 3150,
        fxArsPerUsdSnapshot: 1400,
        patientId: "pat_1",
        patientName: "Leo"
      }
    ]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.sourceLabel).toBe("Pack 8 · 2/8");
    expect(parsed[0]?.professionalNetCents).toBe(3150);
  });
});

describe("buildPayoutLineSessionSnapshot", () => {
  it("labels trial vs package using the purchase snapshot", () => {
    const [trial, pack] = buildPayoutLineSessionSnapshot([
      {
        id: "ses_t",
        bookingId: "bkg_t",
        bookingStartsAt: new Date("2026-08-01T12:00:00.000Z"),
        bookingCompletedAt: new Date("2026-08-01T13:00:00.000Z"),
        isTrial: true,
        currency: "usd",
        sessionPriceCents: 3000,
        platformCommissionPercent: 100,
        platformFeeCents: 3000,
        professionalNetCents: 0,
        purchaseId: null,
        patient: { id: "pat_t", user: { fullName: "Ana" } },
        package: null,
        purchase: null,
        booking: { packageSessionOrdinal: null }
      },
      {
        id: "ses_p",
        bookingId: "bkg_p",
        bookingStartsAt: new Date("2026-08-02T12:00:00.000Z"),
        bookingCompletedAt: new Date("2026-08-02T13:00:00.000Z"),
        isTrial: false,
        currency: "usd",
        sessionPriceCents: 4500,
        platformCommissionPercent: 30,
        platformFeeCents: 1350,
        professionalNetCents: 3150,
        purchaseId: "pur_1",
        patient: { id: "pat_p", user: { fullName: "Leo" } },
        package: { name: "Pack 8", credits: 8 },
        purchase: {
          packageNameSnapshot: "Pack 8",
          packageCreditsSnapshot: 8,
          packageDiscountPercentSnapshot: null,
          fxArsPerUsdSnapshot: null
        },
        booking: { packageSessionOrdinal: 2 }
      }
    ]);
    expect(trial?.sourceKind).toBe("trial");
    expect(trial?.sourceLabel).toBe("Sesión de prueba");
    expect(pack?.sourceLabel).toBe("Pack 8 · 2/8");
  });
});
