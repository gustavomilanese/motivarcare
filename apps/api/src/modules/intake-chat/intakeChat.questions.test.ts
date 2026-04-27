import { describe, expect, it } from "vitest";
import {
  THERAPIST_PREF_AGE_QUICK_REPLIES,
  THERAPIST_PREF_GENDER_QUICK_REPLIES,
  THERAPIST_PREF_LGBT_QUICK_REPLIES,
  inferTherapistPreferenceQuickRepliesFromAssistantMessage
} from "./intakeChat.questions.js";

describe("inferTherapistPreferenceQuickRepliesFromAssistantMessage", () => {
  it("devuelve opciones de género (texto real del asistente en producción)", () => {
    const msg = `¿Preferís que el/la psicólogo/a sea hombre, mujer, o no tenés preferencia?

- Sin preferencia
- Hombre
- Mujer`;
    expect(inferTherapistPreferenceQuickRepliesFromAssistantMessage(msg)).toEqual([...THERAPIST_PREF_GENDER_QUICK_REPLIES]);
  });

  it("devuelve rangos de edad", () => {
    const msg = `¿Qué edad aproximada preferirías que tenga el/la psicólogo/a?

- Sin preferencia
- 25 a 35
- 35 a 45`;
    expect(inferTherapistPreferenceQuickRepliesFromAssistantMessage(msg)).toEqual([...THERAPIST_PREF_AGE_QUICK_REPLIES]);
  });

  it("devuelve opciones LGBTIQ+ cuando el enunciado matchea", () => {
    const msg = `¿Te importa que el/la psicólogo/a tenga experiencia o formación en temas LGBTIQ+?

- Sin preferencia
- Sí, prefiero...`;
    expect(inferTherapistPreferenceQuickRepliesFromAssistantMessage(msg)).toEqual([...THERAPIST_PREF_LGBT_QUICK_REPLIES]);
  });

  it("no matchea saludos u otras preguntas", () => {
    expect(inferTherapistPreferenceQuickRepliesFromAssistantMessage("Hola, ¿qué te trae a buscar terapia?")).toBeUndefined();
  });
});
