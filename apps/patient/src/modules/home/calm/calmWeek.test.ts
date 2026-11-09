import { describe, expect, it } from "vitest";
import { calendarWeek, weekSessions } from "./calmWeek";

describe("calendarWeek", () => {
  it("arranca el lunes cuando hoy es domingo", () => {
    const sunday = new Date("2026-11-08T12:00:00Z");
    const days = calendarWeek(sunday, "UTC");
    expect(new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(days[0])).toBe("Mon");
    expect(new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "UTC" }).format(days[0])).toBe("2");
    expect(new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(days[6])).toBe("Sun");
  });

  it("deja las sesiones confirmadas en el día que les toca", () => {
    const monday = new Date("2026-11-09T08:00:00Z");
    const days = calendarWeek(monday, "UTC");
    const grouped = weekSessions(
      [
        { id: "hoy", startsAt: "2026-11-09T14:00:00Z", status: "confirmed", professionalId: "a" },
        { id: "cancelada", startsAt: "2026-11-10T14:00:00Z", status: "cancelled", professionalId: "a" },
        { id: "otra-semana", startsAt: "2026-11-16T14:00:00Z", status: "confirmed", professionalId: "b" }
      ],
      days,
      "UTC"
    );
    expect(grouped[0].map((item) => item.id)).toEqual(["hoy"]);
    expect(grouped.flat().map((item) => item.id)).toEqual(["hoy"]);
  });
});
