import { describe, expect, it } from "vitest";
import {
  MIN_BOOKING_NOTICE_HOURS,
  filterSlotsByBookingNotice,
  isSlotBookableByNotice,
  resolveMinimumBookingNoticeHours
} from "./bookingNotice.js";

describe("bookingNotice", () => {
  it("nunca baja del mínimo de 24h", () => {
    expect(resolveMinimumBookingNoticeHours(undefined)).toBe(MIN_BOOKING_NOTICE_HOURS);
    expect(resolveMinimumBookingNoticeHours(8)).toBe(24);
    expect(resolveMinimumBookingNoticeHours(48)).toBe(48);
  });

  it("filtra turnos dentro de la antelación", () => {
    const now = Date.now();
    const slots = [
      { id: "soon", startsAt: new Date(now + 2 * 60 * 60 * 1000).toISOString() },
      { id: "ok", startsAt: new Date(now + 26 * 60 * 60 * 1000).toISOString() }
    ];
    expect(filterSlotsByBookingNotice(slots, 24, now).map((s) => s.id)).toEqual(["ok"]);
    expect(isSlotBookableByNotice(slots[0].startsAt, 24, now)).toBe(false);
    expect(isSlotBookableByNotice(slots[1].startsAt, 24, now)).toBe(true);
  });
});
