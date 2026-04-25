import { describe, expect, it } from "vitest";
import {
  parseAvailabilityWindows,
  parseLanguagePreference,
  parseTherapistPreferencesAnswer,
  rankProfessionalMatch,
  type MatchingProfessionalInput,
  type MatchingSlot
} from "./matching.service.js";

const FUTURE = (offsetMinutes: number, hour?: number): string => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + offsetMinutes);
  if (hour !== undefined) d.setHours(hour, 0, 0, 0);
  // Si pedimos un hour específico que ya pasó hoy, mover al día siguiente.
  if (hour !== undefined && d.getTime() <= Date.now()) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString();
};

function slot(id: string, hour: number): MatchingSlot {
  return {
    id,
    startsAt: FUTURE(60 * 24, hour),
    endsAt: FUTURE(60 * 24 + 50, hour)
  };
}

function baseProfessional(overrides: Partial<MatchingProfessionalInput> = {}): MatchingProfessionalInput {
  return {
    id: "p1",
    fullName: "María L.",
    title: "Psicóloga clínica",
    specialization: "Ansiedad y trauma",
    focusPrimary: "Ansiedad",
    bio: "Experiencia en TCC con foco en ansiedad y burnout laboral.",
    therapeuticApproach: "Cognitivo-conductual",
    languages: ["Español"],
    yearsExperience: 10,
    ratingAverage: 4.6,
    compatibilityBase: 70,
    slots: [slot("s1", 10), slot("s2", 14), slot("s3", 19)],
    gender: null,
    graduationYear: null,
    focusAreas: ["Ansiedad", "Trauma"],
    ...overrides
  };
}

describe("parseAvailabilityWindows", () => {
  it("acepta sinónimos en ES/EN/PT y libera con 'flexible'", () => {
    expect(parseAvailabilityWindows("Mañana")).toEqual(new Set(["morning"]));
    expect(parseAvailabilityWindows("Tarde")).toEqual(new Set(["afternoon"]));
    expect(parseAvailabilityWindows("Noche")).toEqual(new Set(["evening"]));
    expect(parseAvailabilityWindows("evening and night")).toEqual(new Set(["evening"]));
    expect(parseAvailabilityWindows("manhã")).toEqual(new Set(["morning"]));
    expect(parseAvailabilityWindows("noite")).toEqual(new Set(["evening"]));
    expect(parseAvailabilityWindows("flexible")).toEqual(new Set());
    expect(parseAvailabilityWindows("")).toEqual(new Set());
  });

  it("combina franjas cuando el texto menciona varias", () => {
    expect(parseAvailabilityWindows("tardes y noches")).toEqual(new Set(["afternoon", "evening"]));
    expect(parseAvailabilityWindows("morning or evening")).toEqual(new Set(["morning", "evening"]));
  });

  it("devuelve set vacío si solo menciona días sin franja horaria (ej. 'fines de semana')", () => {
    expect(parseAvailabilityWindows("fines de semana")).toEqual(new Set());
  });
});

describe("parseLanguagePreference", () => {
  it("detecta español/inglés/portugués con variantes y bilingüe", () => {
    expect(parseLanguagePreference("Español")).toEqual({ preferred: new Set(["es"]), bilingual: false });
    expect(parseLanguagePreference("inglés")).toEqual({ preferred: new Set(["en"]), bilingual: false });
    expect(parseLanguagePreference("portuguese")).toEqual({ preferred: new Set(["pt"]), bilingual: false });
    expect(parseLanguagePreference("bilingüe")).toEqual({ preferred: new Set(), bilingual: true });
    expect(parseLanguagePreference("español e inglés")).toEqual({ preferred: new Set(["es", "en"]), bilingual: false });
  });

  it("set vacío si no hay match conocido", () => {
    expect(parseLanguagePreference("klingon")).toEqual({ preferred: new Set(), bilingual: false });
    expect(parseLanguagePreference("")).toEqual({ preferred: new Set(), bilingual: false });
  });
});

