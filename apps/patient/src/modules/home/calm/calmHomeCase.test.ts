import { describe, expect, it } from "vitest";
import { calmHomeSurface, rankSuggestedProfessionals, resolveCalmHomeCase, upcomingProfessionalSlots } from "./calmHomeCase";

describe("resolveCalmHomeCase", () => {
  it("muestra la bienvenida cuando no hay profesional ni sesión", () => {
    expect(resolveCalmHomeCase({ hasProfessional: false, hasUpcomingBooking: false })).toBe("new");
  });

  it("pide la primera reserva cuando ya hay profesional y no hay sesión", () => {
    expect(resolveCalmHomeCase({ hasProfessional: true, hasUpcomingBooking: false })).toBe("assigned");
  });

  it("prioriza la sesión próxima aunque el profesional esté asignado", () => {
    expect(resolveCalmHomeCase({ hasProfessional: true, hasUpcomingBooking: true })).toBe("upcoming");
    expect(resolveCalmHomeCase({ hasProfessional: false, hasUpcomingBooking: true })).toBe("upcoming");
  });
});

describe("calmHomeSurface", () => {
  it("muestra la bienvenida hasta que piden elegir profesional", () => {
    expect(calmHomeSurface({ hasProfessional: false, pickOpen: false })).toBe("home");
    expect(calmHomeSurface({ hasProfessional: false, pickOpen: true })).toBe("pick");
  });

  it("con profesional asignado vuelve al inicio, aunque el listado haya quedado abierto", () => {
    expect(calmHomeSurface({ hasProfessional: true, pickOpen: true })).toBe("home");
  });
});

describe("rankSuggestedProfessionals", () => {
  const people = [
    { id: "b", fullName: "Bea", title: "", specialties: ["Duelo"], compatibility: 70, sessionPriceUsd: 40 },
    { id: "a", fullName: "Ana", title: "", specialties: ["Ansiedad"], compatibility: 90, sessionPriceUsd: 42 },
    { id: "c", fullName: "Ciro", title: "", specialties: ["Pareja"], compatibility: 90, sessionPriceUsd: 38 },
    { id: "d", fullName: "Dina", title: "", specialties: ["Estrés"], compatibility: 10 }
  ];

  it("ordena por compatibilidad y corta en tres", () => {
    expect(rankSuggestedProfessionals(people).map((person) => person.id)).toEqual(["a", "c", "b"]);
  });
});

describe("upcomingProfessionalSlots", () => {
  const now = new Date("2026-11-09T12:00:00.000Z");

  it("deja afuera los horarios pasados y se queda con los próximos", () => {
    const slots = upcomingProfessionalSlots(
      [
        { id: "past", startsAt: "2026-11-09T08:00:00.000Z" },
        { id: "later", startsAt: "2026-11-11T09:00:00.000Z" },
        { id: "soon", startsAt: "2026-11-10T13:00:00.000Z" }
      ],
      now,
      2
    );
    expect(slots.map((slot) => slot.id)).toEqual(["soon", "later"]);
  });
});
