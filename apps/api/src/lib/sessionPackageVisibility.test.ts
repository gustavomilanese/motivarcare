import { describe, expect, it } from "vitest";
import { parseSessionPackagesVisibility } from "./sessionPackageVisibility.js";

describe("parseSessionPackagesVisibility", () => {
  it("siempre devuelve patientByMarket completo", () => {
    const a = parseSessionPackagesVisibility(null);
    expect(a.patientByMarket).toEqual({ AR: [], US: [], BR: [], ES: [] });
    expect(a.featuredPatientByMarket).toEqual({ AR: null, US: null, BR: null, ES: null });

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
    expect(v.patientByMarket).toEqual({ AR: ["x"], US: [], BR: [], ES: [] });
  });

  it("normaliza slots de landing adicionales", () => {
    const v = parseSessionPackagesVisibility({
      patient: [],
      landing: ["a"],
      landingPatientV2: ["b", "c"],
      landingProfessional: [],
      featuredLanding: "a",
      featuredLandingPatientV2: "b",
      featuredLandingProfessional: null
    });
    expect(v.landing).toEqual(["a"]);
    expect(v.landingPatientV2).toEqual(["b", "c"]);
    expect(v.landingProfessional).toEqual([]);
    expect(v.featuredLanding).toBe("a");
    expect(v.featuredLandingPatientV2).toBe("b");
    expect(v.featuredLandingProfessional).toBeNull();
  });
});
