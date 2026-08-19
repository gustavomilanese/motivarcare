import type { Market } from "@prisma/client";
import {
  DLOCAL_CHECKOUT_UNAVAILABLE_ERROR,
  resolveDlocalPayerCountry,
  resolveHealedDlocalResidencyCountry
} from "@therapy/types";

export type PatientDlocalCheckoutIdentity = {
  market: Market;
  residencyCountry: string | null;
  timezone?: string | null;
  lastSeenTimezone?: string | null;
};

export function resolvePatientDlocalPayerCountry(patient: PatientDlocalCheckoutIdentity): string | null {
  return resolveDlocalPayerCountry({
    residencyCountry: patient.residencyCountry,
    market: patient.market,
    timezone: patient.lastSeenTimezone || patient.timezone
  });
}

export function assertPatientDlocalCheckoutAllowed(patient: PatientDlocalCheckoutIdentity): string {
  const payerCountry = resolvePatientDlocalPayerCountry(patient);
  if (!payerCountry) {
    throw new Error(DLOCAL_CHECKOUT_UNAVAILABLE_ERROR);
  }
  return payerCountry;
}

export function healedResidencyForPatient(patient: PatientDlocalCheckoutIdentity): string | null {
  return resolveHealedDlocalResidencyCountry({
    existingResidency: patient.residencyCountry,
    timezone: patient.lastSeenTimezone || patient.timezone
  });
}
