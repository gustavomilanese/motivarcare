import { describe, expect, it } from "vitest";
import { defaultPayChoice } from "./payChoice";

describe("defaultPayChoice", () => {
  it("elige el paquete destacado", () => {
    expect(
      defaultPayChoice(
        [
          { id: "one", credits: 1 },
          { id: "four", credits: 4 },
          { id: "eight", credits: 8 }
        ],
        "eight",
        true
      )
    ).toEqual({ kind: "plan", planId: "eight" });
  });

  it("si no hay paquetes, elige la sesión suelta", () => {
    expect(defaultPayChoice([{ id: "one", credits: 1 }], null, true)).toEqual({ kind: "individual" });
  });

  it("no inventa una opción cuando no hay precio", () => {
    expect(defaultPayChoice([], null, false)).toBeNull();
  });
});
