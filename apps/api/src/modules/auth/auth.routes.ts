import { Router, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { google } from "googleapis";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { sendApiError } from "../../lib/http.js";
import { authLoginRateLimiter } from "../../lib/rateLimiter.js";
import { createAuthToken, hashPassword, requireAuth, type AuthenticatedRequest, verifyPassword } from "../../lib/auth.js";
import { env } from "../../config/env.js";
import {
  consumeEmailVerificationToken,
  createEmailVerificationToken,
  EMAIL_VERIFICATION_TOKEN_TYPE,
  isEmailVerificationRequiredForRole,
  isEmailVerificationSupportedRole,
  sendEmailVerificationEmail
} from "./emailVerification.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.enum(["PATIENT", "PROFESSIONAL", "ADMIN"]),
  timezone: z.string().optional(),
  isTestUser: z.boolean().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const avatarImageSourceSchema = z
  .string()
  .trim()
  .max(20_000_000)
  .refine((value) => value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:image/"), {
    message: "Invalid avatar image source"
  });

const updateMeSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  avatarUrl: z.union([avatarImageSourceSchema, z.null()]).optional()
});

const googleCalendarConnectSchema = z.object({
  returnPath: z.string().trim().min(1).max(200).optional(),
  /** Actual browser origin (e.g. alternate Vite port) so post-OAuth redirect preserves localStorage. */
  clientOrigin: z.string().trim().max(128).optional()
});

function getTrustedBrowserOrigins(): Set<string> {
  const out = new Set<string>();
  for (const raw of env.CORS_ORIGINS.split(",")) {
    const piece = raw.trim().replace(/\/+$/, "");
    if (piece.length > 0) {
      out.add(piece);
    }
  }
  for (const url of [env.PATIENT_APP_URL, env.PROFESSIONAL_APP_URL, env.ADMIN_APP_URL]) {
    const piece = url.trim().replace(/\/+$/, "");
    if (piece.length > 0) {
      out.add(piece);
    }
  }
  return out;
}

function normalizeBrowserOrigin(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    if (parsed.hash || parsed.username || parsed.password || parsed.search) {
      return null;
    }
    if (parsed.pathname !== "" && parsed.pathname !== "/") {
      return null;
    }
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

const allowedLocalHostsForCalendar = new Set(["localhost", "127.0.0.1", "::1"]);

function getMobileCalendarOriginPrefixes(): string[] {
  return env.PATIENT_MOBILE_CALENDAR_ORIGIN_PREFIXES.split(",")
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 0);
}

