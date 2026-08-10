import { describe, expect, it, vi } from "vitest";
import { refundBookingCreditsToConsumedPurchase } from "./refundBookingCredits.js";

describe("refundBookingCreditsToConsumedPurchase", () => {
  it("refunds only to the consumed purchase id", async () => {
    const update = vi.fn().mockResolvedValue({});
    const create = vi.fn().mockResolvedValue({});
    const findFirst = vi.fn().mockResolvedValue({ id: "purchase-a" });
    const tx = {
      patientPackagePurchase: { findFirst, update },
      creditLedger: { create }
    } as never;

    const result = await refundBookingCreditsToConsumedPurchase(tx, {
      patientId: "patient-1",
      bookingId: "booking-1",
      consumedPurchaseId: "purchase-a",
      consumedCredits: 1,
      note: "test refund"
    });

    expect(result).toEqual({ refundedCredits: 1, purchaseId: "purchase-a" });
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: "purchase-a", patientId: "patient-1" },
      select: { id: true }
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "purchase-a" },
      data: { remainingCredits: { increment: 1 } }
    });
  });

  it("does not fall back to another package when purchase id is missing", async () => {
    const update = vi.fn();
    const create = vi.fn();
    const findFirst = vi.fn();
    const tx = {
      patientPackagePurchase: { findFirst, update },
      creditLedger: { create }
    } as never;

    const result = await refundBookingCreditsToConsumedPurchase(tx, {
      patientId: "patient-1",
      bookingId: "booking-1",
      consumedPurchaseId: null,
      consumedCredits: 1,
      note: "test refund"
    });

    expect(result).toEqual({ refundedCredits: 0, purchaseId: null });
    expect(findFirst).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
