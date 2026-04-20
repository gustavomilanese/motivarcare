import { professionalsCatalog } from "../data/professionalsCatalog";
import type { Professional } from "../types";

/** Profesional de referencia asignado en backend (p. ej. tras matching o alta); si falta, no mostrar compras atadas a tarifa de un pro. */
export function patientHasAssignedProfessional(assignedProfessionalId: string | null | undefined): boolean {
  return Boolean(assignedProfessionalId?.trim());
}

export function getFallbackProfessional(professionals: Professional[]): Professional {
  return professionals[0] ?? professionalsCatalog[0];
}

export function findProfessionalById(professionalId: string, professionals: Professional[]): Professional {
  const hit = professionals.find((item) => item.id === professionalId);
  if (hit) {
    return hit;
  }
  /** Evita ids del catálogo demo cuando ya hay filas reales del API (Reservas / Sesiones). */
  if (professionals.length > 0) {
    return professionals[0];
  }
  return getFallbackProfessional(professionals);
}

export function findSlotIdForBooking(
  professionalId: string,
  startsAt: string,
  endsAt: string,
  professionals: Professional[]
): string | null {
  return findProfessionalById(professionalId, professionals).slots.find((slot) => slot.startsAt === startsAt && slot.endsAt === endsAt)?.id ?? null;
}
