import { describe, expect, it } from "vitest";
import {
  isSettleDashboardSession,
  isUpcomingDashboardSession,
  pendingExecutionBookingsWhere,
  upcomingReservationsWhere
} from "./professionalDashboardSessionLists.js";

const now = new Date("2026-08-16T15:00:00.000Z");
const monthStart = new Date("2026-08-01T00:00:00.000Z");
const monthEnd = new Date("2026-08-31T23:59:59.999Z");
const professionalId = "pro_1";

describe("dashboard dual lists", () => {
  it("keeps future reserved sessions only in upcoming", () => {
    const startsAt = new Date("2026-08-16T16:00:00.000Z");
    expect(isUpcomingDashboardSession("CONFIRMED", startsAt, now)).toBe(true);
    expect(isSettleDashboardSession("CONFIRMED", startsAt, now, monthStart, monthEnd)).toBe(false);
  });

  it("keeps started reserved sessions only in settle", () => {
    const startsAt = new Date("2026-08-16T14:00:00.000Z");
    expect(isUpcomingDashboardSession("REQUESTED", startsAt, now)).toBe(false);
    expect(isSettleDashboardSession("REQUESTED", startsAt, now, monthStart, monthEnd)).toBe(true);
  });

  it("does not overlap at the exact now boundary", () => {
    expect(isUpcomingDashboardSession("CONFIRMED", now, now)).toBe(true);
    expect(isSettleDashboardSession("CONFIRMED", now, now, monthStart, monthEnd)).toBe(false);
  });

  it("includes completed sessions in settle even after they started", () => {
    const startsAt = new Date("2026-08-10T12:00:00.000Z");
    expect(isUpcomingDashboardSession("COMPLETED", startsAt, now)).toBe(false);
    expect(isSettleDashboardSession("COMPLETED", startsAt, now, monthStart, monthEnd)).toBe(true);
  });
});

describe("dashboard prisma where", () => {
  it("asks upcoming for reserved sessions from now onward", () => {
    expect(upcomingReservationsWhere(professionalId, now)).toEqual({
      professionalId,
      status: { in: ["REQUESTED", "CONFIRMED"] },
      startsAt: { gte: now }
    });
  });

  it("asks settle reserved sessions with startsAt strictly before now", () => {
    const where = pendingExecutionBookingsWhere(professionalId, now, monthStart, monthEnd);
    expect(where.startsAt).toEqual({ gte: monthStart, lte: monthEnd });
    expect(where.OR).toEqual([
      {
        status: { in: ["REQUESTED", "CONFIRMED"] },
        startsAt: { lt: now }
      },
      {
        status: "COMPLETED"
      }
    ]);
  });
});
