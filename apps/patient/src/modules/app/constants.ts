import type { IntakeQuestion, PackagePlan } from "./types";

export const DEFAULT_PATIENT_HERO_IMAGE =
  "https://images.pexels.com/photos/8148648/pexels-photo-8148648.jpeg?auto=compress&cs=tinysrgb&w=1600";

/** Separador de opciones en `mainReason` cuando hay multiselección (alineado con patient-mobile). */
export const INTAKE_MAIN_REASON_VALUE_JOINER = "\n";

export const intakeQuestions: IntakeQuestion[] = [
  {
    id: "mainReason",
    title: "1. ¿Cuál es tu motivo principal de consulta?",
    help: "Selecciona lo que mejor describa tu necesidad actual.",
    options: ["Ansiedad", "Depresión", "Vínculos y pareja", "Estrés / burnout", "Otro"],
    allowMultiple: true
  },
  {
    id: "therapyGoal",
    title: "2. ¿Qué objetivo te gustaría lograr en terapia?",
    help: "Esta respuesta mejora la calidad del matching.",
    multiline: true
  },
  {
    id: "preferredApproach",
    title: "3. Enfoque terapéutico preferido",
    help: "Si no sabes, no hay problema.",
    options: ["TCC", "Psicodinámico", "Integrativo", "Mindfulness", "No estoy seguro"]
  },
  {
    id: "previousTherapy",
    title: "4. Experiencia previa en terapia",
    help: "Te ayuda a elegir ritmo y profesional.",
    options: ["No", "Sí, menos de 3 meses", "Sí, entre 3 y 12 meses", "Sí, más de 1 año"]
  },
  {
    id: "emotionalState",
    title: "5. ¿Cómo te sentís hoy?",
    help: "Estado emocional actual.",
    options: ["Estable", "Sobrepasado", "Triste", "Ansioso", "No lo se"]
  },
  {
    id: "availability",
    title: "6. Disponibilidad horaria preferida",
    help: "Para mostrarte los mejores slots disponibles.",
    options: ["Por la mañana", "Tarde", "Noche", "Flexible"]
  },
  {
    id: "language",
    title: "7. Idioma para la sesión",
    help: "Se usa para el matching.",
    options: ["Inglés", "Español", "Bilingüe"]
  },
  {
    id: "budget",
    title: "8. Presupuesto estimado",
    help: "Luego podrás elegir paquetes de sesiones.",
    options: ["Paquete inicial", "Paquete intermedio", "Paquete intensivo", "No estoy seguro"]
  },
  {
    id: "supportNetwork",
    title: "9. ¿Contás con red de apoyo (familia/amigos)?",
    help: "Contexto para continuidad terapéutica.",
    options: ["Apoyo fuerte", "Apoyo limitado", "Sin apoyo", "Prefiero no responder"]
  },
  {
    id: "safetyRisk",
    title: "10. En las últimas 2 semanas, ¿tuviste ideas de autolesión?",
    help: "Pregunta de seguridad obligatoria antes de habilitar reservas.",
    options: ["No", "A veces", "Frecuentemente", "Prefiero no responder"]
  }
];

export const defaultPackagePlans: PackagePlan[] = [
  {
    id: "starter",
    name: "Inicio - 4 sesiones",
    credits: 4,
    priceCents: 36000,
    currency: "usd",
    discountPercent: 30,
    description: "Ideal para una primera etapa de trabajo terapeutico."
  },
  {
    id: "growth",
    name: "Continuidad - 8 sesiones",
    credits: 8,
    priceCents: 68000,
    currency: "usd",
    discountPercent: 36,
    description: "Plan recomendado para trabajo mensual sostenido."
  },
  {
    id: "intensive",
    name: "Intensivo - 12 sesiones",
    credits: 12,
    priceCents: 96000,
    currency: "usd",
    discountPercent: 40,
    description: "Mayor frecuencia para procesos de alta demanda."
  }
];