function isTrustedMobileCalendarOrigin(clientOrigin: string | null | undefined): boolean {
  if (!clientOrigin) {
    return false;
  }
  const trimmed = clientOrigin.trim();
  for (const prefix of getMobileCalendarOriginPrefixes()) {
    if (trimmed.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

function isTrustedCalendarClientOrigin(role: "PATIENT" | "PROFESSIONAL" | "ADMIN", clientOrigin: string | null | undefined): boolean {
  if (!clientOrigin) {
    return false;
  }
  if (role === "PATIENT" && isTrustedMobileCalendarOrigin(clientOrigin)) {
    return true;
  }
  const normalized = normalizeBrowserOrigin(clientOrigin);
  if (!normalized) {
    return false;
  }
  // Match CORS behavior in app.ts: any localhost port works in development.
  if (env.NODE_ENV !== "production") {
    try {
      const parsed = new URL(normalized);
      if (
        (parsed.protocol === "http:" || parsed.protocol === "https:")
        && allowedLocalHostsForCalendar.has(parsed.hostname)
      ) {
        return true;
      }
    } catch {
      return false;
    }
  }
  return getTrustedBrowserOrigins().has(normalized);
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(8).max(120),
    confirmPassword: z.string().min(8).max(120)
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

function shapeUserResponse(user: {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: "PATIENT" | "PROFESSIONAL" | "ADMIN";
  emailVerified: boolean;
  patient: { id: string } | null;
  professional: { id: string } | null;
}) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    emailVerified: user.emailVerified,
    patientProfileId: user.patient?.id ?? null,
    professionalProfileId: user.professional?.id ?? null
  };
}

export const authRouter = Router();
const GOOGLE_CALENDAR_CONNECT_TOKEN_TYPE = "google_calendar_connect";
const GOOGLE_CALENDAR_STATE_COOKIE_NAME = "mc_gcal_state";
const GOOGLE_CALENDAR_RETURN_PATH_COOKIE_NAME = "mc_gcal_return";
const GOOGLE_CALENDAR_SCOPE = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email"
];

function getRequestIp(req: Request): string {
  return req.ip || req.socket?.remoteAddress || "unknown";
}

const verifyEmailQuerySchema = z.object({
  token: z.string().trim().min(32).max(256)
});

function authResponseMeta(role: "PATIENT" | "PROFESSIONAL" | "ADMIN") {
  return {
    emailVerificationRequired: isEmailVerificationRequiredForRole(role),
    devEmailVerificationBypassEnabled: env.NODE_ENV === "development"
  };
}

function hasGoogleCalendarOauthConfig(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

function getGoogleOauthRedirectUri(): string {
  return `${env.API_PUBLIC_URL.replace(/\/+$/, "")}/api/auth/google/calendar/callback`;
}

function createGoogleOauthClient() {
  return new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, getGoogleOauthRedirectUri());
}

function resolveAppRedirectForRole(role: "PATIENT" | "PROFESSIONAL" | "ADMIN"): string {
  if (role === "PROFESSIONAL") {
    return env.PROFESSIONAL_APP_URL;
  }
  if (role === "PATIENT") {
    return env.PATIENT_APP_URL;
  }
  return env.ADMIN_APP_URL;
}

function resolveDefaultCalendarReturnPathForRole(role: "PATIENT" | "PROFESSIONAL" | "ADMIN"): string {
  if (role === "PROFESSIONAL") {
    return "/";
  }
  if (role === "PATIENT") {
    return "/profile";
  }
  return "/";
}

function isAllowedCalendarReturnPath(role: "PATIENT" | "PROFESSIONAL" | "ADMIN", path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) {
    return false;
  }

  if (role === "PATIENT") {
    return path === "/profile" || path === "/onboarding/final/matching";
  }
  if (role === "PROFESSIONAL") {
    return path === "/" || path === "/ajustes";
  }
  return path === "/";
}

function sanitizeCalendarReturnPath(role: "PATIENT" | "PROFESSIONAL" | "ADMIN", rawPath: string | null | undefined): string {
  if (!rawPath) {
    return resolveDefaultCalendarReturnPathForRole(role);
  }

  return isAllowedCalendarReturnPath(role, rawPath)
    ? rawPath
    : resolveDefaultCalendarReturnPathForRole(role);
}

