import { describe, expect, it } from "vitest";
import {
  isBlockedPublicRegisterRole,
  isPublicRegisterRole,
  requestedRegisterRole
} from "./publicRegisterPolicy.js";

describe("publicRegisterPolicy", () => {
  it("lee role en mayúsculas o minúsculas", () => {
    expect(requestedRegisterRole({ role: "ADMIN" })).toBe("ADMIN");
    expect(requestedRegisterRole({ role: "admin" })).toBe("ADMIN");
    expect(requestedRegisterRole({ role: "  Professional " })).toBe("PROFESSIONAL");
  });

  it("bloquea ADMIN y no deja pasar otros privilegios como registro público", () => {
    expect(isBlockedPublicRegisterRole("ADMIN")).toBe(true);
    expect(isBlockedPublicRegisterRole("PATIENT")).toBe(false);
    expect(isBlockedPublicRegisterRole("PROFESSIONAL")).toBe(false);
    expect(isPublicRegisterRole("PATIENT")).toBe(true);
    expect(isPublicRegisterRole("PROFESSIONAL")).toBe(true);
    expect(isPublicRegisterRole("ADMIN")).toBe(false);
  });

  it("ignora body sin role usable", () => {
    expect(requestedRegisterRole(null)).toBeNull();
    expect(requestedRegisterRole({})).toBeNull();
    expect(requestedRegisterRole({ role: 1 })).toBeNull();
  });
});
