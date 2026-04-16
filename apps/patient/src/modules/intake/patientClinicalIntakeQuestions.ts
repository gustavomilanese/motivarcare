import type { IntakeQuestion } from "../app/types";

/** Mismo valor que `INTAKE_MAIN_REASON_VALUE_JOINER` en `constants.ts` (evita import circular). */
const INTAKE_JOIN = "\n";

/** Texto canónico (ES) de la opción de crisis en “¿Cómo te sentís hoy?”. */
export const PATIENT_INTAKE_CRISIS_EMOTIONAL_OPTION_ES =
  "Estoy teniendo pensamientos de hacerme daño o de no querer vivir";

/** Respuesta “Frecuentemente” (o etiqueta EN/PT equivalente) en la pregunta de seguridad del intake. */
export function isSafetyRiskFrequentlyAnswer(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  return v === "frecuentemente" || v === "frequently" || v === "frequentemente";
}

/** Valor guardado cuando el paciente no quiere detallar preferencias. */
export const THERAPIST_PREF_EXCLUSIVE_ES = "No tengo preferencias";

const TH_PREFIX_G = "Género del/de la psicólogo/a: ";
const TH_PREFIX_AGE = "Edad aproximada del/de la psicólogo/a: ";
const TH_PREFIX_LGBT = "Experiencia en temas LGBTIQ+: ";

export const THERAPIST_PREF_GENDER_OPTIONS_ES = ["Sin preferencia", "Hombre", "Mujer", "Me da igual"] as const;

export const THERAPIST_PREF_AGE_OPTIONS_ES = [
  "Sin preferencia",
  "25 a 35",
  "35 a 45",
  "45 a 55",
  "55 a 65",
  "65 a 75",
  "75 o más"
] as const;

export const THERAPIST_PREF_LGBT_OPTIONS_ES = [
  "Sin preferencia",
  "Sí, prefiero experiencia o formación en temas LGBTIQ+",
  "No es un criterio para mí"
] as const;

export type TherapistPrefParsed = {
  exclusive: boolean;
  gender: string;
  age: string;
  lgbtq: string;
};

function normalizeTherapistLine(line: string): string {
  const legacyGender = "Género: ";
  const legacyAge = "Edad aproximada: ";
  const legacyLgbt = "LGBTIQ+: ";
  if (line.startsWith(TH_PREFIX_G)) {
    return line;
  }
  if (line.startsWith(legacyGender)) {
    return TH_PREFIX_G + line.slice(legacyGender.length).trim();
  }
  if (line.startsWith(TH_PREFIX_AGE)) {
    return line;
  }
  if (line.startsWith(legacyAge)) {
    return TH_PREFIX_AGE + line.slice(legacyAge.length).trim();
  }
  if (line.startsWith(TH_PREFIX_LGBT)) {
    return line;
  }
  if (line.startsWith(legacyLgbt)) {
    return TH_PREFIX_LGBT + line.slice(legacyLgbt.length).trim();
  }
  return line;
}

export function parseTherapistPreferencesStored(raw: string): TherapistPrefParsed {
  const trimmed = raw.trim();
  if (trimmed === THERAPIST_PREF_EXCLUSIVE_ES) {
    return {
      exclusive: true,
      gender: THERAPIST_PREF_GENDER_OPTIONS_ES[0],
      age: THERAPIST_PREF_AGE_OPTIONS_ES[0],
      lgbtq: THERAPIST_PREF_LGBT_OPTIONS_ES[0]
    };
  }
  let gender: string = THERAPIST_PREF_GENDER_OPTIONS_ES[0];
  let age: string = THERAPIST_PREF_AGE_OPTIONS_ES[0];
  let lgbtq: string = THERAPIST_PREF_LGBT_OPTIONS_ES[0];
  for (const piece of raw
    .split(INTAKE_JOIN)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(normalizeTherapistLine)) {
    if (piece.startsWith(TH_PREFIX_G)) {
      gender = piece.slice(TH_PREFIX_G.length).trim() || gender;
    } else if (piece.startsWith(TH_PREFIX_AGE)) {
      age = piece.slice(TH_PREFIX_AGE.length).trim() || age;
    } else if (piece.startsWith(TH_PREFIX_LGBT)) {
      lgbtq = piece.slice(TH_PREFIX_LGBT.length).trim() || lgbtq;
    }
  }
  return { exclusive: false, gender, age, lgbtq };
}

