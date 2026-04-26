import { describe, expect, it } from "vitest";
import {
  __internals,
  getEmergencyResources,
  renderEmergencyResourcesText
} from "./emergencyResources.js";

describe("getEmergencyResources", () => {
  it("devuelve null cuando el código es vacío o nulo", () => {
    expect(getEmergencyResources(null)).toBeNull();
    expect(getEmergencyResources(undefined)).toBeNull();
    expect(getEmergencyResources("")).toBeNull();
  });

  it("acepta códigos en minúscula también", () => {
    expect(getEmergencyResources("ar")?.countryCode).toBe("AR");
  });

  it("devuelve null para países desconocidos", () => {
    expect(getEmergencyResources("ZZ")).toBeNull();
  });

  it.each(Object.keys(__internals.RESOURCES_BY_COUNTRY))(
    "%s tiene al menos un recurso configurado",
    (code) => {
      const resources = getEmergencyResources(code);
      expect(resources).not.toBeNull();
      expect(resources!.resources.length).toBeGreaterThan(0);
      for (const r of resources!.resources) {
        expect(r.label.length).toBeGreaterThan(3);
        expect(r.contact.length).toBeGreaterThan(2);
      }
    }
  );
});

describe("renderEmergencyResourcesText", () => {
  it("genera un bloque de texto plano con todos los recursos", () => {
    const resources = getEmergencyResources("AR");
    expect(resources).not.toBeNull();
    const text = renderEmergencyResourcesText(resources!);
    expect(text).toContain("Argentina");
    for (const r of resources!.resources) {
      expect(text).toContain(r.label);
      expect(text).toContain(r.contact);
    }
    expect(text).not.toContain("**");
    expect(text).not.toContain("##");
  });
});