function buildOauthCallbackRedirect(params: {
  role: "PATIENT" | "PROFESSIONAL" | "ADMIN";
  status: "connected" | "error" | "cancelled";
  reason?: string;
  userId?: string;
  returnPath?: string;
  /** Browser origin or mobile deep-link base saved at connect time (optional). */
  clientOrigin?: string | null;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set("calendar_sync", params.status);
  if (params.reason) {
    searchParams.set("calendar_reason", params.reason);
  }
  if (params.userId) {
    searchParams.set("calendar_user_id", params.userId);
  }

  const co = params.clientOrigin?.trim();
  if (co && isTrustedCalendarClientOrigin(params.role, co)) {
    if (isTrustedMobileCalendarOrigin(co)) {
      const join = co.includes("?") ? "&" : "?";
      return `${co}${join}${searchParams.toString()}`;
    }
    const normalizedBrowser = normalizeBrowserOrigin(co);
    if (normalizedBrowser) {
      const rolePath = sanitizeCalendarReturnPath(params.role, params.returnPath);
      return `${normalizedBrowser}${rolePath}?${searchParams.toString()}`;
    }
  }

  const fallbackBase = resolveAppRedirectForRole(params.role).replace(/\/+$/, "");
  const rolePath = sanitizeCalendarReturnPath(params.role, params.returnPath);
  return `${fallbackBase}${rolePath}?${searchParams.toString()}`;
}

function getCookieValue(req: Request, name: string): string | null {
  const rawHeader = req.headers.cookie;
  if (!rawHeader) {
    return null;
  }

  const entries = rawHeader.split(";");
  for (const entry of entries) {
    const [rawName, ...rawValue] = entry.trim().split("=");
    if (rawName !== name) {
      continue;
    }
    const value = rawValue.join("=");
    if (!value) {
      return null;
    }
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return null;
}

function setGoogleCalendarStateCookie(res: Response, value: string | null): void {
  const secureDirective = env.NODE_ENV === "production" ? "; Secure" : "";
  if (value) {
    res.append(
      "Set-Cookie",
      `${GOOGLE_CALENDAR_STATE_COOKIE_NAME}=${encodeURIComponent(value)}; Max-Age=900; Path=/; HttpOnly; SameSite=Lax${secureDirective}`
    );
    return;
  }

  res.append(
    "Set-Cookie",
    `${GOOGLE_CALENDAR_STATE_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secureDirective}`
  );
}

function setGoogleCalendarReturnPathCookie(res: Response, value: string | null): void {
  const secureDirective = env.NODE_ENV === "production" ? "; Secure" : "";
  if (value) {
    res.append(
      "Set-Cookie",
      `${GOOGLE_CALENDAR_RETURN_PATH_COOKIE_NAME}=${encodeURIComponent(value)}; Max-Age=900; Path=/; HttpOnly; SameSite=Lax${secureDirective}`
    );
    return;
  }

  res.append(
    "Set-Cookie",
    `${GOOGLE_CALENDAR_RETURN_PATH_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secureDirective}`
  );
}

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email already in use" });
  }

  const passwordHash = hashPassword(parsed.data.password);
  const isTestUser = env.NODE_ENV !== "production" && parsed.data.isTestUser === true;

  const created = await prisma.user.create({
    data: {
      email,
      fullName: parsed.data.fullName.trim(),
      role: parsed.data.role,
      passwordHash,
      isTestUser,
      patient:
        parsed.data.role === "PATIENT"
          ? {
              create: {
                timezone: parsed.data.timezone ?? "America/New_York",
                lastSeenTimezone: parsed.data.timezone ?? "America/New_York"
              }
            }
          : undefined,
      professional:
        parsed.data.role === "PROFESSIONAL"
          ? {
              create: {
                timezone: parsed.data.timezone ?? "America/New_York",
                lastSeenTimezone: parsed.data.timezone ?? "America/New_York",
                visible: true,
                cancellationHours: 24
              }
            }
          : undefined,
      admin: parsed.data.role === "ADMIN" ? { create: {} } : undefined
    },
    include: {
      patient: { select: { id: true } },
      professional: { select: { id: true } }
    }
  });

  let verificationEmailSent = false;
  if (isEmailVerificationSupportedRole(created.role)) {
    try {
      const verificationToken = await createEmailVerificationToken({
        userId: created.id,
        replaceExisting: true
      });

      const deliveryResult = await sendEmailVerificationEmail({
        fullName: created.fullName,
        email: created.email,
        role: created.role,
        token: verificationToken.token
      });

      verificationEmailSent = deliveryResult.delivered;
    } catch (verificationError) {
      console.error("Could not send email verification link", verificationError);
    }
  }

  const token = createAuthToken({
    userId: created.id,
    role: created.role,
    email: created.email
  });

  return res.status(201).json({
    token,
    user: shapeUserResponse(created),
    verificationEmailSent,
    ...authResponseMeta(created.role)
  });
});

authRouter.post("/google/calendar/connect", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!hasGoogleCalendarOauthConfig()) {
    return res.status(503).json({
      error: "Google Calendar OAuth is not configured",
      code: "GOOGLE_CALENDAR_OAUTH_NOT_CONFIGURED"
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.auth.userId },
    select: { id: true, role: true }
  });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const parsedConnectPayload = googleCalendarConnectSchema.safeParse(req.body ?? {});
  if (!parsedConnectPayload.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsedConnectPayload.error.flatten() });
  }
  const returnPath = sanitizeCalendarReturnPath(user.role, parsedConnectPayload.data.returnPath);
  const rawClientOrigin = parsedConnectPayload.data.clientOrigin;
  let calendarClientOrigin: string | null = null;
  if (rawClientOrigin && isTrustedCalendarClientOrigin(user.role, rawClientOrigin)) {
    calendarClientOrigin = isTrustedMobileCalendarOrigin(rawClientOrigin)
      ? rawClientOrigin.trim()
      : normalizeBrowserOrigin(rawClientOrigin);
  }

  await prisma.verificationToken.deleteMany({
    where: {
      userId: user.id,
      type: GOOGLE_CALENDAR_CONNECT_TOKEN_TYPE
    }
  });

  const stateToken = `gcal_${randomUUID()}_${Date.now()}`;
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      token: stateToken,
      type: GOOGLE_CALENDAR_CONNECT_TOKEN_TYPE,
      expiresAt: new Date(Date.now() + 1000 * 60 * 15),
      calendarReturnPath: returnPath,
      calendarClientOrigin
    }
  });

  const oauth2Client = createGoogleOauthClient();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_CALENDAR_SCOPE,
    include_granted_scopes: true,
    state: stateToken
  });

  setGoogleCalendarStateCookie(res, stateToken);
  setGoogleCalendarReturnPathCookie(res, returnPath);
  return res.json({ authUrl });
});

