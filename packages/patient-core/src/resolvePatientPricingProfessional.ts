export type PatientPricingProfessionalInput = {
  assignedProfessionalId?: string | null;
  selectedProfessionalId?: string | null;
  /** Preferir próximas reservas primero; luego el resto confirmadas. */
  bookingProfessionalIds?: string[];
};

export function resolvePatientPricingProfessionalId(
  input: PatientPricingProfessionalInput
): string | null {
  const assigned = input.assignedProfessionalId?.trim();
  if (assigned) {
    return assigned;
  }

  const selected = input.selectedProfessionalId?.trim();
  if (selected) {
    return selected;
  }

  for (const rawId of input.bookingProfessionalIds ?? []) {
    const id = rawId?.trim();
    if (id) {
      return id;
    }
  }

  return null;
}

/** Hay profesional de referencia para calcular tarifas (asignación, selección o reserva). */
export function patientHasPricingProfessional(input: PatientPricingProfessionalInput): boolean {
  return resolvePatientPricingProfessionalId(input) !== null;
}

export function collectPatientBookingProfessionalIds(
  bookings: Array<{ professionalId?: string | null; status?: string }>
): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const booking of bookings) {
    const id = booking.professionalId?.trim();
    if (!id || seen.has(id)) {
      continue;
    }
    const status = (booking.status ?? "").toLowerCase();
    if (status === "cancelled") {
      continue;
    }
    seen.add(id);
    ordered.push(id);
  }

  return ordered;
}
