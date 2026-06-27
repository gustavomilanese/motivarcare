import type { Market } from "@prisma/client";
import {
  DLOCAL_CHECKOUT_UNAVAILABLE_ERROR,
  resolveDlocalPayerCountry
} from "@therapy/types";

export type PatientDlocalCheckoutIdentity = {
  market: Market;
  residencyCountry: string | null;
};

export function resolvePatientDlocalPayerCountry(patient: PatientDlocalCheckoutIdentity): string | null {
  return resolveDlocalPayerCountry({
    residencyCountry: patient.residencyCountry,
    market: patient.market
  });
}

export function assertPatientDlocalCheckoutAllowed(patient: PatientDlocalCheckoutIdentity): string {
  const payerCountry = resolvePatientDlocalPayerCountry(patient);
  if (!payerCountry) {
    throw new Error(DLOCAL_CHECKOUT_UNAVAILABLE_ERROR);
  }
  return payerCountry;
}
