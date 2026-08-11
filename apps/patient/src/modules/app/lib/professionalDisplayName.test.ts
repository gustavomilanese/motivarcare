import { describe, expect, it } from "vitest";
import {
  professionalAccessibleName,
  professionalDisplayNameLines,
  professionalFirstName
} from "./professionalDisplayName";

describe("professionalFirstName", () => {
  it("prefers firstName over fullName", () => {
    expect(
      professionalFirstName({
        firstName: "Roberto",
        lastName: "French",
        fullName: "Roberto French"
      })
    ).toBe("Roberto");
  });

  it("falls back to the first token of fullName", () => {
    expect(
      professionalFirstName({
        fullName: "Roberto French"
      })
    ).toBe("Roberto");
  });

  it("returns empty string when nothing is available", () => {
    expect(professionalFirstName({ fullName: "   " })).toBe("");
  });
});

describe("professionalDisplayNameLines", () => {
  it("splits first and last name into two lines", () => {
    expect(
      professionalDisplayNameLines({
        firstName: "Roberto",
        lastName: "French",
        fullName: "Roberto French"
      })
    ).toEqual({ line1: "Roberto", line2: "French" });
  });

  it("uses fullName when first/last are missing", () => {
    expect(
      professionalDisplayNameLines({
        fullName: "Roberto French"
      })
    ).toEqual({ line1: "Roberto French", line2: null });
  });
});

describe("professionalAccessibleName", () => {
  it("joins first and last when present", () => {
    expect(
      professionalAccessibleName({
        firstName: "Roberto",
        lastName: "French",
        fullName: "Other"
      })
    ).toBe("Roberto French");
  });

  it("falls back to fullName", () => {
    expect(
      professionalAccessibleName({
        fullName: "Roberto French"
      })
    ).toBe("Roberto French");
  });
});
