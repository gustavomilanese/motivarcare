import {
  patientHasPricingProfessional,
  resolvePatientPricingProfessionalId
} from "@therapy/patient-core";
import type { Booking } from "../types";

/**
 * Profesional del vínculo.
 * Elegido (assigned) es el lazo: compra y reserva solo con ese.
 * selected solo aplica antes de crear el lazo (matching).
 */
export function resolveBindingProfessionalId(params: {
  assignedProfessionalId?: string | null;
  selectedProfessionalId?: string | null;
}): string | null {
  const assigned = params.assignedProfessionalId?.trim() ?? "";
  if (assigned) {
    return assigned;
  }
  const selected = params.selectedProfessionalId?.trim() ?? "";
  return selected || null;
}

/** Reservar en Inicio: mismo vínculo; sin fallback a otra reserva ni a browse. */
export function resolveHomeBookingProfessionalId(params: {
  assignedProfessionalId?: string | null;
  selectedProfessionalId?: string | null;
  /** Ignorado: el lazo no mira la próxima reserva. */
  nextBookingProfessionalId?: string | null;
  /** Ignorado si hay assigned; no se puede “pedir” otro pro. */
  requestedProfessionalId?: string | null;
}): string | null {
  return resolveBindingProfessionalId({
    assignedProfessionalId: params.assignedProfessionalId,
    selectedProfessionalId: params.selectedProfessionalId
  });
}

export function resolvePortalPricingProfessionalId(params: {
  assignedProfessionalId: string | null | undefined;
  selectedProfessionalId: string | null | undefined;
  bookings: Booking[];
  upcomingBookingProfessionalIds?: string[];
}): string | null {
  return resolvePatientPricingProfessionalId({
    assignedProfessionalId: params.assignedProfessionalId,
    selectedProfessionalId: params.selectedProfessionalId
  });
}

export function portalHasPricingProfessional(params: {
  assignedProfessionalId: string | null | undefined;
  selectedProfessionalId: string | null | undefined;
  bookings: Booking[];
  upcomingBookingProfessionalIds?: string[];
}): boolean {
  return patientHasPricingProfessional({
    assignedProfessionalId: params.assignedProfessionalId,
    selectedProfessionalId: params.selectedProfessionalId
  });
}
