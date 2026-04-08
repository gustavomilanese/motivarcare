import { resolveWebAppApiBase } from "@therapy/auth";
import type {
  FinanceOverviewResponse,
  FinancePayoutRunDetailResponse,
  FinancePayoutRunsResponse,
  FinanceRules,
  FinanceStripeOpsResponse
} from "../types/finance.types";

type ApiErrorPayload = { error?: string };

const env = import.meta.env;
const API_BASE = resolveWebAppApiBase({
  viteApiUrl: env.VITE_API_URL,
  isDev: env.DEV,
  forceRemoteApi: env.VITE_FORCE_REMOTE_API === "true",
  browserHostname: typeof window !== "undefined" ? window.location.hostname : "",
  preferRelativeSameOriginInDev: true,
  injectedApiBase: undefined,
  loopbackDefault: "http://localhost:4000"
});
const TOKEN_KEY = "therapy_admin_token";
const USER_KEY = "therapy_admin_user";
const AUTH_EXPIRED_EVENT = "therapy-admin-auth-expired";

async function apiRequest<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;

    try {
      const payload = (await response.json()) as ApiErrorPayload;
      if (payload.error) {
        errorMessage = payload.error;
      }
    } catch {
      // noop
    }

    if (response.status === 401 && (errorMessage === "Invalid or expired token" || errorMessage === "Missing bearer token")) {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

export async function fetchFinanceSettings(token: string): Promise<FinanceRules> {
  const response = await apiRequest<{ rules: FinanceRules }>("/api/admin/finance/settings", token);
  return response.rules;
}

export async function patchFinanceSettings(token: string, rules: FinanceRules): Promise<FinanceRules> {
  const response = await apiRequest<{ rules: FinanceRules }>("/api/admin/finance/settings", token, {
    method: "PATCH",
    body: JSON.stringify(rules)
  });
  return response.rules;
}

export async function fetchFinanceOverview(token: string, query: string): Promise<FinanceOverviewResponse> {
  return apiRequest<FinanceOverviewResponse>(`/api/admin/finance/overview?${query}`, token);
}

export async function fetchPayoutRuns(token: string, query: string): Promise<FinancePayoutRunsResponse> {
  return apiRequest<FinancePayoutRunsResponse>(`/api/admin/finance/payouts/runs?${query}`, token);
}

export async function fetchPayoutRunDetail(token: string, runId: string): Promise<FinancePayoutRunDetailResponse["run"]> {
  const response = await apiRequest<FinancePayoutRunDetailResponse>(`/api/admin/finance/payouts/runs/${runId}`, token);
  return response.run;
}

export async function rebuildFinanceSessionRecords(token: string): Promise<{ processed: number }> {
  return apiRequest<{ processed: number; message: string }>("/api/admin/finance/rebuild-session-records", token, {
    method: "POST"
  });
}

export async function createPayoutRun(token: string, input: { periodStart: string; periodEnd: string; notes?: string }): Promise<{ id: string }> {
  const idempotencyKey = `payout-${input.periodStart}-${input.periodEnd}`;
  const response = await apiRequest<{ run: { id: string } }>("/api/admin/finance/payouts/runs", token, {
    method: "POST",
    headers: { "X-Idempotency-Key": idempotencyKey },
    body: JSON.stringify(input)
  });
  return response.run;
}

export async function markPayoutLinePaid(token: string, lineId: string): Promise<void> {
  await apiRequest<unknown>(`/api/admin/finance/payouts/lines/${lineId}/mark-paid`, token, { method: "POST" });
}

export async function closePayoutRun(token: string, runId: string): Promise<void> {
  await apiRequest<unknown>(`/api/admin/finance/payouts/runs/${runId}/close`, token, { method: "POST" });
}

export async function fetchStripeOperations(token: string, query: string): Promise<FinanceStripeOpsResponse> {
  return apiRequest<FinanceStripeOpsResponse>(`/api/admin/finance/stripe/events?${query}`, token);
}

export async function retryStripeEvent(token: string, eventId: string): Promise<void> {
  await apiRequest<unknown>(`/api/admin/finance/stripe/events/${eventId}/retry`, token, { method: "POST" });
}
