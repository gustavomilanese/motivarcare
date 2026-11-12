import { prisma } from "./prisma.js";

/** Borra todos los AvailabilitySlot de un profesional (no toca bookings). */
export async function clearProfessionalAvailability(professionalId: string): Promise<{ deletedCount: number }> {
  const id = professionalId.trim();
  if (!id) {
    return { deletedCount: 0 };
  }
  const result = await prisma.availabilitySlot.deleteMany({ where: { professionalId: id } });
  return { deletedCount: result.count };
}
