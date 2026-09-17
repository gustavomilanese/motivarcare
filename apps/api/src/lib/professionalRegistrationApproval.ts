import { ProfessionalRegistrationApproval } from "@prisma/client";

/** Estados que bloquean el portal completo (agenda, matching, etc.). */
export function isRegistrationPortalBlocked(
  status: ProfessionalRegistrationApproval | string | null | undefined
): boolean {
  return (
    status === ProfessionalRegistrationApproval.INCOMPLETE
    || status === ProfessionalRegistrationApproval.IN_REVIEW
    || status === ProfessionalRegistrationApproval.NEEDS_CHANGES
    || status === ProfessionalRegistrationApproval.REJECTED
    || status === "INCOMPLETE"
    || status === "IN_REVIEW"
    || status === "NEEDS_CHANGES"
    || status === "REJECTED"
    // Legacy (pre-migración)
    || status === "PENDING"
  );
}

/** Cola de revisión admin (enviados + correcciones pendientes). */
export function isInAdminReviewQueue(
  status: ProfessionalRegistrationApproval | string | null | undefined
): boolean {
  return (
    status === ProfessionalRegistrationApproval.IN_REVIEW
    || status === ProfessionalRegistrationApproval.NEEDS_CHANGES
    || status === "IN_REVIEW"
    || status === "NEEDS_CHANGES"
    || status === "PENDING"
  );
}

export function canResumeOnboardingWizard(
  status: ProfessionalRegistrationApproval | string | null | undefined
): boolean {
  return status === ProfessionalRegistrationApproval.INCOMPLETE || status === "INCOMPLETE";
}

export function canCompleteRegistrationDocuments(
  status: ProfessionalRegistrationApproval | string | null | undefined
): boolean {
  return (
    status === ProfessionalRegistrationApproval.IN_REVIEW
    || status === ProfessionalRegistrationApproval.NEEDS_CHANGES
    || status === "IN_REVIEW"
    || status === "NEEDS_CHANGES"
    || status === "PENDING"
  );
}

/** El profesional puede volver a cola de revisión desde estos estados. */
export function canResubmitForReview(
  status: ProfessionalRegistrationApproval | string | null | undefined
): boolean {
  return (
    status === ProfessionalRegistrationApproval.INCOMPLETE
    || status === ProfessionalRegistrationApproval.NEEDS_CHANGES
    || status === "INCOMPLETE"
    || status === "NEEDS_CHANGES"
  );
}

export function normalizeRegistrationApproval(
  status: ProfessionalRegistrationApproval | string | null | undefined
): ProfessionalRegistrationApproval | null {
  if (!status) {
    return null;
  }
  if (status === "PENDING") {
    return ProfessionalRegistrationApproval.IN_REVIEW;
  }
  if (
    status === ProfessionalRegistrationApproval.INCOMPLETE
    || status === ProfessionalRegistrationApproval.IN_REVIEW
    || status === ProfessionalRegistrationApproval.NEEDS_CHANGES
    || status === ProfessionalRegistrationApproval.APPROVED
    || status === ProfessionalRegistrationApproval.REJECTED
  ) {
    return status;
  }
  if (
    status === "INCOMPLETE"
    || status === "IN_REVIEW"
    || status === "NEEDS_CHANGES"
    || status === "APPROVED"
    || status === "REJECTED"
  ) {
    return status as ProfessionalRegistrationApproval;
  }
  return null;
}
