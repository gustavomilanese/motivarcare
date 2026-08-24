import { describe, expect, it } from "vitest";
import { adminSessionPayoutStatusCopy } from "./adminSessionPayoutStatus";

describe("adminSessionPayoutStatusCopy", () => {
  it("labels submitted unpaid sessions as ready to pay", () => {
    expect(adminSessionPayoutStatusCopy("pending", "es")).toEqual({
      tone: "pending",
      label: "Por pagar"
    });
  });

  it("does not reuse the professional En cobro label for Admin", () => {
    expect(adminSessionPayoutStatusCopy("pending", "es").label).not.toMatch(/en cobro/i);
  });

  it("explains sessions the professional has not submitted yet", () => {
    expect(adminSessionPayoutStatusCopy("not_submitted", "es").label).toBe("Falta envío del profesional");
  });
});
