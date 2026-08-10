import { describe, expect, it } from "vitest";
import { canPatientSelfChangeProfessional } from "./canPatientSelfChangeProfessional";

describe("canPatientSelfChangeProfessional", () => {
  const baseBooking = {
    id: "b1",
    startsAt: new Date(Date.now() + 86_400_000).toISOString(),
    endsAt: new Date(Date.now() + 90_000_000).toISOString(),
    status: "confirmed"
  };

  it("requires an assigned professional, zero credits, and no upcoming bookings", () => {
    expect(
      canPatientSelfChangeProfessional({
        creditsRemaining: 0,
        bookings: [],
        assignedProfessionalId: "pro-a"
      })
    ).toBe(true);

    expect(
      canPatientSelfChangeProfessional({
        creditsRemaining: 4,
        bookings: [],
        assignedProfessionalId: "pro-a"
      })
    ).toBe(false);

    expect(
      canPatientSelfChangeProfessional({
        creditsRemaining: 0,
        trialRebookAvailable: true,
        bookings: [],
        assignedProfessionalId: "pro-a"
      })
    ).toBe(false);

    expect(
      canPatientSelfChangeProfessional({
        creditsRemaining: 0,
        bookings: [baseBooking],
        assignedProfessionalId: "pro-a"
      })
    ).toBe(false);

    expect(
      canPatientSelfChangeProfessional({
        creditsRemaining: 0,
        bookings: [],
        assignedProfessionalId: null
      })
    ).toBe(false);
  });
});
