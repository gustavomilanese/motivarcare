import { createApiClient } from "@therapy/auth";

export const API_BASE =
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ?? "http://localhost:4000";
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
