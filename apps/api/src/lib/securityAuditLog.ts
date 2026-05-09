import { prisma } from "./prisma.js";
import type { Prisma } from "@prisma/client";

/** Valores estables para filtrar en Admin y en queries. */
export const SECURITY_AUDIT_CATEGORY = {
  AUTH_LOGIN_FAILED: "AUTH_LOGIN_FAILED",
  AUTH_LOGIN_RATE_LIMITED: "AUTH_LOGIN_RATE_LIMITED",
  AUTH_REGISTER_TURNSTILE_FAILED: "AUTH_REGISTER_TURNSTILE_FAILED",
  AUTH_REGISTER_TURNSTILE_MISSING: "AUTH_REGISTER_TURNSTILE_MISSING"
} as const;

export type SecurityAuditCategory = (typeof SECURITY_AUDIT_CATEGORY)[keyof typeof SECURITY_AUDIT_CATEGORY];

/** Enmascara email para metadata (admin ve patrón sin guardar PII completa en JSON opcional). */
export function maskEmailHint(emailLower: string): string {
  const trimmed = emailLower.trim().toLowerCase();
  const at = trimmed.indexOf("@");
  if (at <= 0) return "***";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}***@${domain}`;
}

function truncateUa(ua: string | undefined): string | null {
  if (!ua || !ua.trim()) return null;
  return ua.trim().slice(0, 512);
}

/**
 * Registro append-only; fallas silenciosas para no romper el flujo HTTP.
 */
export function writeSecurityAuditLog(params: {
  category: SecurityAuditCategory | string;
  message?: string;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}): void {
  void prisma.securityAuditLog
    .create({
      data: {
        category: params.category.slice(0, 80),
        message: params.message ? params.message.slice(0, 512) : null,
        ip: params.ip ? params.ip.slice(0, 128) : null,
        userAgent: truncateUa(params.userAgent ?? undefined),
        metadata: params.metadata === null || params.metadata === undefined ? undefined : (params.metadata as Prisma.InputJsonValue)
      }
    })
    .catch((err) => {
      console.error("[securityAuditLog] write failed", err);
    });
}
