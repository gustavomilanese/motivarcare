import { describe, expect, it } from "vitest";
import {
  buildPatchDraftFromMobileInputs,
  buildPatchDraftFromWebPayload,
  createDefaultOnboardingPatchDraft
} from "./defaults";

describe("onboarding defaults", () => {
  it("crea draft por defecto consistente", () => {
    const draft = createDefaultOnboardingPatchDraft();

    expect(draft.visible).toBe(false);
    expect(draft.stripeVerified).toBe(false);
    expect(draft.diplomas).toEqual([]);
  });

  it("mapea payload web a patch draft", () => {
    const draft = buildPatchDraftFromWebPayload({
      fullName: "Gustavo Milanese",
      email: "gus@example.com",
      password: "SecurePass123",
      professionalTitle: "Psicólogo",
      specialization: "",
      experienceBand: "6-10 anos",
      practiceBand: "1000-3000 horas",
      gender: "Hombre",
      birthCountry: "Uruguay",
      residencyCountry: "UY",
      focusAreas: ["Ansiedad"],
      therapyModalities: ["Terapia cognitivo-conductual (TCC)"],
      languages: ["Espanol", "Ingles"],
      graduationYear: null,
      yearsExperience: 8,
      bio: "Bio de prueba",
      shortDescription: "Descripcion corta",
      therapeuticApproach:
        "Terapia cognitivo-conductual (TCC)\n\nEnfoque integrador",
      sessionPriceArs: 40_000,
      sessionPriceUsd: 50,
      discount4: 10,
      discount8: 8,
      discount12: 12,
      photoUrl: "photo-url",
      videoUrl: "video-url",
      videoCoverUrl: "cover-url",
      stripeDocUrl: "stripe-doc",
      stripeVerified: true,
      stripeVerificationStarted: true,
      diplomas: [
        {
          institution: "Universidad X",
          degree: "Lic. Psicologia",
          startYear: 2014,
          graduationYear: 2018,
          documentUrl: "diploma-url"
        }
      ]
    });

    expect(draft.bio).toBe("Bio de prueba");
    expect(draft.focusAreas).toEqual(["Ansiedad"]);
    expect(draft.sessionPriceArs).toBe(40_000);
    expect(draft.sessionPriceUsd).toBe(50);
    expect(draft.stripeVerified).toBe(true);
    expect(draft.visible).toBe(false);
    expect(draft.graduationYear).toBeNull();
    expect(draft.specialization).toBeNull();
    expect(draft.residencyCountry).toBe("UY");
    expect(draft.diplomas).toHaveLength(1);
  });

  it("mapea mobile inputs a patch draft", () => {
    const draft = buildPatchDraftFromMobileInputs({
      aboutText: "Sobre mi",
      therapyDescriptionText: "Descripcion terapia",
      selectedSpecialization: "Psicologo",
      selectedExperience: "6-10 anos",
      selectedPracticeHours: "1000-3000 horas",
      workLanguages: ["Espanol"],
      summaryText: "Resumen",
      priceData: {
        sessionPriceArs: "",
        sessionPrice: "50",
        discount4: "10",
        discount8: "8",
        discount12: "12"
      },
      personalData: {
        graduationYear: "2018",
        gender: "Hombre",
        birthCountry: "Uruguay",
        residencyCountry: "UY"
      },
      educationData: {
        institution: "Universidad X",
        specialty: "Lic. Psicologia",
        startYear: "2014",
        graduationYear: "2018"
      },
      photoUrl: "data:image/png;base64,AAA"
    });

    expect(draft.therapeuticApproach).toBe("Descripcion terapia");
    expect(draft.graduationYear).toBe(2018);
    expect(draft.yearsExperience).toBe(
      Math.max(0, Math.min(80, new Date().getFullYear() - 2018))
    );
    expect(draft.discount8).toBe(8);
    expect(draft.residencyCountry).toBe("UY");
    expect(draft.photoUrl).toBe("data:image/png;base64,AAA");
    expect(draft.visible).toBe(false);
    expect(draft.stripeVerified).toBe(false);
    expect(draft.diplomas).toHaveLength(1);
  });

  it("deriva sessionPriceArs desde USD cuando se pasa cotización ARS por USD", () => {
    const draft = buildPatchDraftFromMobileInputs(
      {
        aboutText: "Sobre mi",
        therapyDescriptionText: "Descripcion terapia",
        selectedSpecialization: "Psicologo",
        selectedExperience: "6-10 anos",
        selectedPracticeHours: "1000-3000 horas",
        workLanguages: ["Espanol"],
        summaryText: "Resumen",
        priceData: {
          sessionPriceArs: "",
          sessionPrice: "50",
          discount4: "10",
          discount8: "8",
          discount12: "12"
        },
        personalData: {
          graduationYear: "2018",
          gender: "Hombre",
          birthCountry: "Uruguay",
          residencyCountry: "UY"
        },
        educationData: {
          institution: "Universidad X",
          specialty: "Lic. Psicologia",
          startYear: "2014",
          graduationYear: "2018"
        },
        photoUrl: null
      },
      { usdArsRate: 1400 }
    );

    expect(draft.sessionPriceUsd).toBe(50);
    expect(draft.sessionPriceArs).toBe(70_000);
  });

  it("mapea problemFocusSelections del cuestionario móvil a focusAreas", () => {
    const draft = buildPatchDraftFromMobileInputs({
      aboutText: "Sobre mi",
      therapyDescriptionText: "Descripcion terapia",
      selectedSpecialization: "Psicologo",
      selectedExperience: "6-10 anos",
      selectedPracticeHours: "1000-3000 horas",
      problemFocusSelections: ["Ansiedad", "Otro (objetivos de terapia): definir límites"],
      workLanguages: ["Espanol"],
      summaryText: "Resumen",
      priceData: { sessionPriceArs: "", sessionPrice: "50", discount4: "10", discount8: "8", discount12: "12" },
      personalData: { graduationYear: "2018", gender: "Hombre", birthCountry: "Uruguay", residencyCountry: "UY" },
      educationData: { institution: "U", specialty: "Lic", startYear: "2014", graduationYear: "2018" }
    });
    expect(draft.focusAreas).toEqual(["Ansiedad", "Otro (objetivos de terapia): definir límites"]);
    expect(draft.focusPrimary).toContain("Ansiedad");
  });

  it("mobile sin foto deja photoUrl en null", () => {
    const draft = buildPatchDraftFromMobileInputs({
      aboutText: "",
      therapyDescriptionText: "",
      selectedSpecialization: "Psicologo",
      selectedExperience: "6-10 anos",
      selectedPracticeHours: "1000-3000 horas",
      workLanguages: ["Espanol"],
      summaryText: "",
      priceData: { sessionPriceArs: "", sessionPrice: "", discount4: "", discount8: "", discount12: "" },
      personalData: { graduationYear: "", gender: "Hombre", birthCountry: "UY", residencyCountry: "AR" },
      educationData: { institution: "", specialty: "", startYear: "", graduationYear: "" }
    });
    expect(draft.photoUrl).toBeNull();
  });
});
