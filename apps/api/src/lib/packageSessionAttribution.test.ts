import { describe, expect, it } from "vitest";
import {
  formatPackageSessionSourceLabel,
  packageSessionOrdinalFromRemaining
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
