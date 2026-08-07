import { countUpcomingPatientBookings, type PatientPortalBooking } from "@therapy/patient-core";

/** Misma regla que el gate de API: 0 créditos y 0 reservas vigentes. */
export function canPatientSelfChangeProfessional(params: {
  creditsRemaining: number;
  bookings: PatientPortalBooking[];
  assignedProfessionalId: string | null | undefined;
  nowMs?: number;
}): boolean {
  if (!params.assignedProfessionalId?.trim()) {
    return false;
  }
  if (Math.max(0, Number(params.creditsRemaining) || 0) > 0) {
    return false;
  }
  return countUpcomingPatientBookings(params.bookings, params.nowMs) === 0;
}
