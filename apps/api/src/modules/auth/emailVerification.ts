import crypto from "node:crypto";
import type { Role } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";

export const EMAIL_VERIFICATION_TOKEN_TYPE = "email_verification";

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function getVerificationBaseUrl(role: Role): string {
  if (role === "PROFESSIONAL") {
    return stripTrailingSlash(env.PROFESSIONAL_APP_URL);
  }
  if (role === "ADMIN") {
    return stripTrailingSlash(env.ADMIN_APP_URL);
  }
  return stripTrailingSlash(env.PATIENT_APP_URL);
}

export function buildEmailVerificationLink(params: { role: Role; token: string }): string {
  const baseUrl = getVerificationBaseUrl(params.role);
  const query = new URLSearchParams({ token: params.token }).toString();
  return `${baseUrl}/verify-email?${query}`;
}

export function isEmailVerificationRequiredForRole(role: Role): boolean {
  if (!isEmailVerificationSupportedRole(role)) {
    return false;
  }
  return env.EMAIL_VERIFICATION_REQUIRED;
}

export function isEmailVerificationSupportedRole(role: Role): boolean {
  return role === "PATIENT" || role === "PROFESSIONAL";
}

export async function createEmailVerificationToken(params: { userId: string; replaceExisting?: boolean }) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000);

  if (params.replaceExisting) {
    await prisma.verificationToken.deleteMany({
      where: {
        userId: params.userId,
        type: EMAIL_VERIFICATION_TOKEN_TYPE
      }
    });
  }

  const createdToken = await prisma.verificationToken.create({
    data: {
      userId: params.userId,
      token,
      type: EMAIL_VERIFICATION_TOKEN_TYPE,
      expiresAt
    }
  });

  return {
    token: createdToken.token,
    expiresAt: createdToken.expiresAt
  };
}

export async function sendEmailVerificationEmail(params: {
  fullName: string;
  email: string;
  role: Role;
  token: string;
}) {
  const link = buildEmailVerificationLink({
    role: params.role,
    token: params.token
  });

  if (env.RESEND_API_KEY) {
    const subject = "Verifica tu email en MotivarCare";
    const text = [
      `Hola ${params.fullName},`,
      "",
      "Para continuar, verifica tu email desde este enlace:",
      link,
      "",
      `Este enlace vence en ${env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS} horas.`
    ].join("\n");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: params.email,
        subject,
        html: `<p>Hola ${params.fullName},</p><p>Para continuar, verifica tu email desde este enlace:</p><p><a href="${link}">${link}</a></p><p>Este enlace vence en ${env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS} horas.</p>`,
        text
      })
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Could not deliver verification email: ${details}`);
    }
  } else {
    console.log(
      JSON.stringify({
        level: "info",
        event: "email_verification_link_generated",
        email: params.email,
        fullName: params.fullName,
        role: params.role,
        link,
        expiresInHours: env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS,
        timestamp: new Date().toISOString()
      })
    );
  }

  return {
    delivered: true,
    link
  };
}

export async function consumeEmailVerificationToken(token: string): Promise<
  | { ok: true; userId: string; email: string; role: Role }
  | { ok: false; reason: "invalid_token" | "expired_token" }
> {
  const storedToken = await prisma.verificationToken.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true
        }
      }
    }
  });

  if (!storedToken || storedToken.type !== EMAIL_VERIFICATION_TOKEN_TYPE) {
    return {
      ok: false,
      reason: "invalid_token"
    };
  }

  if (storedToken.expiresAt.getTime() < Date.now()) {
    await prisma.verificationToken.deleteMany({
      where: {
        userId: storedToken.userId,
        type: EMAIL_VERIFICATION_TOKEN_TYPE
      }
    });

    return {
      ok: false,
      reason: "expired_token"
    };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: storedToken.userId },
      data: {
        emailVerified: true
      }
    }),
    prisma.verificationToken.deleteMany({
      where: {
        userId: storedToken.userId,
        type: EMAIL_VERIFICATION_TOKEN_TYPE
      }
    })
  ]);

  return {
    ok: true,
    userId: storedToken.user.id,
    email: storedToken.user.email,
    role: storedToken.user.role
  };
}
