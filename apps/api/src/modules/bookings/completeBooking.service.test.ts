import { describe, expect, it } from "vitest";
import {
  evaluateCancelBookingStatus,
  evaluateCompleteBooking,
  evaluateSubmitForPayout,
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
        financeRecord: { payoutLineId: null, submittedForPayoutAt: null }
      },
      professionalId
    );
    expect(result).toEqual({ ok: true });
  });

  it("blocks sessions already sent for payout", () => {
    const result = evaluateUncompleteBooking(
      {
        professionalId,
        status: "COMPLETED",
        financeRecord: { payoutLineId: null, submittedForPayoutAt: "2026-08-16T12:00:00.000Z" }
      },
      professionalId
    );
    expect(result).toMatchObject({ ok: false, httpStatus: 409 });
  });
});

describe("evaluateSubmitForPayout", () => {
  it("allows a completed session that was not sent yet", () => {
    expect(
      evaluateSubmitForPayout(
        {
          professionalId,
          status: "COMPLETED",
          financeRecord: { payoutLineId: null, submittedForPayoutAt: null }
        },
        professionalId
      )
    ).toEqual({ ok: true });
  });

  it("rejects a session already sent for payout", () => {
    expect(
      evaluateSubmitForPayout(
        {
          professionalId,
          status: "COMPLETED",
          financeRecord: { payoutLineId: null, submittedForPayoutAt: "2026-08-16T12:00:00.000Z" }
        },
        professionalId
      )
    ).toMatchObject({ ok: false, httpStatus: 409 });
  });

  it("rejects a reserved session", () => {
    expect(
      evaluateSubmitForPayout(
        {
          professionalId,
          status: "CONFIRMED",
          financeRecord: { payoutLineId: null, submittedForPayoutAt: null }
        },
        professionalId
      )
    ).toMatchObject({ ok: false, httpStatus: 409 });
  });
});

describe("uniqueBookingIds", () => {
  it("dedupes, trims and caps the batch", () => {
    expect(uniqueBookingIds([" a ", "a", "b", ""], 2)).toEqual(["a", "b"]);
  });
});

describe("evaluateCancelBookingStatus", () => {
  it("allows reserved sessions", () => {
    expect(evaluateCancelBookingStatus("CONFIRMED")).toEqual({ ok: true });
    expect(evaluateCancelBookingStatus("REQUESTED")).toEqual({ ok: true });
  });

  it("rejects already cancelled bookings", () => {
    expect(evaluateCancelBookingStatus("CANCELLED")).toMatchObject({
      ok: false,
      httpStatus: 409,
      error: "Booking already cancelled"
    });
  });

  it("rejects completed and no-show sessions", () => {
    expect(evaluateCancelBookingStatus("COMPLETED")).toMatchObject({
      ok: false,
      httpStatus: 409,
      error: "Cannot cancel a completed session"
    });
    expect(evaluateCancelBookingStatus("NO_SHOW")).toMatchObject({
      ok: false,
      httpStatus: 409,
      error: "Cannot cancel a completed session"
    });
  });
});