authRouter.get("/google/calendar/callback", async (req, res) => {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const oauthError = typeof req.query.error === "string" ? req.query.error : "";

  if (!state) {
    setGoogleCalendarStateCookie(res, null);
    setGoogleCalendarReturnPathCookie(res, null);
    return res.status(400).json({ error: "Missing OAuth state" });
  }

  const stateToken = await prisma.verificationToken.findFirst({
    where: {
      token: state,
      type: GOOGLE_CALENDAR_CONNECT_TOKEN_TYPE
    },
    include: {
      user: {
        select: { role: true, id: true }
      }
    }
  });

  if (!stateToken || stateToken.expiresAt.getTime() < Date.now()) {
    setGoogleCalendarStateCookie(res, null);
    setGoogleCalendarReturnPathCookie(res, null);
    return res.status(400).json({ error: "Invalid or expired OAuth state" });
  }

  const returnPath = sanitizeCalendarReturnPath(
    stateToken.user.role,
    stateToken.calendarReturnPath ?? getCookieValue(req, GOOGLE_CALENDAR_RETURN_PATH_COOKIE_NAME)
  );
  const oauthClientOrigin =
    stateToken.calendarClientOrigin &&
    isTrustedCalendarClientOrigin(stateToken.user.role, stateToken.calendarClientOrigin)
      ? stateToken.calendarClientOrigin
      : null;
  // OAuth `state` is validated against this DB row (one-time). Relying on SameSite cookies from the
  // connect POST often fails for cross-origin fetch (5173 -> 4000), which incorrectly sent users to login.
  const stateCookie = getCookieValue(req, GOOGLE_CALENDAR_STATE_COOKIE_NAME);
  if (stateCookie && stateCookie !== state) {
    console.warn("Google calendar OAuth state cookie mismatch (ignored; DB state is authoritative)", {
      hasCookie: Boolean(stateCookie)
    });
  }

  await prisma.verificationToken.delete({
    where: { id: stateToken.id }
  });

  const redirectWithCookieClear = (params: {
    role: "PATIENT" | "PROFESSIONAL" | "ADMIN";
    status: "connected" | "error" | "cancelled";
    reason?: string;
    userId?: string;
    returnPath?: string;
    clientOrigin?: string | null;
  }) => {
    setGoogleCalendarStateCookie(res, null);
    setGoogleCalendarReturnPathCookie(res, null);
    return res.redirect(buildOauthCallbackRedirect(params));
  };

  if (oauthError) {
    return redirectWithCookieClear({
      role: stateToken.user.role,
      status: oauthError === "access_denied" ? "cancelled" : "error",
      reason: oauthError,
      userId: stateToken.user.id,
      returnPath,
      clientOrigin: oauthClientOrigin
    });
  }

  if (!code) {
    return redirectWithCookieClear({
      role: stateToken.user.role,
      status: "error",
      reason: "missing_code",
      userId: stateToken.user.id,
      returnPath,
      clientOrigin: oauthClientOrigin
    });
  }

  try {
    const oauth2Client = createGoogleOauthClient();
    const tokenResponse = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokenResponse.tokens);

    const userInfo = await google.oauth2({ version: "v2", auth: oauth2Client }).userinfo.get();
    const providerEmail = typeof userInfo.data.email === "string" ? userInfo.data.email : null;

    const existingConnection = await prisma.googleCalendarConnection.findUnique({
      where: { userId: stateToken.user.id }
    });
    const resolvedRefreshToken = tokenResponse.tokens.refresh_token ?? existingConnection?.refreshToken ?? "";
    if (!resolvedRefreshToken) {
      return redirectWithCookieClear({
        role: stateToken.user.role,
        status: "error",
        reason: "missing_refresh_token",
        userId: stateToken.user.id,
        returnPath,
        clientOrigin: oauthClientOrigin
      });
    }

    await prisma.googleCalendarConnection.upsert({
      where: { userId: stateToken.user.id },
      create: {
        userId: stateToken.user.id,
        provider: "google",
        calendarId: "primary",
        providerEmail,
        refreshToken: resolvedRefreshToken,
        accessToken: tokenResponse.tokens.access_token ?? null,
        scope: tokenResponse.tokens.scope ?? null,
        tokenExpiresAt: tokenResponse.tokens.expiry_date ? new Date(tokenResponse.tokens.expiry_date) : null
      },
      update: {
        provider: "google",
        calendarId: "primary",
        providerEmail,
        refreshToken: resolvedRefreshToken,
        accessToken: tokenResponse.tokens.access_token ?? null,
        scope: tokenResponse.tokens.scope ?? existingConnection?.scope ?? null,
        tokenExpiresAt: tokenResponse.tokens.expiry_date ? new Date(tokenResponse.tokens.expiry_date) : null
      }
    });

    return redirectWithCookieClear({
      role: stateToken.user.role,
      status: "connected",
      userId: stateToken.user.id,
      returnPath,
      clientOrigin: oauthClientOrigin
    });
  } catch (error) {
    console.error("Could not complete Google Calendar OAuth callback", error);
    return redirectWithCookieClear({
      role: stateToken.user.role,
      status: "error",
      reason: "oauth_exchange_failed",
      userId: stateToken.user.id,
      returnPath,
      clientOrigin: oauthClientOrigin
    });
  }
});

