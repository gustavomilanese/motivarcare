import type { IntakeQuestion, PackagePlan } from "./types";
import { PATIENT_CLINICAL_INTAKE_FIRST_STEPS } from "../intake/patientClinicalIntakeQuestions";

/** Tras confirmar sesión de prueba: AppRoot ofrece conectar Google Calendar (no aplica a compras con crédito). */
export const POST_TRIAL_CALENDAR_PENDING_SESSION_KEY = "mc_post_trial_calendar_pending";

export type CalendarOfferContext = "pre-matching" | "post-trial";

const CALENDAR_OFFER_CONTEXT_SESSION_KEY = "mc_calendar_offer_context";

export function setCalendarOfferContext(ctx: CalendarOfferContext): void {
  try {
    window.sessionStorage.setItem(CALENDAR_OFFER_CONTEXT_SESSION_KEY, ctx);
  } catch {
    // ignore
  }
}

export function getCalendarOfferContext(): CalendarOfferContext {
  try {
    const raw = window.sessionStorage.getItem(CALENDAR_OFFER_CONTEXT_SESSION_KEY);
    return raw === "post-trial" ? "post-trial" : "pre-matching";
  } catch {
    return "pre-matching";
  }
}

export function clearCalendarOfferContext(): void {
  try {
    window.sessionStorage.removeItem(CALENDAR_OFFER_CONTEXT_SESSION_KEY);
  } catch {
    // ignore
  }
}

export function clearPostTrialCalendarPending(): void {
  try {
    window.sessionStorage.removeItem(POST_TRIAL_CALENDAR_PENDING_SESSION_KEY);
  } catch {
    // ignore
  }
}

/** Misma que `onHeroFallback`: fallback local si falla la URL remota del hero. */
export const DEFAULT_PATIENT_HERO_IMAGE = "/images/hero-therapy.svg";

/** Separador de opciones en `mainReason` cuando hay multiselección (alineado con patient-mobile). */
export const INTAKE_MAIN_REASON_VALUE_JOINER = "\n";

export const intakeQuestions: IntakeQuestion[] = [
  ...PATIENT_CLINICAL_INTAKE_FIRST_STEPS,
  {
    id: "availability",
    title: "7. Disponibilidad horaria preferida",
    help: "Para mostrarte los mejores slots disponibles.",
    options: ["Por la mañana", "Tarde", "Noche", "Flexible"]
  },
  {
    id: "language",
    title: "8. Idioma para la sesión",
    help: "Se usa para el matching.",
    options: ["Inglés", "Español", "Bilingüe"]
  },
  {
    id: "budget",
    title: "9. Presupuesto estimado",
    help: "Luego podrás elegir paquetes de sesiones.",
    options: ["Paquete inicial", "Paquete intermedio", "Paquete intensivo", "No estoy seguro"]
  },
  {
    id: "supportNetwork",
    title: "10. ¿Contás con red de apoyo (familia/amigos)?",
    help: "Contexto para continuidad terapéutica.",
    options: ["Apoyo fuerte", "Apoyo limitado", "Sin apoyo", "Prefiero no responder"]
  },
  {
    id: "safetyRisk",
    title: "11. En las últimas 2 semanas, ¿tuviste ideas de autolesión?",
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
