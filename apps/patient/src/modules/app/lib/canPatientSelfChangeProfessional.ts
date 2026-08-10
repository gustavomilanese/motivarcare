import { countUpcomingPatientBookings, type PatientPortalBooking } from "@therapy/patient-core";
import { countAvailablePatientSessions } from "./countAvailablePatientSessions";

/** Misma regla que el gate de API: 0 créditos (paquete o prueba) y 0 reservas vigentes. */
export function canPatientSelfChangeProfessional(params: {
  creditsRemaining: number;
  trialRebookAvailable?: boolean;
  bookings: PatientPortalBooking[];
  assignedProfessionalId: string | null | undefined;
  nowMs?: number;
}): boolean {
  if (!params.assignedProfessionalId?.trim()) {
    return false;
  }
  if (
    countAvailablePatientSessions({
      creditsRemaining: params.creditsRemaining,
      trialRebookAvailable: params.trialRebookAvailable
    }) > 0
  ) {
    return false;
  }
  return countUpcomingPatientBookings(params.bookings, params.nowMs) === 0;
}
