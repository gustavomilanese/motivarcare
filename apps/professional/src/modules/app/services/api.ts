import { createApiClient, resolveWebAppApiBase } from "@therapy/auth";

const env = import.meta.env;

export const API_BASE = resolveWebAppApiBase({
  viteApiUrl: env.VITE_API_URL,
  isDev: env.DEV,
  forceRemoteApi: env.VITE_FORCE_REMOTE_API === "true",
  browserHostname: typeof window !== "undefined" ? window.location.hostname : "",
  preferRelativeSameOriginInDev: true,
  injectedApiBase: undefined,
  loopbackDefault: "http://localhost:4000"
});

const UNAUTHORIZED_MESSAGES = ["Invalid or expired token", "Missing bearer token"] as const;

let unauthorizedHandler: (() => void) | undefined;

/** Limpia sesión local si el token ya no sirve (paridad con portal paciente). */
export function setProfessionalApiUnauthorizedHandler(handler: (() => void) | undefined) {
  unauthorizedHandler = handler;
}

function isLoopbackHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
}

/**
 * Si en la DB quedó una URL absoluta apuntando al API de desarrollo, el portal en Vercel
 * no puede cargarla. Reescribe path/query al origen configurado en build (Railway, etc.).
 */
function rewriteAbsoluteUrlIfLoopbackDevHost(url: string): string {
  try {
    const parsed = new URL(url);
    if (!isLoopbackHostname(parsed.hostname)) {
      return url;
    }
    const baseParsed = new URL(API_BASE);
    if (isLoopbackHostname(baseParsed.hostname)) {
      return url;
    }
    return `${baseParsed.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
}

export function resolveApiAssetUrl(url: string | null | undefined): string | undefined {
  const s = url?.trim();
  if (!s) {
    return undefined;
  }
  if (s.startsWith("data:")) {
    return s;
  }
  if (/^https?:\/\//i.test(s)) {
    return rewriteAbsoluteUrlIfLoopbackDevHost(s);
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
/** Backup de sesión antes del redirect OAuth (Google puede dejar localStorage vacío al volver). */
export const PROFESSIONAL_CALENDAR_OAUTH_LS_BACKUP_KEY = "therapy_pro_calendar_oauth_ls_backup";

export function backupProfessionalLocalStorageForCalendarOAuth(): void {
  try {
    const tok = window.localStorage.getItem(TOKEN_KEY);
    const usr = window.localStorage.getItem(USER_KEY);
    const ev = window.localStorage.getItem(EMAIL_VERIFICATION_REQUIRED_KEY);
    if (!tok || !usr) {
      return;
    }
    window.sessionStorage.setItem(
      PROFESSIONAL_CALENDAR_OAUTH_LS_BACKUP_KEY,
      JSON.stringify({ token: tok, user: usr, emailVerificationRequired: ev })
    );
  } catch {
    // ignore
  }
}

/** Si volvemos con `?calendar_sync=` y el SPA perdió el token, restauramos desde el backup (paridad paciente). */
export function restoreProfessionalPortalAfterCalendarOAuth(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    if (!params.get("calendar_sync")) {
      return;
    }
    if (window.localStorage.getItem(TOKEN_KEY)) {
      window.sessionStorage.removeItem(PROFESSIONAL_CALENDAR_OAUTH_LS_BACKUP_KEY);
      return;
    }
    const raw = window.sessionStorage.getItem(PROFESSIONAL_CALENDAR_OAUTH_LS_BACKUP_KEY);
    if (!raw) {
      return;
    }
    window.sessionStorage.removeItem(PROFESSIONAL_CALENDAR_OAUTH_LS_BACKUP_KEY);
    const parsed = JSON.parse(raw) as {
      token?: string;
      user?: string;
      emailVerificationRequired?: string | null;
    };
    if (parsed.token) {
      window.localStorage.setItem(TOKEN_KEY, parsed.token);
    }
    if (parsed.user) {
      window.localStorage.setItem(USER_KEY, parsed.user);
    }
    if (parsed.emailVerificationRequired === "1") {
      window.localStorage.setItem(EMAIL_VERIFICATION_REQUIRED_KEY, "1");
    } else {
      window.localStorage.removeItem(EMAIL_VERIFICATION_REQUIRED_KEY);
    }
  } catch {
    // ignore
  }
}
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
