import { createApiClient } from "@therapy/auth";

export const STORAGE_KEY = "therapy_patient_portal_v3";
export const API_BASE =
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ?? "http://localhost:4000";

const request = createApiClient({ baseUrl: API_BASE });

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  return request<T>(path, options, token);
}
