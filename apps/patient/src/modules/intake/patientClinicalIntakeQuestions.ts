import type { IntakeQuestion } from "../app/types";

/** Texto canónico (ES) de la opción de crisis en “¿Cómo te sentís hoy?”. */
export const PATIENT_INTAKE_CRISIS_EMOTIONAL_OPTION_ES =
  "Estoy teniendo pensamientos de hacerme daño o de no querer vivir";

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
    help: "Marcá lo que aplique, o elegí “No tengo preferencias”.",
    options: [
      "Género del/de la psicólogo/a",
      "Edad aproximada del/de la psicólogo/a",
      "País o acento",
      "Experiencia en temas LGBTIQ+",
      "No tengo preferencias",
      "Otro"
    ],
    allowMultiple: true,
    exclusiveOptionEs: "No tengo preferencias",
    otherFollowupOption: "Otro"
  },
  {
    id: "preferredApproach",
    title: "4. ¿Qué tipo de terapia preferís?",
    help: "Elegí una opción. Si no estás seguro/a, podés dejarlo en manos del profesional.",
    options: [
      "Terapia cognitivo-conductual (TCC)",
      "Psicodinámica o psicoanalítica",
      "Humanista o centrada en la persona",
      "Sistémica o familiar",
      "Integradora o ecléctica",
      "No estoy seguro/a; lo que recomiende el profesional"
    ],
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
    options: [
      "Bastante bien",
      "Con altibajos, pero puedo",
      "Mal/a, me cuesta",
      "Muy mal/a o desbordado/a",
      PATIENT_INTAKE_CRISIS_EMOTIONAL_OPTION_ES
    ],
    crisisLastOption: true
  }
];
