import { describe, expect, it } from "vitest";
import { resolveSessionCreditDots } from "./resolveSessionCreditDots";

describe("resolveSessionCreditDots", () => {
  it("pack 4, 1 reserved, 3 free → salvia + 3 libres", () => {
    expect(resolveSessionCreditDots({ available: 3, packageSize: 4, reserved: 1 })).toEqual([
      "reserved",
      "free",
      "free",
      "free"
    ]);
  });

  it("pack 4, 1 taken, 1 reserved, 2 free → usada + salvia + 2 libres", () => {
    expect(resolveSessionCreditDots({ available: 2, packageSize: 4, reserved: 1 })).toEqual([
      "taken",
      "reserved",
      "free",
      "free"
    ]);
  });

  it("sin reservas: gastados son tomadas", () => {
    expect(resolveSessionCreditDots({ available: 2, packageSize: 4, reserved: 0 })).toEqual([
      "taken",
      "taken",
      "free",
      "free"
    ]);
  });

  it("reserva no puede superar lo gastado", () => {
    expect(resolveSessionCreditDots({ available: 3, packageSize: 4, reserved: 5 })).toEqual([
      "reserved",
      "free",
      "free",
      "free"
    ]);
  });
});
