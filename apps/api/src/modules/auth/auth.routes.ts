import { Router, type Request } from "express";
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
  timezone: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const updateMeSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional()
});

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
  role: "PATIENT" | "PROFESSIONAL" | "ADMIN";
  emailVerified: boolean;
  patient: { id: string } | null;
  professional: { id: string } | null;
}) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    emailVerified: user.emailVerified,
    patientProfileId: user.patient?.id ?? null,
    professionalProfileId: user.professional?.id ?? null
  };
}

export const authRouter = Router();

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

  const created = await prisma.user.create({
    data: {
      email,
      fullName: parsed.data.fullName.trim(),
      role: parsed.data.role,
      passwordHash,
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
      ...(parsed.data.fullName !== undefined ? { fullName: parsed.data.fullName } : {})
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

  await sendEmailVerificationEmail({
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    token: verificationToken.token
  });

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