authRouter.get("/google/calendar/status", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { userId: req.auth.userId },
    select: {
      providerEmail: true,
      calendarId: true,
      connectedAt: true,
      updatedAt: true
    }
  });

  return res.json({
    connected: Boolean(connection),
    connection: connection
      ? {
          provider: "google",
          providerEmail: connection.providerEmail,
          calendarId: connection.calendarId,
          connectedAt: connection.connectedAt,
          updatedAt: connection.updatedAt
        }
      : null
  });
});

authRouter.post("/google/calendar/disconnect", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await prisma.googleCalendarConnection.deleteMany({
    where: { userId: req.auth.userId }
  });

  return res.json({ message: "Google Calendar disconnected" });
});

authRouter.post("/login", async (req, res) => {
  const requestIp = getRequestIp(req);
  const attemptedEmail = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "invalid";

  try {
    const [ipLimit, emailLimit] = await Promise.all([
      authLoginRateLimiter.consume(`ip:${requestIp}`),
      authLoginRateLimiter.consume(`email:${attemptedEmail}`)
    ]);

    const blocked = !ipLimit.allowed || !emailLimit.allowed;
    if (blocked) {
      const retryAfterSeconds = Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return sendApiError({
        res,
        status: 429,
        code: "TOO_MANY_REQUESTS",
        message: "Too many login attempts. Please retry later."
      });
    }
  } catch {
    return sendApiError({
      res,
      status: 503,
      code: "SERVICE_UNAVAILABLE",
      message: "Login protection unavailable. Retry shortly."
    });
  }

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid credentials payload" });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      patient: { select: { id: true } },
      professional: { select: { id: true } }
    }
  });

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (!user.isActive) {
    return res.status(403).json({ error: "User account is disabled" });
  }

  const token = createAuthToken({
    userId: user.id,
    role: user.role,
    email: user.email
  });

  return res.json({
    token,
    user: shapeUserResponse(user),
    ...authResponseMeta(user.role)
  });
});

authRouter.get("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.auth.userId },
    include: {
      patient: { select: { id: true } },
      professional: { select: { id: true } }
    }
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json({
    user: shapeUserResponse(user),
    ...authResponseMeta(user.role)
  });
});

