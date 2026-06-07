import type { IntakeQuestion, PackagePlan } from "./types";
import { PATIENT_CLINICAL_INTAKE_FIRST_STEPS } from "../intake/patientClinicalIntakeQuestions";

/** Tras confirmar sesión de prueba: AppRoot ofrece conectar Google Calendar (no aplica a compras con crédito). */
export const POST_TRIAL_CALENDAR_PENDING_SESSION_KEY = "mc_post_trial_calendar_pending";

/**
 * Distintos puntos en los que AppRoot puede ofrecer Google Calendar:
 * - `pre-matching`: durante el onboarding, justo después del intake (legacy).
 * - `post-trial`: tras confirmar la primera sesión de prueba (legacy).
 * - `post-login`: al ingresar al portal con cuenta ya activa pero sin Calendar
 *   conectado. Pensado para que el reviewer de Google App Verification vea el
 *   consent screen sin tener que navegar a Perfil.
 */
export type CalendarOfferContext = "pre-matching" | "post-trial" | "post-login";

/** Ocultar favoritos en header, matching y ruta /favorites hasta reactivarlo. */
export const PATIENT_FAVORITES_ENABLED = false;

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
    if (raw === "post-trial") return "post-trial";
    if (raw === "post-login") return "post-login";
    return "pre-matching";
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

const PATIENT_AUTH_CALENDAR_LAST_SESSION_KEY = "motivarcare.patient.authCalendarConnected.v1.";

/** Último valor conocido de GET /auth/me `googleCalendarConnected` para este usuario (por pestaña). */
export function peekPatientAuthCalendarConnectedSession(userId: string): boolean | null {
  const uid = userId.trim();
  if (!uid) {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(PATIENT_AUTH_CALENDAR_LAST_SESSION_KEY + uid);
    if (raw === "1") {
      return true;
    }
    if (raw === "0") {
      return false;
    }
  } catch {
    // ignore
  }
  return null;
}

export function rememberPatientAuthCalendarConnectedSession(userId: string, connected: boolean): void {
  const uid = userId.trim();
  if (!uid) {
    return;
  }
  try {
    window.sessionStorage.setItem(PATIENT_AUTH_CALENDAR_LAST_SESSION_KEY + uid, connected ? "1" : "0");
  } catch {
    // ignore
  }
}

/** Fallback local si falla la URL remota del hero (configurada desde Admin → Web → Imágenes hero). */
export const DEFAULT_PATIENT_HERO_IMAGE = "/images/hero-therapy.jpg";

/** Separador de opciones en `mainReason` cuando hay multiselección (alineado con patient-mobile). */
export const INTAKE_MAIN_REASON_VALUE_JOINER = "\n";

export const intakeQuestions: IntakeQuestion[] = [
  ...PATIENT_CLINICAL_INTAKE_FIRST_STEPS,
  {
    id: "supportNetwork",
    title: "7. ¿Contás con red de apoyo (familia/amigos)?",
    help: "Contexto para continuidad terapéutica.",
    options: ["Apoyo fuerte", "Apoyo limitado", "Sin apoyo", "Prefiero no responder"]
  },
  {
    id: "safetyRisk",
    title: "8. En las últimas 2 semanas, ¿tuviste ideas de autolesión?",
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
