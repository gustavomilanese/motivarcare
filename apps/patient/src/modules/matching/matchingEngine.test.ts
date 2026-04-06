import { describe, expect, it } from "vitest";
import { professionalsCatalog } from "../app/data/professionalsCatalog";
import { extractPatientTopics, rankProfessionalsForPatient } from "./matchingEngine";
import type { MatchCardProfessional } from "./types";

const candidates: MatchCardProfessional[] = professionalsCatalog.map((professional) => ({
  id: professional.id,
  fullName: professional.fullName,
  title: professional.title,
  specialization: professional.specialties[0] ?? null,
  focusPrimary: professional.specialties[0] ?? null,
  bio: professional.bio,
  therapeuticApproach: professional.approach,
  languages: professional.languages,
  yearsExperience: professional.yearsExperience,
  sessionPriceUsd: professional.sessionPriceUsd ?? null,
  photoUrl: null,
  birthCountry: null,
  stripeVerified: true,
  ratingAverage: professional.rating,
  reviewsCount: professional.reviewsCount ?? 0,
  sessionDurationMinutes: 50,
  activePatientsCount: professional.activePatients,
  completedSessionsCount: 0,
  sessionsCount: 0,
  compatibilityBase: professional.compatibility,
  slots: professional.slots
}));

describe("rankProfessionalsForPatient", () => {
  it("prioriza profesionales con especialidad alineada al motivo principal", () => {
    const ranked = rankProfessionalsForPatient({
      professionals: candidates,
      intakeAnswers: {
        mainReason: "Ansiedad",
        therapyGoal: "quiero bajar ataques de panico y estres laboral",
        preferredApproach: "TCC",
        language: "Espanol",
        availability: "Manana"
      },
      language: "es"
    });

    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].professional.id).toBe("pro-1");
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
  });

  it("favorece match de vinculos para consultas de pareja", () => {
    const ranked = rankProfessionalsForPatient({
      professionals: candidates,
      intakeAnswers: {
        mainReason: "Vinculos y pareja",
        therapyGoal: "quiero mejorar mi relacion y comunicacion",
        preferredApproach: "Psicodinamico",
        language: "Bilingue",
        availability: "Tarde"
      },
      language: "es"
    });

    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].professional.id).toBe("pro-2");
  });

  it("interpreta varios motivos de consulta (multiselección)", () => {
    const topics = extractPatientTopics({
      mainReason: "Ansiedad\nDepresión",
      therapyGoal: "",
      emotionalState: ""
    });
    expect(topics).toEqual(expect.arrayContaining(["anxiety", "depression"]));
  });
});
