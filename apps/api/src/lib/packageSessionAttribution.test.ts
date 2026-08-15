import { describe, expect, it } from "vitest";
import {
  formatPackageSessionSourceLabel,
  packageSessionOrdinalFromRemaining,
  resolvePackageSessionIndexForPurchase
} from "./packageSessionAttribution.js";

describe("packageSessionOrdinalFromRemaining", () => {
  it("assigns 1/4 then 2/4 from remaining credits", () => {
    expect(
      packageSessionOrdinalFromRemaining({
        remainingCreditsBeforeConsume: 4,
        packageCreditsSnapshot: 4,
        totalCredits: 4
      })
    ).toBe(1);
    expect(
      packageSessionOrdinalFromRemaining({
        remainingCreditsBeforeConsume: 3,
        packageCreditsSnapshot: 4,
        totalCredits: 4
      })
    ).toBe(2);
    expect(
      packageSessionOrdinalFromRemaining({
        remainingCreditsBeforeConsume: 1,
        packageCreditsSnapshot: 4,
        totalCredits: 4
      })
    ).toBe(4);
  });

  it("keeps pack-8 ordinals independent of other purchases", () => {
    expect(
      packageSessionOrdinalFromRemaining({
        remainingCreditsBeforeConsume: 8,
        packageCreditsSnapshot: 8,
        totalCredits: 8
      })
    ).toBe(1);
    expect(
      packageSessionOrdinalFromRemaining({
        remainingCreditsBeforeConsume: 3,
        packageCreditsSnapshot: 8,
        totalCredits: 8
      })
    ).toBe(6);
  });
});

describe("resolvePackageSessionIndexForPurchase", () => {
  const day = (n: number) => new Date(Date.UTC(2026, 7, n, 15, 0, 0));

  it("resequences duplicate stored ordinals by startsAt", () => {
    const index = resolvePackageSessionIndexForPurchase([
      {
        id: "second",
        packageSessionOrdinal: 1,
        startsAt: day(16),
        status: "COMPLETED",
        completedAt: day(16)
      },
      {
        id: "first",
        packageSessionOrdinal: 1,
        startsAt: day(15),
        status: "COMPLETED",
        completedAt: day(15)
      }
    ]);
    expect(index.get("first")).toBe(1);
    expect(index.get("second")).toBe(2);
  });

  it("keeps unique stored ordinals", () => {
    const index = resolvePackageSessionIndexForPurchase([
      {
        id: "a",
        packageSessionOrdinal: 1,
        startsAt: day(15),
        status: "COMPLETED",
        completedAt: day(15)
      },
      {
        id: "b",
        packageSessionOrdinal: 2,
        startsAt: day(16),
        status: "COMPLETED",
        completedAt: day(16)
      }
    ]);
    expect(index.get("a")).toBe(1);
    expect(index.get("b")).toBe(2);
  });
});

describe("formatPackageSessionSourceLabel", () => {
  it("includes session slot and discount", () => {
    expect(
      formatPackageSessionSourceLabel({
        packageName: "Pack 4",
        packageCredits: 4,
        packageSessionNumber: 2,
        discountPercent: 5
      })
    ).toBe("Pack 4 · 2/4 · −5%");
  });
});
