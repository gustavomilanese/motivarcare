export type PatientPricingProfessionalInput = {
  assignedProfessionalId?: string | null;
  /** Solo candidato pre-vínculo (matching). Con assign activo se ignora. */
  selectedProfessionalId?: string | null;
  /** @deprecated El vínculo no usa reservas como fallback. Se ignora. */
  bookingProfessionalIds?: string[];
};

/**
 * Profesional del vínculo para precio / compra / reserva.
 * Con assign: solo ese. Sin assign: el selected del matching (aún no hay lazo).
 * Sin fallback a reservas u otros profesionales.
 */
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

  return null;
}

/** Hay profesional de referencia para calcular tarifas (asignación o selección previa al lazo). */
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
