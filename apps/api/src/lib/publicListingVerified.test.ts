import { describe, expect, it } from "vitest";
import { isPublicListingVerified, stripeVerifiedForRegistrationApproval } from "./publicListingVerified.js";

describe("publicListingVerified", () => {
  it("aprobado muestra Verificado", () => {
    expect(isPublicListingVerified({ registrationApproval: "APPROVED" })).toBe(true);
    expect(stripeVerifiedForRegistrationApproval("APPROVED")).toBe(true);
  });

  it("pendiente o rechazado no", () => {
    expect(isPublicListingVerified({ registrationApproval: "PENDING" })).toBe(false);
    expect(isPublicListingVerified({ registrationApproval: "REJECTED" })).toBe(false);
  });
});
