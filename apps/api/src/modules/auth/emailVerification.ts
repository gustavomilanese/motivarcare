import crypto from "node:crypto";
import type { Role } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";

export const EMAIL_VERIFICATION_TOKEN_TYPE = "email_verification";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeHtmlAttr(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function buildVerificationEmailHtml(params: { fullName: string; link: string; ttlHours: number }): string {
  const name = escapeHtml(params.fullName.trim() || "there");
  const hrefAttr = escapeHtmlAttr(params.link);
  const linkText = escapeHtml(params.link);
  const ttl = escapeHtml(String(params.ttlHours));

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#eef0f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef0f9;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 12px 40px rgba(56,52,92,0.1);">
<tr><td style="padding:28px 28px 8px 28px;text-align:center;">
<p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.06em;color:#5f44eb;text-transform:uppercase;">MotivarCare</p>
</td></tr>
<tr><td style="padding:8px 28px 4px 28px;text-align:center;">
<h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:800;color:#0f1731;">Verifica tu correo</h1>
</td></tr>
<tr><td style="padding:12px 28px 8px 28px;text-align:center;">
<p style="margin:0;font-size:16px;line-height:1.55;color:#3d4a63;">Hola ${name},</p>
<p style="margin:14px 0 0 0;font-size:16px;line-height:1.55;color:#3d4a63;">Para activar tu cuenta y continuar, usa el botón de abajo. Si no pediste este correo, puedes ignorarlo.</p>
</td></tr>
<tr><td style="padding:24px 28px 8px 28px;text-align:center;">
<a href="${hrefAttr}" style="display:inline-block;padding:14px 32px;background-color:#5f44eb;color:#ffffff;text-decoration:none;border-radius:14px;font-size:16px;font-weight:700;box-shadow:0 8px 24px rgba(95,68,235,0.35);">Verificar mi email</a>
</td></tr>
<tr><td style="padding:20px 28px 28px 28px;text-align:center;">
<p style="margin:0;font-size:13px;line-height:1.5;color:#62708a;">Este enlace vence en <strong style="color:#1f2b40;">${ttl} horas</strong>.</p>
<p style="margin:16px 0 0 0;font-size:12px;line-height:1.45;color:#94a3b8;word-break:break-all;">Si el botón no funciona, copia y pega este enlace en el navegador:<br><span style="color:#5f44eb;">${linkText}</span></p>
</td></tr>
</table>
<p style="margin:20px 0 0 0;font-size:12px;color:#94a3b8;text-align:center;">© MotivarCare · Terapia online</p>
</td></tr>
</table>
</body>
</html>`;
}

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

  const resendKey = env.RESEND_API_KEY?.trim();
  if (resendKey) {
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
        Authorization: `Bearer ${resendKey}`
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: params.email,
        subject,
        html: buildVerificationEmailHtml({
          fullName: params.fullName,
          link,
          ttlHours: env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS
        }),
        text
      })
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Could not deliver verification email: ${details}`);
    }

    return {
      delivered: true,
      link
    };
  }

  console.log(
    JSON.stringify({
      level: "info",
      event: "email_verification_link_generated",
      email: params.email,
      fullName: params.fullName,
      role: params.role,
      link,
      expiresInHours: env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS,
      hint: "Set RESEND_API_KEY to send real emails",
      timestamp: new Date().toISOString()
    })
  );

  return {
    delivered: false,
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
