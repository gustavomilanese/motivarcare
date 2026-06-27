import { describe, expect, it } from "vitest";
import { formatTrialPaymentDescription } from "./formatTrialPaymentDescription.js";

describe("formatTrialPaymentDescription", () => {
  it("formats Argentina with hyphenated date and 24h time", () => {
    const description = formatTrialPaymentDescription({
      professionalName: "Roberto Piazza Psico",
      startsAt: "2026-06-29T10:00:00.000Z",
      patientTimezone: "America/Argentina/Buenos_Aires",
      patientMarket: "AR"
    });

    expect(description).toContain("Sesión de prueba ·");
    expect(description).toMatch(/lun - 29-6 07:00/);
    expect(description).toContain("Roberto Piazza Psico");
  });

  it("formats non-AR markets with 12h clock", () => {
    const description = formatTrialPaymentDescription({
      professionalName: "Dr. Jane Doe",
      startsAt: "2026-06-29T15:00:00.000Z",
      patientTimezone: "America/New_York",
      patientMarket: "US"
    });

    expect(description).toMatch(/ - \d+-\d+ /);
    expect(description).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
  });
});
