export type IntakeQuestionDef = {
  id: string;
  title: string;
  help: string;
  options?: string[];
  multiline?: boolean;
  allowMultiple?: boolean;
};

/** Mismo separador que apps/patient `INTAKE_MAIN_REASON_VALUE_JOINER`. */
export const INTAKE_MAIN_REASON_VALUE_JOINER = "\n";

export const intakeQuestions: IntakeQuestionDef[] = [
  {
    id: "mainReason",
    title: "¿Cuáles son tus motivos de consulta?",
    help: "Podés elegir una o más opciones.",
    options: ["Ansiedad", "Depresión", "Vínculos y pareja", "Estrés / burnout", "Otro"],
    allowMultiple: true
  },
  {
    id: "therapyGoal",
    title: "¿Qué objetivo te gustaría lograr en terapia?",
    help: "Esta respuesta mejora el matching con tu profesional.",
    multiline: true
  },
  {
    id: "preferredApproach",
    title: "Enfoque terapéutico preferido",
    help: "Si no sabés, no hay problema.",
    options: ["TCC", "Psicodinámico", "Integrativo", "Mindfulness", "No estoy seguro"]
  },
  {
    id: "previousTherapy",
    title: "Experiencia previa en terapia",
    help: "Te ayuda a elegir ritmo y profesional.",
    options: ["No", "Sí, menos de 3 meses", "Sí, entre 3 y 12 meses", "Sí, más de 1 año"]
  },
  {
    id: "emotionalState",
    title: "¿Cómo te sentís hoy?",
    help: "Estado emocional actual.",
    options: ["Estable", "Sobrepasado", "Triste", "Ansioso", "No lo sé"]
  },
  {
    id: "availability",
    title: "Disponibilidad horaria preferida",
    help: "Para mostrarte los mejores horarios.",
    options: ["Mañana", "Tarde", "Noche", "Flexible"]
  },
  {
    id: "language",
    title: "Idioma para la sesión",
    help: "Se usa en el matching.",
    options: ["Inglés", "Español", "Bilingüe"]
  },
  {
    id: "budget",
    title: "Presupuesto estimado",
    help: "Después podrás elegir paquetes de sesiones.",
    options: ["Paquete inicial", "Paquete intermedio", "Paquete intensivo", "No estoy seguro"]
  },
  {
    id: "supportNetwork",
    title: "¿Contás con red de apoyo (familia/amigos)?",
    help: "Contexto para continuidad terapéutica.",
    options: ["Apoyo fuerte", "Apoyo limitado", "Sin apoyo", "Prefiero no responder"]
  },
  {
    id: "safetyRisk",
    title: "En las últimas 2 semanas ¿tuviste ideas de autolesión?",
    help: "Pregunta de seguridad obligatoria.",
    options: ["No", "A veces", "Frecuentemente", "Prefiero no responder"]
  }
];
