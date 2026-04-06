import { createApiClient } from "@therapy/auth";

const apiUrlRaw = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_URL?.trim();
export const API_BASE =
  apiUrlRaw && apiUrlRaw.length > 0 ? apiUrlRaw.replace(/\/+$/, "") : "http://localhost:4000";

const UNAUTHORIZED_MESSAGES = ["Invalid or expired token", "Missing bearer token"] as const;

let unauthorizedHandler: (() => void) | undefined;

/** Limpia sesión local si el token ya no sirve (paridad con portal paciente). */
export function setProfessionalApiUnauthorizedHandler(handler: (() => void) | undefined) {
  unauthorizedHandler = handler;
}

export function resolveApiAssetUrl(url: string | null | undefined): string | undefined {
  const s = url?.trim();
  if (!s) {
    return undefined;
  }
  if (/^https?:\/\//i.test(s)) {
    return s;
  }
  const base = API_BASE.replace(/\/$/, "");
  return `${base}${s.startsWith("/") ? s : `/${s}`}`;
}
const patientPortalRaw = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_PATIENT_PORTAL_URL?.trim();
export const PATIENT_PORTAL_URL =
  patientPortalRaw && patientPortalRaw.length > 0
    ? patientPortalRaw.replace(/\/+$/, "")
    : "http://localhost:5173";
export const TOKEN_KEY = "therapy_pro_token";
export const USER_KEY = "therapy_pro_user";
export const EMAIL_VERIFICATION_REQUIRED_KEY = "therapy_pro_email_verification_required";
/** Tras registrar: mostrar paso Google Calendar aunque haya refresh (userId del profesional). */
export const CALENDAR_ONBOARDING_PENDING_USER_ID_KEY = "therapy_pro_calendar_onboarding_user_id";
/** Antes de OAuth: destino al volver (sessionStorage) si el callback cae en la ruta equivocada. */
export const PROFESSIONAL_CALENDAR_OAUTH_RETURN_PATH_KEY = "therapy_pro_gcal_oauth_return_path";
export const LANGUAGE_KEY = "therapy_pro_language";
export const CURRENCY_KEY = "therapy_pro_currency";

const request = createApiClient({
  baseUrl: API_BASE,
  unauthorizedMessages: [...UNAUTHORIZED_MESSAGES],
  onUnauthorized: () => {
    unauthorizedHandler?.();
  }
});

export async function apiRequest<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  return request<T>(path, init, token);
}
