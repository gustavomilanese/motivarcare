import { describe, expect, it } from "vitest";
import { getPortalNavLinks, PORTAL_NAV_ITEMS } from "../config/portalNav";
import { resolvePortalPageTitle } from "./portalPageTitles";
import { buildProfessionalAuthUser, isRegistrationPortalBlocked } from "./buildProfessionalAuthUser";
import { professionalPortalGreetingDisplayName } from "./portalGreetingDisplayName";

const professionalPayload = {
  id: "user_1",
  fullName: "Ana Pérez",
  firstName: "Ana",
  lastName: "Pérez",
  email: "ana@example.com",
  emailVerified: true,
  role: "PROFESSIONAL" as const,
  professionalProfileId: "pro_1",
  avatarUrl: null,
  registrationApproval: "APPROVED" as const
};

describe("portal navigation", () => {
  it("exposes the five primary sections", () => {
    expect(PORTAL_NAV_ITEMS.map((item) => item.to)).toEqual([
      "/",
      "/horarios",
      "/pacientes",
      "/chat",
      "/ingresos"
    ]);
    expect(getPortalNavLinks("es").map((item) => item.label)).toEqual([
      "Dashboard",
      "Horarios",
      "Pacientes",
      "Chat",
      "Ingresos"
    ]);
  });

  it("resolves titles and hides nested patient ficha", () => {
    expect(resolvePortalPageTitle("/", "es")).toBe("Dashboard");
    expect(resolvePortalPageTitle("/ingresos", "en")).toBe("Earnings");
    expect(resolvePortalPageTitle("/pacientes", "es")).toBe("Pacientes");
    expect(resolvePortalPageTitle("/pacientes/abc", "es")).toBe("");
    expect(resolvePortalPageTitle("/unknown", "es")).toBe("");
  });
});

describe("buildProfessionalAuthUser", () => {
  it("accepts a professional with a profile id", () => {
    expect(buildProfessionalAuthUser(professionalPayload)).toMatchObject({
      role: "PROFESSIONAL",
      professionalProfileId: "pro_1",
      fullName: "Ana Pérez"
    });
  });

  it("rejects patient, admin, or missing profile", () => {
    expect(buildProfessionalAuthUser({ ...professionalPayload, role: "PATIENT" })).toBeNull();
    expect(buildProfessionalAuthUser({ ...professionalPayload, role: "ADMIN" })).toBeNull();
    expect(buildProfessionalAuthUser({ ...professionalPayload, professionalProfileId: null })).toBeNull();
  });

  it("blocks pending and rejected registration from the portal", () => {
    expect(isRegistrationPortalBlocked({ registrationApproval: "PENDING" })).toBe(true);
    expect(isRegistrationPortalBlocked({ registrationApproval: "REJECTED" })).toBe(true);
    expect(isRegistrationPortalBlocked({ registrationApproval: "APPROVED" })).toBe(false);
    expect(isRegistrationPortalBlocked(null)).toBe(false);
  });
});

describe("professionalPortalGreetingDisplayName", () => {
  it("prefers structured first/last over fullName", () => {
    expect(
      professionalPortalGreetingDisplayName({
        email: "ana@example.com",
        fullName: "Cuenta test",
        firstName: "Ana",
        lastName: "Pérez"
      })
    ).toBe("Ana Pérez");
  });

  it("hides technical email-local placeholders", () => {
    expect(
      professionalPortalGreetingDisplayName({
        email: "motivarcare.test.pro@example.com",
        fullName: "motivarcare.test.pro"
      })
    ).toBe("");
  });
});
