import { describe, expect, it } from "vitest";
import {
  resolveBindingProfessionalId,
  resolveHomeBookingProfessionalId
} from "./patientPricingProfessional";

describe("resolveHomeBookingProfessionalId", () => {
  it("only uses the assigned bond when present", () => {
    expect(
      resolveHomeBookingProfessionalId({
        assignedProfessionalId: "giuliano",
        nextBookingProfessionalId: "siro",
        selectedProfessionalId: "siro",
        requestedProfessionalId: "siro"
      })
    ).toBe("giuliano");
  });

  it("does not fall back to next booking or requested without a bond", () => {
    expect(
      resolveHomeBookingProfessionalId({
        assignedProfessionalId: null,
        nextBookingProfessionalId: "giuliano",
        selectedProfessionalId: null,
        requestedProfessionalId: "siro"
      })
    ).toBeNull();
  });

  it("uses selected only as pre-bond candidate", () => {
    expect(
      resolveHomeBookingProfessionalId({
        assignedProfessionalId: "",
        selectedProfessionalId: "siro"
      })
    ).toBe("siro");
  });
});

describe("resolveBindingProfessionalId", () => {
  it("keeps assigned over selected", () => {
    expect(
      resolveBindingProfessionalId({
        assignedProfessionalId: "giuliano",
        selectedProfessionalId: "siro"
      })
    ).toBe("giuliano");
  });
});
