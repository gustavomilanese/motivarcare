/**
 * Catálogo canónico de preguntas del intake clínico, replicado del cliente
 * (`apps/patient/src/modules/app/constants.ts` + `patientClinicalIntakeQuestions.ts`).
 *
 * Vivimos con duplicación intencional: la API no debe importar de las apps
 * (no hay alias), y el catálogo es chico y muy estable. Si cambia el wizard,
 * hay que actualizar también este archivo.
 */

export type IntakeChatAnswerType = "single" | "multi" | "composite-therapist-prefs" | "free-text-country";

export interface IntakeChatQuestionDef {
  id: string;
  /** Etiqueta corta para que el LLM identifique de qué pregunta hablamos (no es la voz literal). */
  label: string;
  /** Resumen humano de qué necesitamos saber, en voz del entrevistador. */
  intent: string;
  type: IntakeChatAnswerType;
  options?: readonly string[];
  /** Para `multi`: si está presente, marcarlo limpia el resto de las opciones. */
  exclusiveOption?: string;
  /** Para `multi` con "Otro": habilita texto libre adicional. */
  allowsOther?: boolean;
  /** Pregunta es obligatoria para poder enviar el intake (`safetyRisk` siempre obligatoria). */
  required?: boolean;
  /** Notas extra para el modelo (ej. cómo formatear la respuesta extraída). */
  extractionHint?: string;
}

const INTAKE_JOIN = "\n";

/** Mismas opciones que el wizard clásico (apps/patient). */
export const INTAKE_CHAT_QUESTIONS: readonly IntakeChatQuestionDef[] = [
  {
    id: "mainReason",
    label: "Motivos principales de consulta",
    intent:
      "Explorar uno o varios motivos por los que el paciente busca terapia. Probar gentilmente si menciona algo vago.",
    type: "multi",
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
    allowsOther: true,
    required: true,
    extractionHint: `Devolver como string con cada motivo en una línea separada por "${INTAKE_JOIN}". Si el paciente describe algo libre, mapearlo al option más cercano y, si no encaja, agregar "Otro" + el texto libre como segundo elemento.`
  },
  {
    id: "therapyGoal",
    label: "Objetivos de la terapia",
    intent: "Qué le gustaría lograr con el proceso. Puede ser uno o varios.",
    type: "multi",
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
    allowsOther: true,
    required: true,
    extractionHint: `Igual que mainReason: una opción por línea separada por "${INTAKE_JOIN}".`
  },
  {
    id: "therapistPreferences",
    label: "Preferencias sobre el/la psicólogo/a (género, edad, experiencia LGBTIQ+)",
    intent:
      "Saber si tiene preferencia de género (Sin preferencia/Hombre/Mujer), edad aproximada (Sin preferencia, 25 a 35, 35 a 45, 45 a 55, 55 a 65, 65 a 75, 75 o más) y experiencia LGBTIQ+ (Sin preferencia / Sí, prefiero experiencia o formación en temas LGBTIQ+ / No es un criterio para mí). Si dice 'sin preferencia general', usar 'No tengo preferencias'.",
    type: "composite-therapist-prefs",
    required: true,
    extractionHint:
      'Si el paciente no tiene preferencias, devolver exactamente: "No tengo preferencias". Caso contrario, devolver tres líneas separadas por "\\n" con prefijos exactos: "Género del/de la psicólogo/a: <valor>", "Edad aproximada del/de la psicólogo/a: <valor>", "Experiencia en temas LGBTIQ+: <valor>". Cada valor debe ser uno de los del enunciado.'
  },
  {
    id: "preferredApproach",
    label: "Tipo de terapia preferida (enfoque)",
    intent:
      "Qué enfoque le interesa: TCC, Psicodinámica, Humanista, Sistémica, Integradora, o 'No estoy seguro/a; lo que recomiende el profesional'.",
    type: "multi",
    options: [
      "Terapia cognitivo-conductual (TCC)",
      "Psicodinámica o psicoanalítica",
      "Humanista o centrada en la persona",
      "Sistémica o familiar",
      "Integradora o ecléctica",
      "No estoy seguro/a; lo que recomiende el profesional"
    ],
    exclusiveOption: "No estoy seguro/a; lo que recomiende el profesional",
    required: true,
    extractionHint: `Una opción por línea ("${INTAKE_JOIN}"). Si elige "No estoy seguro/a; lo que recomiende el profesional", esa debe ser la única opción.`
  },
  {
    id: "previousTherapy",
    label: "Experiencia previa en terapia",
    intent: "Si ya estuvo en terapia antes y cómo le fue.",
    type: "single",
    options: ["Sí, y me ayudó", "Sí, pero no me sirvió mucho", "No, nunca fui a terapia"],
    required: true
  },
  {
    id: "emotionalState",
    label: "Estado emocional actual",
    intent:
      "Cómo se siente hoy. Importante: si menciona ideación de autolesión / no querer vivir, mapear a la opción de crisis.",
    type: "single",
    options: [
      "Bastante bien",
      "Con altibajos",
      "Me siento muy mal",
      "Estoy desbordado/a",
      "Estoy teniendo pensamientos de hacerme daño o de no querer vivir"
    ],
    required: true,
    extractionHint:
      'Si el paciente describe ideación suicida o de autolesión (aunque sea sutil), elegir SIEMPRE "Estoy teniendo pensamientos de hacerme daño o de no querer vivir".'
  },
  {
    id: "supportNetwork",
    label: "Red de apoyo",
    intent: "Si cuenta con familia/amigos como red de apoyo.",
    type: "single",
    options: ["Apoyo fuerte", "Apoyo limitado", "Sin apoyo", "Prefiero no responder"],
    required: true
  },
  {
    id: "availability",
    label: "Disponibilidad horaria preferida",
    intent:
      "Saber qué franja horaria le viene mejor para sesiones (mañana / tarde / noche). Aceptar combinaciones (ej. 'tardes y noches') y libertad ('flexible'). Es opcional: si dice que cualquier horario le sirve, marcar 'Flexible'.",
    type: "single",
    options: ["Mañana", "Tarde", "Noche", "Flexible"],
    required: false,
    extractionHint:
      "Devolver una sola opción. Si menciona varias franjas, elegir la más temprana mencionada (Mañana > Tarde > Noche) o 'Flexible' si no es específico. Si no menciona nada de horarios, no extraer este campo todavía."
  },
  {
    id: "language",
    label: "Idioma preferido para las sesiones",
    intent:
      "Idioma en el que prefiere hacer terapia (Español, Inglés, Portugués, Bilingüe, o Sin preferencia). Si el paciente está escribiendo en español sin pedir nada distinto, asumir 'Español' al final del intake si no respondió explícitamente.",
    type: "single",
    options: ["Español", "Inglés", "Portugués", "Bilingüe", "Sin preferencia"],
    required: false,
    extractionHint:
      "Devolver una sola opción. 'Bilingüe' significa que le viene bien más de un idioma indistintamente. 'Sin preferencia' si no le importa el idioma del/de la profesional."
  },
  {
    id: "safetyRisk",
    label: "Riesgo de autolesión (últimas 2 semanas)",
    intent:
      "Pregunta de seguridad obligatoria: en las últimas 2 semanas, frecuencia de ideas de autolesión. Hacerla con cuidado y sin alarmismo, pero hacerla siempre.",
    type: "single",
    options: ["No", "A veces", "Frecuentemente", "Prefiero no responder"],
    required: true
  }
] as const;