authRouter.patch("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const updated = await prisma.user.update({
    where: { id: req.auth.userId },
    data: {
      ...(parsed.data.fullName !== undefined ? { fullName: parsed.data.fullName } : {}),
      ...(parsed.data.avatarUrl !== undefined ? { avatarUrl: parsed.data.avatarUrl } : {})
    },
    include: {
      patient: { select: { id: true } },
      professional: { select: { id: true } }
    }
  });

  return res.json({
    message: "Profile updated",
    user: shapeUserResponse(updated),
    ...authResponseMeta(updated.role)
  });
});

authRouter.post("/change-password", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.auth.userId }
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (!verifyPassword(parsed.data.currentPassword, user.passwordHash)) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return res.status(400).json({ error: "New password must be different" });
  }

  await prisma.user.update({
    where: { id: req.auth.userId },
    data: {
      passwordHash: hashPassword(parsed.data.newPassword)
    }
  });

  return res.json({
    message: "Password updated"
  });
});

authRouter.get("/verify-email", async (req, res) => {
  const parsed = verifyEmailQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendApiError({
      res,
      status: 400,
      code: "BAD_REQUEST",
      message: "Invalid verification token"
    });
  }

  const result = await consumeEmailVerificationToken(parsed.data.token);
  if (!result.ok) {
    return sendApiError({
      res,
      status: 400,
      code: "BAD_REQUEST",
      message: result.reason === "expired_token" ? "Verification token expired" : "Invalid verification token"
    });
  }

  return res.json({
    message: "Email verified",
    userId: result.userId,
    email: result.email,
    role: result.role
  });
});

authRouter.post("/email-verification/resend", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return sendApiError({
      res,
      status: 401,
      code: "UNAUTHORIZED",
      message: "Unauthorized"
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.auth.userId },
    include: {
      patient: { select: { id: true } },
      professional: { select: { id: true } }
    }
  });

  if (!user) {
    return sendApiError({
      res,
      status: 404,
      code: "NOT_FOUND",
      message: "User not found"
    });
  }

  if (!isEmailVerificationSupportedRole(user.role)) {
    return res.json({
      message: "Email verification not required for this role",
      user: shapeUserResponse(user),
      ...authResponseMeta(user.role)
    });
  }

  if (user.emailVerified) {
    return res.json({
      message: "Email already verified",
      user: shapeUserResponse(user),
      ...authResponseMeta(user.role)
    });
  }

  const verificationToken = await createEmailVerificationToken({
    userId: user.id,
    replaceExisting: true
  });

  let deliveryResult: Awaited<ReturnType<typeof sendEmailVerificationEmail>>;
  try {
    deliveryResult = await sendEmailVerificationEmail({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      token: verificationToken.token
    });
  } catch (sendError) {
    console.error("Could not send email verification link", sendError);
    return sendApiError({
      res,
      status: 502,
      code: "INTERNAL_ERROR",
      message: "Could not send verification email"
    });
  }

  if (!deliveryResult.delivered) {
    return sendApiError({
      res,
      status: 503,
      code: "SERVICE_UNAVAILABLE",
      message:
        "Email delivery is not configured on the server (missing RESEND_API_KEY). Ask the administrator to configure Resend."
    });
  }

  return res.json({
    message: "Verification email sent",
    expiresAt: verificationToken.expiresAt.toISOString(),
    user: shapeUserResponse(user),
    ...authResponseMeta(user.role)
  });
});

authRouter.post("/email-verification/dev-verify", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth) {
    return sendApiError({
      res,
      status: 401,
      code: "UNAUTHORIZED",
      message: "Unauthorized"
    });
  }

  if (env.NODE_ENV !== "development") {
    return sendApiError({
      res,
      status: 403,
      code: "FORBIDDEN",
      message: "Dev verification is only available in development"
    });
  }

  const updated = await prisma.user.update({
    where: { id: req.auth.userId },
    data: {
      emailVerified: true
    },
    include: {
      patient: { select: { id: true } },
      professional: { select: { id: true } }
    }
  });

  await prisma.verificationToken.deleteMany({
    where: {
      userId: req.auth.userId,
      type: EMAIL_VERIFICATION_TOKEN_TYPE
    }
  });

  return res.json({
    message: "Email verified in development mode",
    user: shapeUserResponse(updated),
    ...authResponseMeta(updated.role)
  });
});
