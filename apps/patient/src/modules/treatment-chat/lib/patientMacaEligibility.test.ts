import { describe, expect, it } from "vitest";
import { patientHasUpcomingOrActiveBooking, patientMacaEligible } from "./patientMacaEligibility";

describe("patientMacaEligible", () => {
  it("true cuando hay créditos aunque no haya reservas", () => {
    expect(
      patientMacaEligible({
        creditsRemaining: 2,
        bookings: []
      })
    ).toBe(true);
  });

  it("true cuando hay reserva confirmada futura sin créditos", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(
      patientMacaEligible({
        creditsRemaining: 0,
        bookings: [{ status: "CONFIRMED", endsAt: future }]
      })
    ).toBe(true);
  });

  it("false sin créditos ni reservas activas", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(
      patientMacaEligible({
        creditsRemaining: 0,
        bookings: [{ status: "CONFIRMED", endsAt: past }]
      })
    ).toBe(false);
  });

  it("true con status en minúsculas como en el portal paciente", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(
      patientMacaEligible({
        creditsRemaining: 0,
        bookings: [{ status: "confirmed", endsAt: future }]
      })
    ).toBe(true);
  });

  it("ignora reservas canceladas", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(
      patientHasUpcomingOrActiveBooking([{ status: "cancelled", endsAt: future }])
    ).toBe(false);
  });
});
