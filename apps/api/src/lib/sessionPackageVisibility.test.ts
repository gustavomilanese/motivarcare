import { describe, expect, it } from "vitest";
import { parseSessionPackagesVisibility } from "./sessionPackageVisibility.js";

describe("parseSessionPackagesVisibility", () => {
  it("siempre devuelve patientByMarket completo", () => {
    const a = parseSessionPackagesVisibility(null);
    expect(a.patientByMarket).toEqual({ AR: [], US: [] });
    expect(a.featuredPatientByMarket).toEqual({ AR: null, US: null });

    const b = parseSessionPackagesVisibility({ patient: ["pkg1"], landing: [] });
    expect(b.patientByMarket.AR).toEqual(["pkg1"]);
    expect(b.patientByMarket.US).toEqual([]);
  });

  it("fusiona legacy patient con AR cuando falta patientByMarket", () => {
    const v = parseSessionPackagesVisibility({
      patient: ["x"],
      landing: [],
      featuredPatient: null
    });
    expect(v.patient).toEqual(["x"]);
    expect(v.patientByMarket).toEqual({ AR: ["x"], US: [] });
  });
});
