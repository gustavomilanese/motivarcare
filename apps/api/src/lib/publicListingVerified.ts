import { ProfessionalRegistrationApproval } from "@prisma/client";

/**
 * Launch rule: Admin approval is the public “Verificado” badge.
 * Split later by returning `stripeVerified` only.
 */
export function isPublicListingVerified(params: {
  registrationApproval: ProfessionalRegistrationApproval | string | null | undefined;
}): boolean {
  return params.registrationApproval === ProfessionalRegistrationApproval.APPROVED
    || params.registrationApproval === "APPROVED";
}

export function stripeVerifiedForRegistrationApproval(
  registrationApproval: ProfessionalRegistrationApproval | string
): boolean {
  return isPublicListingVerified({ registrationApproval });
}
