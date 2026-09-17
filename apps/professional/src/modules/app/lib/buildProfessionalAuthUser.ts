import type { AuthUser } from "../types";

export type RegistrationApprovalStatus =
  | "INCOMPLETE"
  | "IN_REVIEW"
  | "NEEDS_CHANGES"
  | "APPROVED"
  | "REJECTED"
  /** Legacy pre-migración */
  | "PENDING";

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
  registrationApproval?: RegistrationApprovalStatus;
  registrationRejectionReason?: string | null;
  profileCreatedAt?: string | null;
};

function normalizeApproval(
  status: RegistrationApprovalStatus | undefined
): Exclude<RegistrationApprovalStatus, "PENDING"> | undefined {
  if (!status) {
    return undefined;
  }
  if (status === "PENDING") {
    return "IN_REVIEW";
  }
  return status;
}

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
    registrationApproval: normalizeApproval(payload.registrationApproval),
    registrationRejectionReason: payload.registrationRejectionReason ?? null,
    profileCreatedAt: payload.profileCreatedAt ?? null
  };
}

export function isRegistrationPortalBlocked(
  user: Pick<AuthUser, "registrationApproval"> | null
): boolean {
  const status = user?.registrationApproval;
  return (
    status === "INCOMPLETE"
    || status === "IN_REVIEW"
    || status === "NEEDS_CHANGES"
    || status === "REJECTED"
    || status === "PENDING"
  );
}

export function canResumeIncompleteRegistration(
  user: Pick<AuthUser, "registrationApproval"> | null
): boolean {
  return user?.registrationApproval === "INCOMPLETE";
}

export function canCompleteRegistrationDocuments(
  user: Pick<AuthUser, "registrationApproval"> | null
): boolean {
  const status = user?.registrationApproval;
  return status === "IN_REVIEW" || status === "NEEDS_CHANGES" || status === "PENDING";
}
