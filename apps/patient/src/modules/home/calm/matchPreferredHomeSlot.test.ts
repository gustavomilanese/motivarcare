import { describe, expect, it } from "vitest";
import { matchPreferredHomeSlot } from "./matchPreferredHomeSlot";

describe("matchPreferredHomeSlot", () => {
  const slots = [
    { id: "a", startsAt: "2026-11-13T05:00:00.000Z", endsAt: "2026-11-13T05:50:00.000Z" },
    { id: "b", startsAt: "2026-11-13T06:30:00.000Z", endsAt: "2026-11-13T07:20:00.000Z" }
  ];

  it("matches exact ISO", () => {
    expect(matchPreferredHomeSlot(slots, "2026-11-13T06:30:00.000Z")?.id).toBe("b");
  });

  it("matches within the same minute", () => {
    expect(matchPreferredHomeSlot(slots, "2026-11-13T06:30:30.000Z")?.id).toBe("b");
  });

  it("returns undefined when missing", () => {
    expect(matchPreferredHomeSlot(slots, "2026-11-14T06:30:00.000Z")).toBeUndefined();
    expect(matchPreferredHomeSlot(slots, null)).toBeUndefined();
  });
});
