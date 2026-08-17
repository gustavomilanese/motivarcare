import { describe, expect, it } from "vitest";
import { addBusinessDays, formatBusinessDayDeadline } from "./addBusinessDays";
import {
  buildProfessionalStatsQuery,
  buildSessionsMonthQuery,
  resolveRevenueDateRangeYmd,
  ymLocal,
  ymdLocal
} from "./professionalStatsRangeQuery";
import { rangesOverlap } from "./timeRanges";
import { getCalendarDayKey, getMonthCalendarDays, getStartOfWeek, getWeekCalendarDays } from "./weekCalendar";

describe("rangesOverlap", () => {
  it("detects interior overlap and ignores touching endpoints", () => {
    expect(
      rangesOverlap(
        "2026-08-16T10:00:00.000Z",
        "2026-08-16T11:00:00.000Z",
        "2026-08-16T10:30:00.000Z",
        "2026-08-16T11:30:00.000Z"
      )
    ).toBe(true);
    expect(
      rangesOverlap(
        "2026-08-16T10:00:00.000Z",
        "2026-08-16T11:00:00.000Z",
        "2026-08-16T11:00:00.000Z",
        "2026-08-16T12:00:00.000Z"
      )
    ).toBe(false);
  });
});

describe("weekCalendar", () => {
  it("starts weeks on Monday and returns 7 days", () => {
    const wednesday = new Date(2026, 7, 12, 15, 0, 0);
    const start = getStartOfWeek(wednesday);
    expect(start.getDay()).toBe(1);
    expect(getCalendarDayKey(start)).toBe("2026-08-10");
    const days = getWeekCalendarDays(wednesday);
    expect(days).toHaveLength(7);
    expect(getCalendarDayKey(days[0]!)).toBe("2026-08-10");
    expect(getCalendarDayKey(days[6]!)).toBe("2026-08-16");
  });

  it("builds every civil day of the month", () => {
    const days = getMonthCalendarDays(new Date(2026, 1, 10));
    expect(days).toHaveLength(28);
    expect(getCalendarDayKey(days[0]!)).toBe("2026-02-01");
    expect(getCalendarDayKey(days[27]!)).toBe("2026-02-28");
  });
});

describe("professionalStatsRangeQuery", () => {
  it("resolves a civil month to local YMD bounds", () => {
    expect(resolveRevenueDateRangeYmd("month", "2026-06-10", "2026-06", "2026")).toEqual({
      dateFrom: "2026-06-01",
      dateTo: "2026-06-30"
    });
  });

  it("uses statsAll for the all-time preset", () => {
    expect(buildProfessionalStatsQuery("all", "2026-06-10", "2026-06", "2026")).toContain("statsAll=1");
  });

  it("sends the professional's civil month for the settle tab", () => {
    const query = buildSessionsMonthQuery("2026-08");
    expect(query).toContain("sessionsMonth=2026-08");
    expect(query).toContain("sessionsFrom=");
    expect(query).toContain("sessionsTo=");
  });

  it("formats local date keys", () => {
    const d = new Date(2026, 7, 16);
    expect(ymdLocal(d)).toBe("2026-08-16");
    expect(ymLocal(d)).toBe("2026-08");
  });
});

describe("addBusinessDays", () => {
  it("skips Saturday and Sunday", () => {
    const friday = new Date("2026-08-14T12:00:00.000Z");
    const next = addBusinessDays(friday, 1);
    expect(next.getUTCDay()).toBe(1);
  });

  it("parses ISO deadlines", () => {
    const deadline = formatBusinessDayDeadline("2026-08-14T12:00:00.000Z", 2);
    expect(deadline.getUTCDay()).toBe(2);
  });
});
