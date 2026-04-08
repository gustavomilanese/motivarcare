import { createApiClient, resolveWebAppApiBase } from "@therapy/auth";

const env = import.meta.env;

export const API_BASE = resolveWebAppApiBase({
  viteApiUrl: env.VITE_API_URL,
  isDev: env.DEV,
  forceRemoteApi: env.VITE_FORCE_REMOTE_API === "true",
  browserHostname: typeof window !== "undefined" ? window.location.hostname : "",
  injectedApiBase: undefined,
  loopbackDefault: "http://localhost:4000"
});

/** Para `<img src>` cuando el API devuelve ruta relativa (`/api/public/...`). */
export function resolveApiAssetUrl(url: string | null | undefined): string | undefined {
  const s = url?.trim();
  if (!s) {
    return undefined;
  }
  if (s.startsWith("data:")) {
    return s;
  }
  if (/^https?:\/\//i.test(s)) {
    return s;
  }
  const base = API_BASE.replace(/\/$/, "");
  return `${base}${s.startsWith("/") ? s : `/${s}`}`;
}
export const TOKEN_KEY = "therapy_admin_token";
export const USER_KEY = "therapy_admin_user";
export const LANGUAGE_KEY = "therapy_admin_language";
export const CURRENCY_KEY = "therapy_admin_currency";
export const AUTH_EXPIRED_EVENT = "therapy-admin-auth-expired";

const request = createApiClient({
  baseUrl: API_BASE,
  unauthorizedMessages: ["Invalid or expired token", "Missing bearer token"],
  onUnauthorized: () => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }
});

export async function apiRequest<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  return request<T>(path, init, token);
}