describe("parseTherapistPreferencesAnswer", () => {
  it("retorna empty defaults si no hay raw", () => {
    expect(parseTherapistPreferencesAnswer(undefined)).toEqual({
      exclusive: false,
      gender: "Sin preferencia",
      age: "Sin preferencia",
      lgbtq: "Sin preferencia"
    });
  });

  it("'No tengo preferencias' marca exclusive=true", () => {
    expect(parseTherapistPreferencesAnswer("No tengo preferencias")).toEqual({
      exclusive: true,
      gender: "Sin preferencia",
      age: "Sin preferencia",
      lgbtq: "Sin preferencia"
    });
  });

  it("parsea las 3 líneas con prefijos canónicos", () => {
    const raw = [
      "Género del/de la psicólogo/a: Mujer",
      "Edad aproximada del/de la psicólogo/a: 35 a 45",
      "Experiencia en temas LGBTIQ+: Sí, prefiero experiencia o formación en temas LGBTIQ+"
    ].join("\n");
    expect(parseTherapistPreferencesAnswer(raw)).toEqual({
      exclusive: false,
      gender: "Mujer",
      age: "35 a 45",
      lgbtq: "Sí, prefiero experiencia o formación en temas LGBTIQ+"
    });
  });

  it("acepta prefijos legados sin '/de la psicólogo/a:'", () => {
    const raw = ["Género: Hombre", "Edad aproximada: 45 a 55", "LGBTIQ+: No es un criterio para mí"].join("\n");
    const parsed = parseTherapistPreferencesAnswer(raw);
    expect(parsed.gender).toBe("Hombre");
    expect(parsed.age).toBe("45 a 55");
    expect(parsed.lgbtq).toBe("No es un criterio para mí");
  });
});

describe("rankProfessionalMatch — therapistPreferences", () => {
  it("matchea género preferido (Mujer) y suma score", () => {
    const female = baseProfessional({ id: "p-f", gender: "Mujer" });
    const male = baseProfessional({ id: "p-m", gender: "Hombre" });
    const answers = {
      mainReason: "Ansiedad",
      therapistPreferences: "Género del/de la psicólogo/a: Mujer\nEdad aproximada del/de la psicólogo/a: Sin preferencia\nExperiencia en temas LGBTIQ+: Sin preferencia"
    };
    const fScore = rankProfessionalMatch({ professional: female, intakeAnswers: answers, language: "es" }).score;
    const mScore = rankProfessionalMatch({ professional: male, intakeAnswers: answers, language: "es" }).score;
    expect(fScore).toBeGreaterThan(mScore);
    expect(fScore - mScore).toBeGreaterThanOrEqual(20); // penalización fuerte por mismatch
  });

  it("'Sin preferencia' no penaliza ni suma por género", () => {
    const female = baseProfessional({ id: "p-f", gender: "Mujer" });
    const male = baseProfessional({ id: "p-m", gender: "Hombre" });
    const answers = {
      mainReason: "Ansiedad",
      therapistPreferences: "No tengo preferencias"
    };
    const fScore = rankProfessionalMatch({ professional: female, intakeAnswers: answers, language: "es" }).score;
    const mScore = rankProfessionalMatch({ professional: male, intakeAnswers: answers, language: "es" }).score;
    expect(fScore).toBe(mScore);
  });

  it("matchea rango de edad usando graduationYear como proxy", () => {
    const currentYear = new Date().getFullYear();
    // Egresó hace 15 años → ~24 + 15 = ~39 años
    const inRange = baseProfessional({ id: "p-in", graduationYear: currentYear - 15 });
    // Egresó hace 1 año → ~25 años (fuera de "35 a 45")
    const outOfRange = baseProfessional({ id: "p-out", graduationYear: currentYear - 1 });
    const answers = {
      mainReason: "Ansiedad",
      therapistPreferences:
        "Género del/de la psicólogo/a: Sin preferencia\nEdad aproximada del/de la psicólogo/a: 35 a 45\nExperiencia en temas LGBTIQ+: Sin preferencia"
    };
    const inScore = rankProfessionalMatch({ professional: inRange, intakeAnswers: answers, language: "es" }).score;
    const outScore = rankProfessionalMatch({ professional: outOfRange, intakeAnswers: answers, language: "es" }).score;
    expect(inScore).toBeGreaterThan(outScore);
  });

  it("matchea LGBTIQ+ via focusAreas y suma puntos", () => {
    const lgbtFriendly = baseProfessional({
      id: "p-lgbt",
      focusAreas: ["Ansiedad", "Diversidad sexual y de género"]
    });
    const generic = baseProfessional({ id: "p-generic", focusAreas: ["Ansiedad"] });
    const answers = {
      mainReason: "Ansiedad",
      therapistPreferences:
        "Género del/de la psicólogo/a: Sin preferencia\nEdad aproximada del/de la psicólogo/a: Sin preferencia\nExperiencia en temas LGBTIQ+: Sí, prefiero experiencia o formación en temas LGBTIQ+"
    };
    const a = rankProfessionalMatch({ professional: lgbtFriendly, intakeAnswers: answers, language: "es" });
    const b = rankProfessionalMatch({ professional: generic, intakeAnswers: answers, language: "es" });
    expect(a.score).toBeGreaterThan(b.score);
    expect(a.reasons.some((r: string) => r.toLowerCase().includes("lgbt"))).toBe(true);
  });

  it("retrocompatibilidad: si no hay therapistPreferences en answers, score se mantiene", () => {
    const pro = baseProfessional({ gender: "Mujer", graduationYear: 2010, focusAreas: ["Ansiedad"] });
    const withoutPrefs = rankProfessionalMatch({ professional: pro, intakeAnswers: { mainReason: "Ansiedad" }, language: "es" });
    expect(withoutPrefs.score).toBeGreaterThan(0);
    expect(withoutPrefs.score).toBeLessThanOrEqual(99);
  });
});

