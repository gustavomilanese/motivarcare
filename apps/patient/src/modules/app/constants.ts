import type { IntakeQuestion, PackagePlan } from "./types";

export const DEFAULT_PATIENT_HERO_IMAGE =
  "https://images.pexels.com/photos/8148648/pexels-photo-8148648.jpeg?auto=compress&cs=tinysrgb&w=1600";

export const intakeQuestions: IntakeQuestion[] = [
  {
    id: "mainReason",
    title: "1. Cual es tu motivo principal de consulta?",
    help: "Selecciona lo que mejor describa tu necesidad actual.",
    options: ["Ansiedad", "Depresion", "Vinculos y pareja", "Estres / burnout", "Otro"]
  },
  {
    id: "therapyGoal",
    title: "2. Que objetivo te gustaria lograr en terapia?",
    help: "Esta respuesta mejora la calidad del matching.",
    multiline: true
  },
  {
    id: "preferredApproach",
    title: "3. Enfoque terapeutico preferido",
    help: "Si no sabes, no hay problema.",
    options: ["TCC", "Psicodinamico", "Integrativo", "Mindfulness", "No estoy seguro"]
  },
  {
    id: "previousTherapy",
    title: "4. Experiencia previa en terapia",
    help: "Te ayuda a elegir ritmo y profesional.",
    options: ["No", "Si, menos de 3 meses", "Si, entre 3 y 12 meses", "Si, mas de 1 ano"]
  },
  {
    id: "emotionalState",
    title: "5. Como te sentis hoy?",
    help: "Estado emocional actual.",
    options: ["Estable", "Sobrepasado", "Triste", "Ansioso", "No lo se"]
  },
  {
    id: "availability",
    title: "6. Disponibilidad horaria preferida",
    help: "Para mostrarte los mejores slots disponibles.",
    options: ["Manana", "Tarde", "Noche", "Flexible"]
  },
  {
    id: "language",
    title: "7. Idioma para la sesion",
    help: "Se usa para el matching.",
    options: ["Ingles", "Espanol", "Bilingue"]
  },
  {
    id: "budget",
    title: "8. Presupuesto estimado",
    help: "Luego podras elegir paquetes de sesiones.",
    options: ["Paquete inicial", "Paquete intermedio", "Paquete intensivo", "No estoy seguro"]
  },
  {
    id: "supportNetwork",
    title: "9. Contas con red de apoyo (familia/amigos)?",
    help: "Contexto para continuidad terapeutica.",
    options: ["Apoyo fuerte", "Apoyo limitado", "Sin apoyo", "Prefiero no responder"]
  },
  {
    id: "safetyRisk",
    title: "10. En las ultimas 2 semanas tuviste ideas de autolesion?",
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
