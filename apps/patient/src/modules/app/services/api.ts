import { createApiClient } from "@therapy/auth";

export const STORAGE_KEY = "therapy_patient_portal_v3";
/** Vacío en build → fetch relativo al dominio de Vercel → HTTP 405 en POST. */
const apiUrlRaw = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_URL?.trim();
export const API_BASE =
  apiUrlRaw && apiUrlRaw.length > 0 ? apiUrlRaw.replace(/\/+$/, "") : "http://localhost:4000";

const UNAUTHORIZED_MESSAGES = ["Invalid or expired token", "Missing bearer token"] as const;

let unauthorizedHandler: (() => void) | undefined;

/** Called from AppRoot so 401s clear stale local session (token invalid but name still in localStorage). */
export function setPatientApiUnauthorizedHandler(handler: (() => void) | undefined): void {
  unauthorizedHandler = handler;
}

const request = createApiClient({
  baseUrl: API_BASE,
  unauthorizedMessages: [...UNAUTHORIZED_MESSAGES],
  onUnauthorized: () => {
    unauthorizedHandler?.();
  }
});

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  // Bearer cross-origin: omit evita preflight/CORS extra con cookies y coincide con el uso del portal paciente.
  return request<T>(path, { credentials: "omit", ...options }, token);
}

/** Placeholder avatar when no photo or failed load (keep in sync with `onError` handlers). */
export const DEFAULT_PROFESSIONAL_AVATAR_SRC = "/images/prof-emma.svg";

/** Absolute URL for the browser: data/http(s) unchanged; paths are rooted at API base (patient app lives on another origin). */
export function resolvePublicAssetUrl(url: string | null | undefined): string | null {
  const s = typeof url === "string" ? url.trim() : "";
  if (!s) {
    return null;
  }
  if (s.startsWith("data:") || s.startsWith("http://") || s.startsWith("https://")) {
    return s;
  }
  if (s.startsWith("//")) {
    return `https:${s}`;
  }
  if (s.startsWith("/")) {
    return `${API_BASE.replace(/\/+$/, "")}${s}`;
  }
  if (/^[a-zA-Z][a-zA-Z+\d.-]*:/.test(s)) {
    return s;
  }
  return `${API_BASE.replace(/\/+$/, "")}/${s.replace(/^\/+/, "")}`;
}

/** Resolved URL suitable for `<img src>`; never null. */
export function professionalPhotoSrc(url: string | null | undefined): string {
  return resolvePublicAssetUrl(url) ?? DEFAULT_PROFESSIONAL_AVATAR_SRC;
}
