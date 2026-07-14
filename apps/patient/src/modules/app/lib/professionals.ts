import type { Professional } from "../types";

/** Profesional de referencia asignado en backend (p. ej. tras matching o alta); si falta, no mostrar compras atadas a tarifa de un pro. */
export function patientHasAssignedProfessional(assignedProfessionalId: string | null | undefined): boolean {
  return Boolean(assignedProfessionalId?.trim());
}

/**
 * Resolución estricta por id. Nunca devolver “el primero del listado” ni el catálogo demo:
 * eso mostraba un flash de Emma Collins (u otro pro) hasta que cargaba la asignación real.
 */
export function findProfessionalById(
  professionalId: string | null | undefined,
  professionals: Professional[]
): Professional | null {
  const id = professionalId?.trim() ?? "";
  if (!id) {
    return null;
  }
  return professionals.find((item) => item.id === id) ?? null;
}

export function findSlotIdForBooking(
  professionalId: string,
  startsAt: string,
  endsAt: string,
  professionals: Professional[]
): string | null {
  return (
    findProfessionalById(professionalId, professionals)?.slots.find(
      (slot) => slot.startsAt === startsAt && slot.endsAt === endsAt
    )?.id ?? null
  );
}
