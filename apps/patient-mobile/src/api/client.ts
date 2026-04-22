import type {
  AuthMeResponse,
  ChatMessagesResponse,
  ChatThreadsResponse,
  CreateBookingResponse,
  GoogleCalendarStatusResponse,
  LoginResponse,
  MatchingResponse,
  ProfileMeResponse,
  PurchasePackageResponse,
  RegisterResponse,
  SendChatMessageResponse,
  SessionPackagesResponse,
  BookingsMineResponse
} from "./types";
import { apiBaseUrl as API_BASE } from "./apiBase";

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
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export { apiBaseUrl } from "./apiBase";

export async function login(params: { email: string; password: string }) {
  return requestJson<LoginResponse>({
    path: "/api/auth/login",
    method: "POST",
    body: params
  });
}

export async function registerPatient(params: { email: string; password: string; fullName: string; timezone?: string }) {
  return requestJson<RegisterResponse>({
    path: "/api/auth/register",
    method: "POST",
    body: {
      email: params.email.trim().toLowerCase(),
      password: params.password,
      fullName: params.fullName.trim(),
      role: "PATIENT",
      timezone: params.timezone
    }
  });
}

export async function getAuthMe(token: string) {
  return requestJson<AuthMeResponse>({
    path: "/api/auth/me",
    token
  });
}

export async function getProfileMe(token: string) {
  return requestJson<ProfileMeResponse>({
    path: "/api/profiles/me",
    token
  });
}

export async function syncTimezone(params: { token: string; timezone: string; persistPreference?: boolean }) {
  return requestJson<{ role: string; profile: { id: string; timezone: string; lastSeenTimezone: string | null } }>({
    path: "/api/profiles/me/timezone",
    method: "PATCH",
    token: params.token,
    body: { timezone: params.timezone, persistPreference: params.persistPreference ?? true }
  });
}

export async function submitPatientIntake(params: {
  token: string;
  answers: Record<string, string>;
  residencyCountry: string;
}) {
  return requestJson<{ intake: { id: string; riskLevel: string; completedAt: string } }>({
    path: "/api/profiles/me/intake",
    method: "POST",
    token: params.token,
    body: { answers: params.answers, residencyCountry: params.residencyCountry }
  });
}

export async function getMatchingProfessionals(token: string) {
  return requestJson<MatchingResponse>({
    path: "/api/profiles/me/matching?language=es",
    token
  });
}

export async function setActiveProfessional(params: { token: string; professionalId: string | null }) {
  return requestJson<{
    patientId: string;
    activeProfessional: { id: string; userId: string; fullName: string; email: string } | null;
  }>({
    path: "/api/profiles/me/active-professional",
    method: "PATCH",
    token: params.token,
    body: { professionalId: params.professionalId }
  });
}

export async function createBooking(params: {
  token: string;
  professionalId: string;
  startsAt: string;
  endsAt: string;
  patientTimezone?: string;
}) {
  return requestJson<CreateBookingResponse>({
    path: "/api/bookings",
    method: "POST",
    token: params.token,
    body: {
      professionalId: params.professionalId,
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      patientTimezone: params.patientTimezone
    }
  });
}

export async function rescheduleMineBooking(params: {
  token: string;
  bookingId: string;
  startsAt: string;
  endsAt: string;
  patientTimezone?: string;
}) {
  return requestJson<{
    message: string;
    booking: {
      id: string;
      startsAt: string;
      endsAt: string;
      status: string;
      joinUrlPatient?: string | null;
    };
  }>({
    path: `/api/bookings/${params.bookingId}/reschedule`,
    method: "POST",
    token: params.token,
    body: {
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      ...(params.patientTimezone ? { patientTimezone: params.patientTimezone } : {})
    }
  });
}

export async function getBookingsMine(token: string) {
  return requestJson<BookingsMineResponse>({
    path: "/api/bookings/mine",
    token
  });
}

export async function getSessionPackages(params: { token: string; professionalId?: string | null; market?: "AR" | "US" }) {
  const query = new URLSearchParams({ channel: "patient", market: params.market ?? "AR" });
  if (params.professionalId) {
    query.set("professionalId", params.professionalId);
  }
  return requestJson<SessionPackagesResponse>({
    path: `/api/public/session-packages?${query.toString()}`,
    token: params.token
  });
}

export async function purchasePackage(params: { token: string; packageId: string }) {
  return requestJson<PurchasePackageResponse>({
    path: "/api/profiles/me/purchase-package",
    method: "POST",
    token: params.token,
    body: { packageId: params.packageId }
  });
}

export async function startGoogleCalendarConnect(params: {
  token: string;
  returnPath?: string;
  clientOrigin: string;
}) {
  return requestJson<{ authUrl: string }>({
    path: "/api/auth/google/calendar/connect",
    method: "POST",
    token: params.token,
    body: {
      returnPath: params.returnPath ?? "/profile",
      clientOrigin: params.clientOrigin
    }
  });
}

export async function getGoogleCalendarStatus(token: string) {
  return requestJson<GoogleCalendarStatusResponse>({
    path: "/api/auth/google/calendar/status",
    token
  });
}

export async function disconnectGoogleCalendar(token: string) {
  return requestJson<{ message: string }>({
    path: "/api/auth/google/calendar/disconnect",
    method: "POST",
    token
  });
}

export async function getChatThreads(token: string) {
  return requestJson<ChatThreadsResponse>({
    path: "/api/chat/threads",
    token
  });
}

/** Crea u obtiene el hilo paciente–profesional (solo profesionales asignados). */
export async function ensureChatThreadByProfessional(params: { token: string; professionalId: string }) {
  return requestJson<{ threadId: string }>({
    path: `/api/chat/threads/by-professional/${params.professionalId}`,
    method: "POST",
    token: params.token
  });
}

export async function getThreadMessages(params: { token: string; threadId: string; limit?: number }) {
  const query = new URLSearchParams();
  if (params.limit) {
    query.set("limit", String(params.limit));
  }
  return requestJson<ChatMessagesResponse>({
    path: `/api/chat/threads/${params.threadId}/messages${query.size ? `?${query.toString()}` : ""}`,
    token: params.token
  });
}

export async function sendThreadMessage(params: { token: string; threadId: string; body: string }) {
  return requestJson<SendChatMessageResponse>({
    path: `/api/chat/threads/${params.threadId}/messages`,
    method: "POST",
    token: params.token,
    body: { body: params.body }
  });
}

export async function markThreadAsRead(params: { token: string; threadId: string }) {
  return requestJson<{ threadId: string; markedAsRead: number }>({
    path: `/api/chat/threads/${params.threadId}/read`,
    method: "POST",
    token: params.token
  });
}
