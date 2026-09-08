import { describe, expect, it } from "vitest";
import { env } from "../../config/env.js";
import {
  OnboardingDraftError,
  assertWithinSizeLimit,
  isExpired,
  isOnboardingDraftKind
} from "./onboardingDrafts.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("onboarding drafts", () => {
  describe("isExpired", () => {
    const now = Date.UTC(2026, 0, 20);

    it("mantiene vivo un borrador del día anterior", () => {
      expect(isExpired(new Date(now - DAY_MS), now)).toBe(false);
    });

    it("mantiene vivo un borrador justo antes de cumplir el TTL", () => {
      const almost = new Date(now - env.ONBOARDING_DRAFT_TTL_DAYS * DAY_MS + 60_000);
      expect(isExpired(almost, now)).toBe(false);
    });

    it("descarta un borrador pasado el TTL", () => {
      const stale = new Date(now - (env.ONBOARDING_DRAFT_TTL_DAYS + 1) * DAY_MS);
      expect(isExpired(stale, now)).toBe(true);
    });

    it("el TTL configurado es de 15 días", () => {
      expect(env.ONBOARDING_DRAFT_TTL_DAYS).toBe(15);
    });
  });

  describe("assertWithinSizeLimit", () => {
    it("acepta un borrador de formulario normal", () => {
      expect(() =>
        assertWithinSizeLimit({ answers: { mainReason: "Ansiedad", therapyGoal: "Dormir mejor" } })
      ).not.toThrow();
    });

    it("rechaza un borrador que excede el tope, con el detalle del tamaño", () => {
      const oversized = { video: "x".repeat(env.ONBOARDING_DRAFT_MAX_BYTES + 1) };
      try {
        assertWithinSizeLimit(oversized);
        expect.unreachable("debería haber lanzado DRAFT_TOO_LARGE");
      } catch (error) {
        expect(error).toBeInstanceOf(OnboardingDraftError);
        expect((error as OnboardingDraftError).code).toBe("DRAFT_TOO_LARGE");
        expect((error as OnboardingDraftError).details?.maxBytes).toBe(env.ONBOARDING_DRAFT_MAX_BYTES);
      }
    });
  });

  describe("isOnboardingDraftKind", () => {
    it("acepta los tipos conocidos", () => {
      expect(isOnboardingDraftKind("patient_intake")).toBe(true);
      expect(isOnboardingDraftKind("professional_onboarding")).toBe(true);
    });

    it("rechaza cualquier otro valor, para no usar la tabla como storage libre", () => {
      expect(isOnboardingDraftKind("anything_else")).toBe(false);
      expect(isOnboardingDraftKind("")).toBe(false);
    });
  });
});