describe("rankProfessionalMatch — language extendido", () => {
  it("matchea cuando el paciente pide portugués y el profesional lo habla", () => {
    const ptPro = baseProfessional({ id: "p-pt", languages: ["Português"] });
    const esPro = baseProfessional({ id: "p-es", languages: ["Español"] });
    const answers = { mainReason: "Ansiedad", language: "portugués" };
    const ptScore = rankProfessionalMatch({ professional: ptPro, intakeAnswers: answers, language: "es" }).score;
    const esScore = rankProfessionalMatch({ professional: esPro, intakeAnswers: answers, language: "es" }).score;
    expect(ptScore).toBeGreaterThan(esScore);
  });

  it("acepta variantes 'español e inglés' (multi-language)", () => {
    const bilingue = baseProfessional({ id: "p-bi", languages: ["Español", "English"] });
    const monolingue = baseProfessional({ id: "p-mono", languages: ["Español"] });
    const answers = { mainReason: "Ansiedad", language: "español e inglés" };
    const a = rankProfessionalMatch({ professional: bilingue, intakeAnswers: answers, language: "es" }).score;
    const b = rankProfessionalMatch({ professional: monolingue, intakeAnswers: answers, language: "es" }).score;
    expect(a).toBeGreaterThan(b);
  });
});

describe("rankProfessionalMatch — availability extendido", () => {
  it("aplica match parcial si solo algunas franjas calzan", () => {
    const eveningOnly = baseProfessional({ id: "p-e", slots: [slot("s", 20)] });
    const morningOnly = baseProfessional({ id: "p-m", slots: [slot("s", 9)] });
    const answers = { mainReason: "Ansiedad", availability: "noche" };
    const e = rankProfessionalMatch({ professional: eveningOnly, intakeAnswers: answers, language: "es" }).score;
    const m = rankProfessionalMatch({ professional: morningOnly, intakeAnswers: answers, language: "es" }).score;
    expect(e).toBeGreaterThan(m);
  });
});
