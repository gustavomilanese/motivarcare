import { describe, expect, it } from "vitest";
import {
  evaluateCompleteBooking,
  evaluateUncompleteBooking,
  uniqueBookingIds
} from "./completeBooking.rules.js";

const professionalId = "pro_1";
const now = new Date("2026-08-15T15:00:00.000Z");

describe("evaluateCompleteBooking", () => {
  it("rejects missing bookings", () => {
    expect(evaluateCompleteBooking(null, professionalId, now)).toEqual({
      ok: false,
      httpStatus: 404,
      error: "Booking not found"
    });
  });

  it("rejects another professional's booking", () => {
    const result = evaluateCompleteBooking(
      {
        professionalId: "pro_other",
        status: "CONFIRMED",
        startsAt: new Date("2026-08-14T12:00:00.000Z")
      },
      professionalId,
      now
    );
    expect(result).toMatchObject({ ok: false, httpStatus: 403 });
  });

  it("rejects future sessions", () => {
    const result = evaluateCompleteBooking(
      {
        professionalId,
        status: "CONFIRMED",
        startsAt: new Date("2026-08-16T12:00:00.000Z")
      },
      professionalId,
      now
    );
    expect(result).toMatchObject({ ok: false, httpStatus: 409, error: "Booking has not started yet" });
  });

  it("allows a started confirmed session", () => {
    const result = evaluateCompleteBooking(
      {
        professionalId,
        status: "CONFIRMED",
        startsAt: new Date("2026-08-15T14:00:00.000Z")
      },
      professionalId,
      now
    );
    expect(result).toEqual({ ok: true });
  });

  it("allows a started requested session", () => {
    const result = evaluateCompleteBooking(
      {
        professionalId,
        status: "REQUESTED",
        startsAt: new Date("2026-08-10T10:00:00.000Z")
      },
      professionalId,
      now
    );
    expect(result).toEqual({ ok: true });
  });
});

describe("evaluateUncompleteBooking", () => {
  it("blocks sessions already in a payout", () => {
    const result = evaluateUncompleteBooking(
      {
        professionalId,
        status: "COMPLETED",
        financeRecord: { payoutLineId: "line_1" }
      },
      professionalId
    );
    expect(result).toMatchObject({ ok: false, httpStatus: 409 });
  });

  it("allows reversing an executed session still pending payout", () => {
    const result = evaluateUncompleteBooking(
      {
        professionalId,
        status: "COMPLETED",
        financeRecord: { payoutLineId: null }
      },
      professionalId
    );
    expect(result).toEqual({ ok: true });
  });
});

describe("uniqueBookingIds", () => {
  it("dedupes, trims and caps the batch", () => {
    expect(uniqueBookingIds([" a ", "a", "b", ""], 2)).toEqual(["a", "b"]);
  });
});
