import { createApiClient } from "@therapy/auth";

export const STORAGE_KEY = "therapy_patient_portal_v3";
export const API_BASE =
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ?? "http://localhost:4000";

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
  return request<T>(path, options, token);
}
