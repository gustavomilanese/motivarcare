import { apiBaseUrl as API_BASE } from "./apiBase";
import type {
  AuthMeResponse,
  AvailabilitySlot,
  CalendarStatus,
  DashboardResponse,
  EarningsResponse,
  LoginResponse,
  PatientDetailResponse,
  PatientListItem,
  ProfessionalProfile,
  ThreadMessage,
  ThreadSummary,
  TreatmentReportDetail,
  TreatmentReportListItem
} from "./types";

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | undefined;

export function setApiUnauthorizedHandler(handler: UnauthorizedHandler | undefined): void {
  unauthorizedHandler = handler;
}

async function requestJson<T>(params: {
  path: string;
  token?: string | null;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
}): Promise<T> {
  const response = await fetch(`${API_BASE}${params.path}`, {
    method: params.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(params.token ? { Authorization: `Bearer ${params.token}` } : {})
    },
    body: params.body ? JSON.stringify(params.body) : undefined
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload?.error) {
        message = payload.error;
      }
    } catch {
      // noop
    }
    if (params.token && response.status === 401) {
      unauthorizedHandler?.();
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export { apiBaseUrl } from "./apiBase";

export function login(params: { email: string; password: string }) {
  return requestJson<LoginResponse>({
    path: "/api/auth/login",
    method: "POST",
    body: params
  });
}

export function getAuthMe(token: string) {
  return requestJson<AuthMeResponse>({ path: "/api/auth/me", token });
}

export function getDashboard(token: string) {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  return requestJson<DashboardResponse>({
    path: `/api/professional/dashboard?statsAll=1&statsTo=${encodeURIComponent(to.toISOString())}`,
    token
  });
}

export function completeBooking(token: string, bookingId: string) {
  return requestJson<{ message: string }>({
    path: `/api/bookings/${bookingId}/complete`,
    token,
    method: "POST",
    body: {}
  });
}

export function uncompleteBooking(token: string, bookingId: string) {
  return requestJson<{ message: string }>({
    path: `/api/bookings/${bookingId}/uncomplete`,
    token,
    method: "POST",
    body: {}
  });
}

export function getPatients(token: string) {
  return requestJson<{ patients: PatientListItem[] }>({
    path: "/api/professional/patients",
    token
  });
}

export function getEarnings(token: string, page = 1) {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  return requestJson<EarningsResponse>({
    path: `/api/professional/earnings?statsAll=1&statsTo=${encodeURIComponent(to.toISOString())}&movementsPage=${page}&movementsPageSize=25`,
    token
  });
}

export function getAvailabilitySlots(token: string) {
  return requestJson<{ slots: AvailabilitySlot[] }>({
    path: "/api/availability/me/slots",
    token
  });
}

export function createAvailabilitySlot(
  token: string,
  body: { startsAt: string; endsAt: string; source?: string; isBlocked?: boolean }
) {
  return requestJson<{ slot: AvailabilitySlot }>({
    path: "/api/availability/slots",
    token,
    method: "POST",
    body
  });
}

export function deleteAvailabilitySlot(token: string, slotId: string) {
  return requestJson<{ message: string }>({
    path: `/api/availability/slots/${slotId}`,
    token,
    method: "DELETE"
  });
}

export function getChatThreads(token: string) {
  return requestJson<{ threads: ThreadSummary[] }>({
    path: "/api/chat/threads",
    token
  });
}

export function getThreadMessages(token: string, threadId: string) {
  return requestJson<{ messages: ThreadMessage[] }>({
    path: `/api/chat/threads/${threadId}/messages`,
    token
  });
}

export function markThreadRead(token: string, threadId: string) {
  return requestJson<{ markedAsRead: number }>({
    path: `/api/chat/threads/${threadId}/read`,
    token,
    method: "POST",
    body: {}
  });
}

export function sendThreadMessage(token: string, threadId: string, body: string) {
  return requestJson<{ message: ThreadMessage }>({
    path: `/api/chat/threads/${threadId}/messages`,
    token,
    method: "POST",
    body: { body }
  });
}

export function getPatientDetail(token: string, patientId: string) {
  return requestJson<PatientDetailResponse>({
    path: `/api/professional/patients/${encodeURIComponent(patientId)}`,
    token
  });
}

export function getPatientDiaryEntries(token: string, patientId: string) {
  return requestJson<{ entries: Array<{ id: string; title: string; mood: string; publishedAt: string | null; whatHappened: string; moodLabelEs?: string }> }>({
    path: `/api/professional/patients/${encodeURIComponent(patientId)}/emotional-diary`,
    token
  });
}

export function getPatientDiarySummary(token: string, patientId: string) {
  return requestJson<{ headline: string; summary: string; entryCount: number }>({
    path: `/api/professional/patients/${encodeURIComponent(patientId)}/emotional-diary/summary`,
    token
  });
}

export function getTreatmentReports(token: string) {
  return requestJson<{ items: TreatmentReportListItem[] }>({
    path: "/api/professional/treatment-reports",
    token
  });
}

export function getTreatmentReportDetail(token: string, patientId: string) {
  return requestJson<TreatmentReportDetail>({
    path: `/api/professional/treatment-reports/${encodeURIComponent(patientId)}`,
    token
  });
}

export function getMyProfile(token: string) {
  return requestJson<{ role: string; profile: ProfessionalProfile | null }>({
    path: "/api/profiles/me",
    token
  });
}

export function patchPublicProfile(
  token: string,
  professionalId: string,
  body: { cancellationHours?: number; sessionPriceUsd?: number | null }
) {
  return requestJson<{ message: string }>({
    path: `/api/profiles/professional/${professionalId}/public-profile`,
    token,
    method: "PATCH",
    body
  });
}

export function getCalendarStatus(token: string) {
  return requestJson<CalendarStatus>({
    path: "/api/auth/google/calendar/status",
    token
  });
}

export function startCalendarConnect(token: string, params: { clientOrigin: string; returnPath: string }) {
  return requestJson<{ authUrl: string }>({
    path: "/api/auth/google/calendar/connect",
    token,
    method: "POST",
    body: { ...params, language: "es" }
  });
}

export function disconnectCalendar(token: string) {
  return requestJson<{ message: string }>({
    path: "/api/auth/google/calendar/disconnect",
    token,
    method: "POST",
    body: {}
  });
}

export function changePassword(token: string, body: { currentPassword: string; newPassword: string; confirmPassword: string }) {
  return requestJson<{ message: string }>({
    path: "/api/auth/change-password",
    token,
    method: "POST",
    body
  });
}