/**
 * Pregunta extra del wizard tradicional: país de residencia (ISO-3166 alpha-2).
 * No se mete dentro de `answers`, va aparte como `residencyCountry`.
 */
export const INTAKE_CHAT_RESIDENCY_COUNTRY_INTENT =
  "Saber el país de residencia del paciente para definir mercado/precios. Aceptar en cualquier idioma y mapear a código ISO-3166 alpha-2 (ej. 'AR' para Argentina, 'UY' para Uruguay, 'ES' para España, 'BR' para Brasil, 'MX' para México, 'CL' para Chile, 'CO' para Colombia, 'PE' para Perú, 'US' para Estados Unidos).";

/** Set de IDs requeridos para considerar la sesión "lista para submit". */
export const INTAKE_CHAT_REQUIRED_QUESTION_IDS = INTAKE_CHAT_QUESTIONS.filter((q) => q.required).map((q) => q.id);

export function getQuestionById(id: string): IntakeChatQuestionDef | undefined {
  return INTAKE_CHAT_QUESTIONS.find((q) => q.id === id);
}

/**
 * Texto canónico (ES) de la opción de crisis en `emotionalState`.
 * Espejado de `PATIENT_INTAKE_CRISIS_EMOTIONAL_OPTION_ES` en el cliente.
 */
export const INTAKE_CHAT_CRISIS_EMOTIONAL_OPTION =
  "Estoy teniendo pensamientos de hacerme daño o de no querer vivir";
