import { describe, expect, it } from "vitest";
import { calmGivenName, sessionLengthMinutes, sessionTiming } from "./calmHomeFormat";

describe("sessionTiming", () => {
  const timeZone = "America/Argentina/Buenos_Aires";

  it("marks a session that already started as live", () => {
    const now = new Date("2026-11-04T21:05:00.000Z");
    expect(
      sessionTiming("2026-11-04T21:00:00.000Z", "2026-11-04T21:50:00.000Z", now, timeZone).kind
    ).toBe("live");
  });

  it("counts minutes until a session that starts soon", () => {
    const now = new Date("2026-11-04T20:52:00.000Z");
    expect(sessionTiming("2026-11-04T21:00:00.000Z", "2026-11-04T21:50:00.000Z", now, timeZone)).toEqual({
      kind: "soon",
      minutes: 8
    });
  });

  it("keeps a later same-day session as today", () => {
    const now = new Date("2026-11-04T13:00:00.000Z");
    expect(sessionTiming("2026-11-04T21:00:00.000Z", "2026-11-04T21:50:00.000Z", now, timeZone).kind).toBe("today");
  });

  it("skips the honorific and uses the given name", () => {
    expect(calmGivenName({ firstName: "Dr.", lastName: "Emma Collins", fullName: "Dr. Emma Collins" })).toBe("Emma");
    expect(calmGivenName({ fullName: "Lic. Valeria Quiroga" })).toBe("Valeria");
  });

  it("reads the length of the call", () => {
    expect(sessionLengthMinutes("2026-11-04T21:00:00.000Z", "2026-11-04T21:50:00.000Z")).toBe(50);
  });
});
