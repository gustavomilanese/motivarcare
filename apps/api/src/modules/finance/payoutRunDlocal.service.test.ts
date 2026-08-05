import { describe, expect, it } from "vitest";
import { periodBoundsFromMonthKeys } from "./payoutRunDlocal.service.js";

describe("periodBoundsFromMonthKeys", () => {
  it("builds UTC bounds for a single month", () => {
    const bounds = periodBoundsFromMonthKeys(["2025-07"]);
    expect(bounds).not.toBeNull();
    expect(bounds!.periodStart).toBe("2025-07-01T00:00:00.000Z");
    expect(bounds!.periodEnd).toBe("2025-07-31T23:59:59.999Z");
  });

  it("spans inclusive range across months", () => {
    const bounds = periodBoundsFromMonthKeys(["2025-07", "2025-08"]);
    expect(bounds).not.toBeNull();
    expect(bounds!.periodStart).toBe("2025-07-01T00:00:00.000Z");
    expect(bounds!.periodEnd).toBe("2025-08-31T23:59:59.999Z");
  });

  it("returns null for empty input", () => {
    expect(periodBoundsFromMonthKeys([])).toBeNull();
  });
});
