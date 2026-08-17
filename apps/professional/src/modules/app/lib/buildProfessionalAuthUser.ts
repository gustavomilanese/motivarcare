import type { AuthUser } from "../types";

export type AuthMeUserPayload = {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  emailVerified: boolean;
  role: "PATIENT" | "PROFESSIONAL" | "ADMIN";
  professionalProfileId: string | null;
  avatarUrl?: string | null;
  registrationApproval?: "PENDING" | "APPROVED" | "REJECTED";
  profileCreatedAt?: string | null;
};

export function buildProfessionalAuthUser(payload: AuthMeUserPayload): AuthUser | null {
  if (payload.role !== "PROFESSIONAL" || !payload.professionalProfileId) {
    return null;
  }
  return {
    id: payload.id,
    fullName: payload.fullName,
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    emailVerified: payload.emailVerified,
    role: "PROFESSIONAL",
    professionalProfileId: payload.professionalProfileId,
    avatarUrl: payload.avatarUrl ?? null,
    registrationApproval: payload.registrationApproval,
    profileCreatedAt: payload.profileCreatedAt ?? null
  };
}

export function isRegistrationPortalBlocked(user: Pick<AuthUser, "registrationApproval"> | null): boolean {
  return user?.registrationApproval === "PENDING" || user?.registrationApproval === "REJECTED";
}
