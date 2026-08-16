/** Roles that public `POST /auth/register` may create. Admins are seed / Admin console only. */
export const PUBLIC_REGISTER_ROLES = ["PATIENT", "PROFESSIONAL"] as const;
export type PublicRegisterRole = (typeof PUBLIC_REGISTER_ROLES)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Normalizes `role` from a JSON body (case-insensitive). */
export function requestedRegisterRole(body: unknown): string | null {
  if (!isRecord(body)) {
    return null;
  }
  const role = body.role;
  if (typeof role !== "string") {
    return null;
  }
  const normalized = role.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

export function isPublicRegisterRole(role: string | null): role is PublicRegisterRole {
  return role === "PATIENT" || role === "PROFESSIONAL";
}

/** Privilege escalation attempt against public register. */
export function isBlockedPublicRegisterRole(role: string | null): boolean {
  return role === "ADMIN";
}
