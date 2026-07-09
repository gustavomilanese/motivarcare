import { describe, expect, it } from "vitest";
import { pickStandardSessionBundles } from "./packageBundleTemplates.js";

describe("pickStandardSessionBundles", () => {
  it("returns one package per tier 4, 8 and 12", () => {
    const items = [
      { id: "a", credits: 4 },
      { id: "b", credits: 4 },
      { id: "c", credits: 8 },
      { id: "d", credits: 12 }
    ];

    expect(pickStandardSessionBundles(items)).toEqual([
      { id: "a", credits: 4 },
      { id: "c", credits: 8 },
      { id: "d", credits: 12 }
    ]);
  });

  it("prefers visibility order for each tier", () => {
    const all = [
      { id: "4-default", credits: 4 },
      { id: "4-alt", credits: 4 },
      { id: "8-default", credits: 8 }
    ];

    expect(
      pickStandardSessionBundles(all, {
        preferredFirst: [{ id: "4-alt", credits: 4 }, { id: "8-default", credits: 8 }]
      })
    ).toEqual([
      { id: "4-alt", credits: 4 },
      { id: "8-default", credits: 8 }
    ]);
  });

  it("ignores single-session catalog rows", () => {
    expect(
      pickStandardSessionBundles([
        { id: "1", credits: 1 },
        { id: "4", credits: 4 },
        { id: "8", credits: 8 }
      ])
    ).toEqual([
      { id: "4", credits: 4 },
      { id: "8", credits: 8 }
    ]);
  });
});
