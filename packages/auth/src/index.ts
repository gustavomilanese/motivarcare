export interface ApiErrorShape {
  error?: string;
}

export interface ApiRequestJsonParams {
  baseUrl: string;
  path: string;
  token?: string | null;
  init?: RequestInit;
  onUnauthorized?: () => void;
  unauthorizedMessages?: string[];
}

export interface ApiClientConfig {
  baseUrl: string;
  onUnauthorized?: () => void;
  unauthorizedMessages?: string[];
}

export type ApiClient = <T>(path: string, init?: RequestInit, token?: string | null) => Promise<T>;

export async function apiRequestJson<T>(params: ApiRequestJsonParams): Promise<T> {
  const response = await fetch(`${params.baseUrl}${params.path}`, {
    ...params.init,
    headers: {
      "Content-Type": "application/json",
      ...(params.token ? { Authorization: `Bearer ${params.token}` } : {}),
      ...(params.init?.headers ?? {})
    }
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;

    try {
      const payload = (await response.json()) as ApiErrorShape;
      if (payload?.error) {
        errorMessage = payload.error;
      }
    } catch {
      // ignore parse error
    }

    if (response.status === 401) {
      const unauthorizedMessages = params.unauthorizedMessages ?? [];
      if (unauthorizedMessages.length === 0 || unauthorizedMessages.includes(errorMessage)) {
        params.onUnauthorized?.();
      }
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  return async function request<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
    return apiRequestJson<T>({
      baseUrl: config.baseUrl,
      path,
      token,
      init,
      onUnauthorized: config.onUnauthorized,
      unauthorizedMessages: config.unauthorizedMessages
    });
  };
}

export function detectBrowserTimezone(fallback = "UTC"): string {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && detected.trim().length > 0) {
      return detected;
    }
  } catch {
    // ignore runtime / platform issues
  }
  return fallback;
}

export async function syncUserTimezone(params: {
  baseUrl: string;
  token: string;
  timezone: string;
  persistPreference: boolean;
}): Promise<void> {
  await apiRequestJson<{
    role: "PATIENT" | "PROFESSIONAL" | "ADMIN";
    profile: { id: string; timezone: string; lastSeenTimezone: string | null };
  }>({
    baseUrl: params.baseUrl,
    path: "/api/profiles/me/timezone",
    token: params.token,
    init: {
      method: "PATCH",
      body: JSON.stringify({
        timezone: params.timezone,
        persistPreference: params.persistPreference
      })
    }
  });
}
