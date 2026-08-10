import { describe, expect, it } from "vitest";
import { countAvailablePatientSessions } from "./countAvailablePatientSessions";

describe("countAvailablePatientSessions", () => {
  it("sums package credits and a reusable paid trial", () => {
    expect(countAvailablePatientSessions({ creditsRemaining: 0 })).toBe(0);
    expect(countAvailablePatientSessions({ creditsRemaining: 3 })).toBe(3);
    expect(
      countAvailablePatientSessions({ creditsRemaining: 0, trialRebookAvailable: true })
    ).toBe(1);
    expect(
      countAvailablePatientSessions({ creditsRemaining: 2, trialRebookAvailable: true })
    ).toBe(3);
  });
});
