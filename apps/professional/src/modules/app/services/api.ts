import { createApiClient } from "@therapy/auth";

export const API_BASE =
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ?? "http://localhost:4000";

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
export const PATIENT_PORTAL_URL =
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_PATIENT_PORTAL_URL ?? "http://localhost:5173";
export const TOKEN_KEY = "therapy_pro_token";
export const USER_KEY = "therapy_pro_user";
export const LANGUAGE_KEY = "therapy_pro_language";
export const CURRENCY_KEY = "therapy_pro_currency";

const request = createApiClient({ baseUrl: API_BASE });

export async function apiRequest<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  return request<T>(path, init, token);
}
