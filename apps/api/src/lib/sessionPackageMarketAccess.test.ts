import { describe, expect, it } from "vitest";
import { sessionPackageAvailableForPatientMarket } from "./sessionPackageMarketAccess.js";

describe("sessionPackageAvailableForPatientMarket", () => {
  it("allows same market packages", () => {
    expect(
      sessionPackageAvailableForPatientMarket(
        { market: "AR", professionalId: null },
        "AR"
      )
    ).toBe(true);
  });

  it("allows AR global catalog templates for other patient markets", () => {
    expect(
      sessionPackageAvailableForPatientMarket(
        { market: "AR", professionalId: null },
        "US"
      )
    ).toBe(true);
  });

  it("rejects pro-specific packages from another market", () => {
    expect(
      sessionPackageAvailableForPatientMarket(
        { market: "AR", professionalId: "pro-1" },
        "US"
      )
    ).toBe(false);
  });
});
