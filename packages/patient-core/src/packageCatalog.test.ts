import { describe, expect, it } from "vitest";
import {
  estimateIndividualUnitPriceMajor,
  individualListUnitPriceMajorFromPlan,
  resolveIndividualListUnitUsdFromPackages,
  resolveIndividualListUnitUsdMajor
} from "./packageCatalog.js";

describe("individualListUnitPriceMajorFromPlan", () => {
  it("uses undiscounted list price for discounted bundles", () => {
    const unit = individualListUnitPriceMajorFromPlan({
      id: "pkg-4",
      name: "Continuidad",
      credits: 4,
      priceCents: 36000,
      discountPercent: 10,
      currency: "usd",
      description: "4 sessions"
    });
    expect(unit).toBe(100);
  });
});

describe("estimateIndividualUnitPriceMajor", () => {
  it("does not use discounted per-session bundle price", () => {
    const unit = estimateIndividualUnitPriceMajor([
      {
        id: "pkg-4",
        name: "Continuidad",
        credits: 4,
        priceCents: 36000,
        discountPercent: 10,
        currency: "usd",
        description: "4 sessions"
      }
    ]);
    expect(unit).toBe(100);
  });
});

describe("resolveIndividualListUnitUsdMajor", () => {
  it("prefers professional list price over bundle inference", () => {
    const unit = resolveIndividualListUnitUsdMajor(
      [
        {
          id: "pkg-4",
          name: "Continuidad",
          credits: 4,
          priceCents: 20000,
          discountPercent: 56,
          currency: "usd",
          description: "4 sessions"
        }
      ],
      50
    );
    expect(unit).toBe(50);
  });
});

describe("resolveIndividualListUnitUsdFromPackages", () => {
  it("prefers API bundle list price over stale professional usd on client", () => {
    const unit = resolveIndividualListUnitUsdFromPackages(
      [
        {
          id: "pkg-4",
          name: "Continuidad",
          credits: 4,
          priceCents: 9000,
          discountPercent: 10,
          currency: "usd",
          description: "4 sessions"
        }
      ],
      58
    );
    expect(unit).toBe(25);
  });
});
