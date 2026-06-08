import {
  collectPatientBookingProfessionalIds,
  patientHasPricingProfessional,
  resolvePatientPricingProfessionalId
} from "@therapy/patient-core";
import type { Booking } from "../types";

export function resolvePortalPricingProfessionalId(params: {
  assignedProfessionalId: string | null | undefined;
  selectedProfessionalId: string | null | undefined;
  bookings: Booking[];
  upcomingBookingProfessionalIds?: string[];
}): string | null {
  const fromUpcoming = params.upcomingBookingProfessionalIds ?? [];
  const fromBookings = collectPatientBookingProfessionalIds(params.bookings);
  const bookingProfessionalIds = [...fromUpcoming, ...fromBookings].filter(
    (id, index, list) => list.indexOf(id) === index
  );

  return resolvePatientPricingProfessionalId({
    assignedProfessionalId: params.assignedProfessionalId,
    selectedProfessionalId: params.selectedProfessionalId,
    bookingProfessionalIds
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
    selectedProfessionalId: params.selectedProfessionalId,
    bookingProfessionalIds: [
      ...(params.upcomingBookingProfessionalIds ?? []),
      ...collectPatientBookingProfessionalIds(params.bookings)
    ]
  });
}
