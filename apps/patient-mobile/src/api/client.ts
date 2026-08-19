import type {
  AuthMeResponse,
  ChatMessagesResponse,
  ChatThreadsResponse,
  CreateBookingResponse,
  GoogleCalendarStatusResponse,
  LoginResponse,
  MatchingResponse,
  MatchingSlot,
  ProfileMeResponse,
  PurchasePackageResponse,
  RegisterResponse,
  SendChatMessageResponse,
  SessionPackagesResponse,
  BookingsMineResponse
} from "./types";
import { apiBaseUrl as API_BASE } from "./apiBase";

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | undefined;

export function setApiUnauthorizedHandler(handler: UnauthorizedHandler | undefined): void {
  unauthorizedHandler = handler;
}

function isUnauthorizedMessage(status: number, message: string): boolean {
  if (status === 401) {
    return true;
  }
  const normalized = message.toLowerCase();
  return (
    normalized.includes("invalid or expired token")
    || normalized.includes("missing bearer token")
    || normalized.includes("unauthorized")
  );
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
    if (params.token && isUnauthorizedMessage(response.status, message)) {
      unauthorizedHandler?.();
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export { apiBaseUrl } from "./apiBase";

export async function login(params: { email: string; password: string; timezone?: string }) {
  return requestJson<LoginResponse>({
    path: "/api/auth/login",
    method: "POST",
    body: params
  });
}

export async function registerPatient(params: {
  email: string;
  password: string;
  fullName: string;
  timezone?: string;
  residencyCountry: string;
}) {
  return requestJson<RegisterResponse>({
    path: "/api/auth/register",
    method: "POST",
    body: {
      email: params.email.trim().toLowerCase(),
      password: params.password,
      fullName: params.fullName.trim(),
      role: "PATIENT",
      timezone: params.timezone,
      residencyCountry: params.residencyCountry.trim().toUpperCase()
    }
  });
}

export async function getAuthMe(token: string) {
  return requestJson<AuthMeResponse>({
    path: "/api/auth/me",
    token
  });
}

export async function forgotPassword(params: { email: string }) {
  return requestJson<{ ok: boolean }>({
    path: "/api/auth/forgot-password",
    method: "POST",
    body: { email: params.email.trim().toLowerCase(), role: "PATIENT" }
  });
}

export async function resetPassword(params: { token: string; password: string }) {
  return requestJson<{ ok: boolean }>({
    path: "/api/auth/reset-password",
    method: "POST",
    body: { token: params.token, password: params.password }
  });
}

export async function resendEmailVerification(token: string) {
  return requestJson<{ message: string }>({
    path: "/api/auth/email-verification/resend",
    method: "POST",
    token
  });
}

export async function verifyEmailToken(token: string) {
  return requestJson<LoginResponse & { message?: string }>({
    path: `/api/auth/verify-email?token=${encodeURIComponent(token)}`
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
  const answers = Object.fromEntries(
    Object.entries(params.answers)
      .map(([key, value]) => [key, value.trim()] as const)
      .filter(([, value]) => value.length > 0)
  );
  return requestJson<{ intake: { id: string; riskLevel: string; completedAt: string } }>({
    path: "/api/profiles/me/intake",
    method: "POST",
    token: params.token,
    body: { answers, residencyCountry: params.residencyCountry }
  });
}

export async function requestPatientSafetyReferral(params: {
  token: string;
  residencyCountry?: string;
  language?: "es" | "en" | "pt";
}) {
  return requestJson<{
    emailDelivered: boolean;
    resources: { countryName: string; resources: { label: string; contact: string }[] } | null;
  }>({
    path: "/api/profiles/me/safety-referral",
    method: "POST",
    token: params.token,
    body: {
      ...(params.residencyCountry ? { residencyCountry: params.residencyCountry } : {}),
      ...(params.language ? { language: params.language } : {})
    }
  });
}

export async function getMatchingProfessionals(token: string) {
  return requestJson<MatchingResponse>({
    path: "/api/profiles/me/matching?language=es",
    token
  });
}

/** Disponibilidad live del profesional (no el snapshot embebido en matching). */
export async function getProfessionalAvailabilitySlots(params: {
  token: string;
  professionalId: string;
  from?: Date;
  to?: Date;
}) {
  const from = params.from ?? new Date();
  const to = params.to ?? new Date(from.getTime());
  if (!params.to) {
    to.setDate(to.getDate() + 45);
  }
  return requestJson<{
    professionalId: string;
    minimumBookingNoticeHours?: number;
    slots: MatchingSlot[];
  }>({
    path: `/api/availability/${encodeURIComponent(params.professionalId)}/slots?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
    token: params.token
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
  holdId?: string;
  preferTrialCredit?: boolean;
  idempotencyKey?: string;
}) {
  return requestJson<CreateBookingResponse>({
    path: "/api/bookings",
    method: "POST",
    token: params.token,
    body: {
      professionalId: params.professionalId,
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      patientTimezone: params.patientTimezone,
      ...(params.holdId ? { holdId: params.holdId } : {}),
      ...(params.preferTrialCredit ? { preferTrialCredit: true } : {}),
      ...(params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : {})
    }
  });
}

export async function acquireBookingSlotHold(params: {
  token: string;
  professionalId: string;
  startsAt: string;
  endsAt: string;
}) {
  return requestJson<{ holdId: string; expiresAt: string; ttlSeconds: number }>({
    path: "/api/bookings/slot-holds",
    method: "POST",
    token: params.token,
    body: {
      professionalId: params.professionalId,
      startsAt: params.startsAt,
      endsAt: params.endsAt
    }
  });
}

export async function releaseBookingSlotHold(params: { token: string; holdId: string }) {
  return requestJson<void>({
    path: `/api/bookings/slot-holds/${encodeURIComponent(params.holdId)}`,
    method: "DELETE",
    token: params.token
  });
}

export async function createDlocalTrialCheckout(params: {
  token: string;
  professionalId: string;
  startsAt: string;
  endsAt: string;
  holdId: string;
  patientTimezone?: string;
  idempotencyKey: string;
  successUrl: string;
  cancelUrl: string;
}) {
  return requestJson<{ checkoutUrl: string; paymentId?: string; orderId?: string }>({
    path: "/api/payments/dlocal/checkout-trial",
    method: "POST",
    token: params.token,
    body: {
      professionalId: params.professionalId,
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      holdId: params.holdId,
      patientTimezone: params.patientTimezone,
      idempotencyKey: params.idempotencyKey,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl
    }
  });
}

export async function getPublicFeatures() {
  return requestJson<{ intakeChatEnabled?: boolean; treatmentChatEnabled?: boolean }>({
    path: "/api/public/features"
  });
}

export async function startOrResumeIntakeChat(token: string) {
  return requestJson<{
    session: {
      sessionId: string;
      status: string;
      messages: Array<{ role: "assistant" | "user"; content: string; ts: string; quickReplies?: string[] }>;
      extractedAnswers: Record<string, string>;
      residencyCountry: string | null;
      isResume: boolean;
      readyToSubmit: boolean;
      canSubmitEarly: boolean;
      safetyFlagged: boolean;
      safetyAlertMessage?: string;
      quota: { turnsUsed: number; turnsRemaining: number; estimatedCostUsdCents: number };
    };
  }>({
    path: "/api/intake-chat/sessions",
    method: "POST",
    token,
    body: {}
  });
}

export async function fetchActiveIntakeChatSession(token: string) {
  try {
    return await requestJson<{
      session: {
        sessionId: string;
        status: string;
        messages: Array<{ role: "assistant" | "user"; content: string; ts: string; quickReplies?: string[] }>;
        extractedAnswers: Record<string, string>;
        residencyCountry: string | null;
        isResume: boolean;
        readyToSubmit: boolean;
        canSubmitEarly: boolean;
        safetyFlagged: boolean;
        safetyAlertMessage?: string;
        quota: { turnsUsed: number; turnsRemaining: number; estimatedCostUsdCents: number };
      };
    }>({
      path: "/api/intake-chat/sessions/active",
      token
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/not\s*found|404|no hay sesi/i.test(message)) {
      return null;
    }
    throw error;
  }
}

export async function sendIntakeChatMessage(params: {
  token: string;
  sessionId: string;
  message: string;
}) {
  return requestJson<{
    session: {
      sessionId: string;
      status: string;
      messages: Array<{ role: "assistant" | "user"; content: string; ts: string; quickReplies?: string[] }>;
      extractedAnswers: Record<string, string>;
      residencyCountry: string | null;
      isResume: boolean;
      readyToSubmit: boolean;
      canSubmitEarly: boolean;
      safetyFlagged: boolean;
      safetyAlertMessage?: string;
      quota: { turnsUsed: number; turnsRemaining: number; estimatedCostUsdCents: number };
      lastAssistantMessage: string;
      safetyTriggeredThisTurn: boolean;
    };
  }>({
    path: `/api/intake-chat/sessions/${encodeURIComponent(params.sessionId)}/messages`,
    method: "POST",
    token: params.token,
    body: { message: params.message }
  });
}

export async function submitIntakeChatSession(params: {
  token: string;
  sessionId: string;
  mode?: "full" | "early";
}) {
  return requestJson<{
    ok?: boolean;
    riskBlocked?: boolean;
    intake?: unknown;
  }>({
    path: `/api/intake-chat/sessions/${encodeURIComponent(params.sessionId)}/submit`,
    method: "POST",
    token: params.token,
    body: { mode: params.mode ?? "full" }
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

export async function getSessionPackages(params: {
  token: string;
  professionalId?: string | null;
  market?: "AR" | "US";
}) {
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

export async function cancelMineBooking(params: { token: string; bookingId: string; reason: string }) {
  return requestJson<{ refundedCredits: number; trialCreditReleased?: boolean }>({
    path: `/api/bookings/${params.bookingId}/cancel`,
    method: "POST",
    token: params.token,
    body: { reason: params.reason.trim() }
  });
}

export async function createDlocalPackageCheckout(params: {
  token: string;
  packageId: string;
  idempotencyKey: string;
  successUrl: string;
  cancelUrl: string;
  timezone?: string;
}) {
  return requestJson<{ checkoutUrl: string; paymentId?: string; orderId?: string }>({
    path: "/api/payments/dlocal/checkout",
    method: "POST",
    token: params.token,
    body: {
      packageId: params.packageId,
      idempotencyKey: params.idempotencyKey,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      ...(params.timezone ? { timezone: params.timezone } : {})
    }
  });
}

export async function syncDlocalPayment(params: {
  token: string;
  paymentId?: string | null;
  orderId?: string | null;
}) {
  const paymentId = params.paymentId?.trim() || null;
  const orderId = params.orderId?.trim() || null;
  if (paymentId) {
    return requestJson<{ ok: boolean; fulfilled: boolean; paymentStatus: string }>({
      path: "/api/payments/dlocal/sync-payment",
      method: "POST",
      token: params.token,
      body: { paymentId }
    });
  }
  if (orderId) {
    return requestJson<{ ok: boolean; fulfilled: boolean; paymentStatus: string }>({
      path: "/api/payments/dlocal/sync-order",
      method: "POST",
      token: params.token,
      body: { orderId }
    });
  }
  return requestJson<{ ok: boolean; fulfilled: boolean; paymentStatus?: string | null }>({
    path: "/api/payments/dlocal/sync-pending",
    method: "POST",
    token: params.token,
    body: {}
  });
}

export async function getPaymentCheckouts(token: string) {
  return requestJson<{
    checkouts: Array<{
      id: string;
      status: string;
      kind?: string | null;
      packageName?: string | null;
      sessionCount?: number | null;
      amountMajor?: number | null;
      currency?: string | null;
      createdAt: string;
      paidAt?: string | null;
    }>;
  }>({
    path: "/api/profiles/me/payment-checkouts",
    token
  });
}

export async function fetchWebContent(params?: { audience?: "patient" }) {
  const query = params?.audience ? `?audience=${encodeURIComponent(params.audience)}` : "";
  return requestJson<{
    exercises?: import("../wellbeing/types").ExercisePost[];
    exerciseRoutines?: import("../wellbeing/types").ExerciseRoutine[];
    relaxationPlaylists?: import("../wellbeing/types").RelaxationPlaylistItem[];
  }>({
    path: `/api/public/web-content${query}`
  });
}

export async function fetchDiarySettings(token: string) {
  return requestJson<{ settings: import("../wellbeing/types").EmotionalDiarySettings }>({
    path: "/api/emotional-diary/settings",
    token
  });
}

export async function patchDiarySettings(params: {
  token: string;
  shareWithPsychologistDefault: boolean;
}) {
  return requestJson<{ settings: import("../wellbeing/types").EmotionalDiarySettings }>({
    path: "/api/emotional-diary/settings",
    method: "PATCH",
    token: params.token,
    body: { shareWithPsychologistDefault: params.shareWithPsychologistDefault }
  });
}

export async function fetchDiaryEntries(params: {
  token: string;
  status?: import("../wellbeing/types").EmotionalDiaryEntryStatus;
}) {
  const query = params.status ? `?status=${encodeURIComponent(params.status)}` : "";
  return requestJson<{ entries: import("../wellbeing/types").EmotionalDiaryEntry[] }>({
    path: `/api/emotional-diary/entries${query}`,
    token: params.token
  });
}

export async function createDiaryEntry(params: {
  token: string;
  input: import("../wellbeing/types").CreateDiaryEntryInput;
}) {
  return requestJson<{ entry: import("../wellbeing/types").EmotionalDiaryEntry }>({
    path: "/api/emotional-diary/entries",
    method: "POST",
    token: params.token,
    body: params.input
  });
}

export async function fetchDiaryStats(token: string) {
  return requestJson<{ stats: import("../wellbeing/types").EmotionalDiaryStats }>({
    path: "/api/emotional-diary/stats",
    token
  });
}

export async function fetchDiarySessionSummary(token: string) {
  return requestJson<import("../wellbeing/types").EmotionalDiarySessionSummary>({
    path: "/api/emotional-diary/session-summary",
    token
  });
}

export async function sendDiarySessionSummary(token: string) {
  return requestJson<import("@therapy/types").EmotionalDiarySessionReportSendResult>({
    path: "/api/emotional-diary/session-summary/send",
    method: "POST",
    token,
    body: {}
  });
}

export type TreatmentChatDto = {
  chatId: string;
  status: "active" | "archived";
  messages: Array<{
    id: string;
    role: "assistant" | "user";
    content: string;
    createdAt: string;
    safetySeverity?: "none" | "low" | "high" | null;
  }>;
  safetyFlagged: boolean;
  safetyAlertMessage?: string;
  quota: {
    dailyTurnsUsed: number;
    dailyTurnsRemaining: number;
    estimatedCostUsdCents: number;
  };
  professionalShareConsent: boolean;
  session: {
    maxMinutes: number;
    minutesRemaining: number;
    sessionActive: boolean;
  };
};

export async function fetchTreatmentChatConversation(token: string) {
  return requestJson<{ chat: TreatmentChatDto }>({
    path: "/api/treatment-chat/conversation",
    token
  });
}

export async function sendTreatmentChatMessage(params: { token: string; message: string }) {
  return requestJson<{
    chat: TreatmentChatDto & {
      lastAssistantMessage: string;
      safetyTriggeredThisTurn: boolean;
    };
  }>({
    path: "/api/treatment-chat/messages",
    method: "POST",
    token: params.token,
    body: { message: params.message, stream: false }
  });
}

export async function setTreatmentChatConsent(params: { token: string; consent: boolean }) {
  return requestJson<{ consent: boolean; consentAt: string | null }>({
    path: "/api/treatment-chat/consent",
    method: "POST",
    token: params.token,
    body: { consent: params.consent }
  });
}

export async function patchNotificationPreferences(params: {
  token: string;
  notificationsEmail?: boolean;
  notificationsReminder?: boolean;
}) {
  return requestJson<{
    role: string;
    profile: { id: string; notificationsEmail: boolean; notificationsReminder: boolean };
  }>({
    path: "/api/profiles/me/notification-preferences",
    method: "PATCH",
    token: params.token,
    body: {
      ...(params.notificationsEmail !== undefined
        ? { notificationsEmail: params.notificationsEmail }
        : {}),
      ...(params.notificationsReminder !== undefined
        ? { notificationsReminder: params.notificationsReminder }
        : {})
    }
  });
}

export async function requestProfessionalChange(params: {
  token: string;
  reason?: string;
  language?: "es" | "en" | "pt";
}) {
  return requestJson<{ ok?: boolean; message?: string }>({
    path: "/api/profiles/me/support-requests/professional-change",
    method: "POST",
    token: params.token,
    body: {
      ...(params.reason ? { reason: params.reason } : {}),
      language: params.language ?? "es"
    }
  });
}

export async function registerPushToken(params: {
  token: string;
  expoPushToken: string;
  platform: "ios" | "android" | "unknown";
}) {
  return requestJson<{ ok: boolean }>({
    path: "/api/profiles/me/push-token",
    method: "POST",
    token: params.token,
    body: {
      expoPushToken: params.expoPushToken,
      platform: params.platform
    }
  });
}

