import { describe, expect, it } from "vitest";
import { buildWeekMoodPoints } from "./calmWeekMood";

describe("buildWeekMoodPoints", () => {
  it("plots the latest published mood for today and leaves older days empty outside the window", () => {
    const now = new Date("2026-11-09T12:00:00Z");
    const points = buildWeekMoodPoints(
      [
        { createdAt: "2026-11-09T10:00:00Z", status: "published", mood: "good" },
        { createdAt: "2026-11-08T10:00:00Z", status: "published", mood: "regular" },
        { createdAt: "2026-06-28T10:00:00Z", status: "published", mood: "bad" },
        { createdAt: "2026-11-09T08:00:00Z", status: "draft", mood: "very_good" }
      ],
      now,
      "UTC",
      "es"
    );

    expect(points).toHaveLength(7);
    expect(points[5]?.mood).toBe("regular");
    expect(points[6]?.mood).toBe("good");
    expect(points.filter((point) => point.mood != null)).toHaveLength(2);
  });
});
