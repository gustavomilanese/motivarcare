import { describe, expect, it } from "vitest";
import { resolveSelfServePayoutStatus } from "./selfServePayoutStatus.js";

describe("resolveSelfServePayoutStatus", () => {
  it("ignora un active mandado por el profesional", () => {
    expect(
      resolveSelfServePayoutStatus({
        existingStatus: "draft",
        submittedPayoutDetails: true,
        payoutDetailsChanged: true
      })
    ).toBe("pending_review");
  });

  it("no deja bajar active si solo reenvía los mismos datos", () => {
    expect(
      resolveSelfServePayoutStatus({
        existingStatus: "active",
        submittedPayoutDetails: true,
        payoutDetailsChanged: false
      })
    ).toBe("active");
  });

  it("vuelve a revisión si cambia el CBU estando active", () => {
    expect(
      resolveSelfServePayoutStatus({
        existingStatus: "active",
        submittedPayoutDetails: true,
        payoutDetailsChanged: true
      })
    ).toBe("pending_review");
  });

  it("después de rejected, un nuevo envío queda en revisión", () => {
    expect(
      resolveSelfServePayoutStatus({
        existingStatus: "rejected",
        submittedPayoutDetails: true,
        payoutDetailsChanged: true
      })
    ).toBe("pending_review");
  });

  it("sin datos de cobro no cambia el estado", () => {
    expect(
      resolveSelfServePayoutStatus({
        existingStatus: "draft",
        submittedPayoutDetails: false,
        payoutDetailsChanged: false
      })
    ).toBe("draft");
  });
});
