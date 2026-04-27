import crypto from "node:crypto";
import type { Role } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { sendResendEmail } from "../../lib/resendSend.js";

export const PASSWORD_RESET_TOKEN_TYPE = "password_reset";

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

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

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function resetBaseUrl(role: Role): string {
  if (role === "PROFESSIONAL") {
    return stripTrailingSlash(env.PROFESSIONAL_APP_URL);
  }
  if (role === "ADMIN") {
    return stripTrailingSlash(env.ADMIN_APP_URL);
  }
  return stripTrailingSlash(env.PATIENT_APP_URL);
}

export function buildPasswordResetLink(params: { role: Role; token: string }): string {
  const baseUrl = resetBaseUrl(params.role);
  const query = new URLSearchParams({ token: params.token }).toString();
  return `${baseUrl}/reset-password?${query}`;
}

function buildResetEmailHtml(params: { fullName: string; link: string; ttlMinutes: number }): string {
  const name = escapeHtml(params.fullName.trim() || "there");
  const hrefAttr = escapeHtmlAttr(params.link);
  const linkText = escapeHtml(params.link);
  const ttl = escapeHtml(String(params.ttlMinutes));

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#eef0f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef0f9;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;">
<tr><td style="padding:28px;text-align:center;">
<p style="margin:0;font-size:13px;font-weight:700;color:#5f44eb;">MotivarCare</p>
<h1 style="margin:12px 0 0;font-size:22px;color:#0f1731;">Recuperar contraseña</h1>
<p style="margin:16px 0 0;font-size:16px;color:#3d4a63;">Hola ${name},</p>
<p style="margin:12px 0 0;font-size:16px;color:#3d4a63;">Recibimos una solicitud para restablecer tu contraseña. Si fuiste vos, usá el botón de abajo.</p>
<p style="margin:24px 0 0;"><a href="${hrefAttr}" style="display:inline-block;padding:14px 28px;background:#5f44eb;color:#fff;text-decoration:none;border-radius:14px;font-weight:700;">Nueva contraseña</a></p>
<p style="margin:20px 0 0;font-size:13px;color:#62708a;">El enlace vence en <strong>${ttl} minutos</strong>.</p>
<p style="margin:16px 0 0;font-size:12px;color:#94a3b8;word-break:break-all;">${linkText}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export async function createPasswordResetToken(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await prisma.verificationToken.deleteMany({
    where: { userId, type: PASSWORD_RESET_TOKEN_TYPE }
  });

  await prisma.verificationToken.create({
    data: {
      userId,
      token,
      type: PASSWORD_RESET_TOKEN_TYPE,
      expiresAt
    }
  });

  return { token, expiresAt };
}

export async function sendPasswordResetEmail(params: { fullName: string; email: string; role: Role; token: string }) {
  const link = buildPasswordResetLink({ role: params.role, token: params.token });
  const ttlMinutes = Math.round(PASSWORD_RESET_TTL_MS / 60000);
  const resendKey = env.RESEND_API_KEY?.trim();

  if (resendKey) {
    const subject = "Recuperá tu contraseña — MotivarCare";
    const text = [`Hola ${params.fullName},`, "", "Para elegir una nueva contraseña:", link, "", `Vence en ${ttlMinutes} minutos.`].join("\n");

    await sendResendEmail({
      to: params.email,
      subject,
      text,
      html: buildResetEmailHtml({ fullName: params.fullName, link, ttlMinutes })
    });

    return { delivered: true as const, link };
  }

  console.log(
    JSON.stringify({
      level: "info",
      event: "password_reset_link_generated",
      email: params.email,
      role: params.role,
      link,
      ttlMinutes,
      hint: "Set RESEND_API_KEY to send real emails"
    })
  );

  return { delivered: false as const, link };
}

export async function consumePasswordResetToken(
  token: string,
  newPasswordHash: string
): Promise<{ ok: true } | { ok: false; reason: "invalid_token" | "expired_token" }> {
  const stored = await prisma.verificationToken.findUnique({
    where: { token },
    include: { user: { select: { id: true } } }
  });

  if (!stored || stored.type !== PASSWORD_RESET_TOKEN_TYPE) {
    return { ok: false, reason: "invalid_token" };
  }

  if (stored.expiresAt.getTime() < Date.now()) {
    await prisma.verificationToken.deleteMany({ where: { userId: stored.userId, type: PASSWORD_RESET_TOKEN_TYPE } });
    return { ok: false, reason: "expired_token" };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: stored.user.id },
      data: { passwordHash: newPasswordHash }
    }),
    prisma.verificationToken.deleteMany({
      where: { userId: stored.userId, type: PASSWORD_RESET_TOKEN_TYPE }
    })
  ]);

  return { ok: true };
}