export function buildTherapistPreferencesStored(exclusive: boolean, gender: string, age: string, lgbtq: string): string {
  if (exclusive) {
    return THERAPIST_PREF_EXCLUSIVE_ES;
  }
  return [TH_PREFIX_G + gender, TH_PREFIX_AGE + age, TH_PREFIX_LGBT + lgbtq].join(INTAKE_JOIN);
}

/** Primeros 6 pasos del intake (voz paciente); después siguen logística y seguridad en `constants.ts`. */
export const PATIENT_CLINICAL_INTAKE_FIRST_STEPS: IntakeQuestion[] = [
  {
    id: "mainReason",
    title: "1. ¿Cuáles son tus motivos principales de consulta?",
    help: "Podés marcar uno o varios.",
    options: [
      "Ansiedad",
      "Ataques de pánico",
      "Estrés",
      "Depresión",
      "Problemas de autoestima",
      "Dificultad en relaciones",
      "Rupturas amorosas o duelos",
      "Problemas laborales o burnout",
      "Toma de decisiones importantes",
      "Falta de motivación o propósito",
      "Problemas de sueño",
      "Manejo de emociones",
      "Consumo o conductas adictivas",
      "Experiencias difíciles del pasado",
      "Crisis personales",
      "Soledad",
      "Dificultad para controlar impulsos",
      "Crecimiento personal",
      "Otro"
    ],
    allowMultiple: true,
    otherFollowupOption: "Otro"
  },
  {
    id: "therapyGoal",
    title: "2. ¿Qué te gustaría lograr con la terapia?",
    help: "Podés marcar uno o varios.",
    options: [
      "Sentirme mejor emocionalmente",
      "Entender qué me pasa",
      "Resolver un problema puntual",
      "Mejorar mis relaciones",
      "Tomar una decisión importante",
      "Reducir ansiedad o estrés",
      "Superar una situación difícil",
      "Crecer personalmente",
      "Otro"
    ],
    allowMultiple: true,
    otherFollowupOption: "Otro"
  },
  {
    id: "therapistPreferences",
    title: "3. ¿Tenés alguna preferencia respecto de tu psicólogo/a?",
    help: "Elegí “No tengo preferencias” o completá los desplegables.",
    therapistPreferenceComposite: true
  },
  {
    id: "preferredApproach",
    title: "4. ¿Qué tipo de terapia preferís?",
    help: "Podés marcar una o varias. Si no estás seguro/a, elegí la última opción y se limpian el resto.",
    options: [
      "Terapia cognitivo-conductual (TCC)",
      "Psicodinámica o psicoanalítica",
      "Humanista o centrada en la persona",
      "Sistémica o familiar",
      "Integradora o ecléctica",
      "No estoy seguro/a; lo que recomiende el profesional"
    ],
    allowMultiple: true,
    exclusiveOptionEs: "No estoy seguro/a; lo que recomiende el profesional",
    optionSubtexts: [
      "Enfoque en pensamientos y conductas; suele incluir técnicas concretas y tareas entre sesiones.",
      "Exploración del pasado, los vínculos y patrones que hoy se repiten.",
      "Espacio de escucha, validación y autorregulación emocional.",
      "Se mira la red de relaciones (pareja, familia, trabajo) y no solo la persona.",
      "Combina herramientas según lo que vaya surgiendo en el proceso.",
      "Podés empezar sin una etiqueta fija y ajustar con tu psicólogo/a."
    ]
  },
  {
    id: "previousTherapy",
    title: "5. ¿Ya estuviste en terapia antes?",
    help: "Elegí la opción que mejor te represente.",
    options: ["Sí, y me ayudó", "Sí, pero no me sirvió mucho", "No, nunca fui a terapia"]
  },
  {
    id: "emotionalState",
    title: "6. ¿Cómo te sentís hoy?",
    help: "Elegí la opción que mejor describa cómo estás ahora.",
    options: ["Bastante bien", "Con altibajos", "Me siento muy mal", "Estoy desbordado/a"]
  }
];
