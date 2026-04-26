import { type Prisma } from "@prisma/client";
import { z } from "zod";

/** Prisma interactive transactions default to ~5s; full user teardown can exceed that. */
export const ADMIN_USER_DELETE_TX_OPTIONS = { maxWait: 15_000, timeout: 120_000 } as const;

const PATIENT_ACTIVE_ASSIGNMENTS_KEY = "patient-active-assignments";
const PROFESSIONAL_DISPLAY_OVERRIDES_KEY = "professional-display-overrides";

const patientAssignmentsSchema = z.record(z.string(), z.string().min(1).nullable());
const professionalDisplayOverrideSchema = z.object({
  ratingAverage: z.number().min(0).max(5).optional(),
  reviewsCount: z.number().int().min(0).max(100000).optional(),
  sessionDurationMinutes: z.number().int().min(15).max(120).optional(),
  activePatientsCount: z.number().int().min(0).max(100000).optional(),
  sessionsCount: z.number().int().min(0).max(1000000).optional(),
  completedSessionsCount: z.number().int().min(0).max(1000000).optional()
});
const professionalDisplayOverridesSchema = z.record(z.string(), professionalDisplayOverrideSchema);

function parsePatientAssignments(value: unknown): Record<string, string | null> {
  const parsed = patientAssignmentsSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

function parseProfessionalDisplayOverrides(
  value: unknown
): Record<
  string,
  {
    ratingAverage?: number;
    reviewsCount?: number;
    sessionDurationMinutes?: number;
    activePatientsCount?: number;
    sessionsCount?: number;
    completedSessionsCount?: number;
  }
> {
  const parsed = professionalDisplayOverridesSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

export type HardDeleteUserExisting = {
  id: string;
  patient?: { id: string } | null;
  professional?: { id: string } | null;
  admin?: { id: string } | null;
};

/**
 * Permanent user teardown (patient/professional branches + chat + user row).
 * Must run inside `prisma.$transaction`.
 */
export async function hardDeleteUserInTransaction(
  tx: Prisma.TransactionClient,
  existing: HardDeleteUserExisting
): Promise<void> {
  if (existing.patient?.id) {
    const patientId = existing.patient.id;

    const patientBookings = await tx.booking.findMany({
      where: { patientId },
      select: { id: true }
    });
    const bookingIds = patientBookings.map((item) => item.id);

    await tx.chatMessage.deleteMany({
      where: {
        OR: [
          {
            thread: {
              patientId
            }
          },
          bookingIds.length > 0
            ? {
                thread: {
                  bookingId: {
                    in: bookingIds
                  }
                }
              }
            : undefined
        ].filter((value): value is NonNullable<typeof value> => Boolean(value))
      }
    });
    await tx.chatThread.deleteMany({
      where: {
        OR: [
          { patientId },
          bookingIds.length > 0 ? { bookingId: { in: bookingIds } } : undefined
        ].filter((value): value is NonNullable<typeof value> => Boolean(value))
      }
    });
    if (bookingIds.length > 0) {
      await tx.videoSession.deleteMany({
        where: { bookingId: { in: bookingIds } }
      });
    }
    if (bookingIds.length > 0) {
      await tx.aIAuditJob.deleteMany({
        where: { bookingId: { in: bookingIds } }
      });
    }
    await tx.financeSessionRecord.updateMany({
      where: {
        OR: [
          { patientId },
          bookingIds.length > 0 ? { bookingId: { in: bookingIds } } : undefined
        ].filter((value): value is NonNullable<typeof value> => Boolean(value))
      },
      data: { payoutLineId: null, purchaseId: null }
    });
    await tx.financeSessionRecord.deleteMany({
      where: {
        OR: [
          { patientId },
          bookingIds.length > 0 ? { bookingId: { in: bookingIds } } : undefined
        ].filter((value): value is NonNullable<typeof value> => Boolean(value))
      }
    });
    await tx.creditLedger.deleteMany({
      where: {
        OR: [
          { patientId },
          bookingIds.length > 0 ? { bookingId: { in: bookingIds } } : undefined
        ].filter((value): value is NonNullable<typeof value> => Boolean(value))
      }
    });
    if (bookingIds.length > 0) {
      await tx.booking.deleteMany({
        where: { id: { in: bookingIds } }
      });
    }
    await tx.patientPackagePurchase.deleteMany({ where: { patientId } });
    await tx.consent.deleteMany({ where: { patientId } });
    await tx.aIAuditJob.deleteMany({ where: { patientId } });
    /**
     * PatientIntakeChatSession (chat IA conversacional) tiene dos FKs sin cascade:
     *   - patientId → PatientProfile.id
     *   - intakeId  → PatientIntake.id (nullable)
     * Hay que borrarla ANTES que PatientIntake (por la FK al intake) y ANTES que
     * PatientProfile (por la FK al patient). Si no se hace, el delete del
     * PatientProfile rompe con FK violation y aborta toda la transacción —
     * generando en la UI un genérico "No pudimos eliminar el usuario".
     */
    await tx.patientIntakeChatSession.deleteMany({ where: { patientId } });
    /**
     * PatientTreatmentChat (chat IA de acompañamiento) tiene FK patientId → PatientProfile.id
     * sin cascade. Sus mensajes (PatientTreatmentChatMessage) sí tienen onDelete: Cascade
     * sobre el chat, así que basta con borrar el chat para limpiar todo.
     */
    await tx.patientTreatmentChat.deleteMany({ where: { patientId } });
    await tx.patientIntake.deleteMany({ where: { patientId } });
    await tx.patientProfile.delete({ where: { id: patientId } });
  }

  if (existing.professional?.id) {
    const professionalId = existing.professional.id;
    const professionalBookings = await tx.booking.findMany({
      where: { professionalId },
      select: { id: true }
    });
    const professionalBookingIds = professionalBookings.map((item) => item.id);

    await tx.chatMessage.deleteMany({
      where: {
        OR: [
          {
            thread: {
              professionalId
            }
          },
          professionalBookingIds.length > 0
            ? {
                thread: {
                  bookingId: {
                    in: professionalBookingIds
                  }
                }
              }
            : undefined
        ].filter((value): value is NonNullable<typeof value> => Boolean(value))
      }
    });
    await tx.chatThread.deleteMany({
      where: {
        OR: [
          { professionalId },
          professionalBookingIds.length > 0 ? { bookingId: { in: professionalBookingIds } } : undefined
        ].filter((value): value is NonNullable<typeof value> => Boolean(value))
      }
    });
    if (professionalBookingIds.length > 0) {
      await tx.videoSession.deleteMany({
        where: { bookingId: { in: professionalBookingIds } }
      });
    }
    if (professionalBookingIds.length > 0) {
      await tx.aIAuditJob.deleteMany({
        where: { bookingId: { in: professionalBookingIds } }
      });
    }
    const payoutLineIdsForPro = (
      await tx.financePayoutLine.findMany({
        where: { professionalId },
        select: { id: true }
      })
    ).map((row) => row.id);
    const professionalFinanceSessionWhere: Prisma.FinanceSessionRecordWhereInput = {
      OR: [
        { professionalId },
        ...(professionalBookingIds.length > 0 ? [{ bookingId: { in: professionalBookingIds } }] : []),
        ...(payoutLineIdsForPro.length > 0 ? [{ payoutLineId: { in: payoutLineIdsForPro } }] : [])
      ]
    };
    await tx.financeSessionRecord.updateMany({
      where: professionalFinanceSessionWhere,
      data: { payoutLineId: null, purchaseId: null }
    });
    await tx.financeSessionRecord.deleteMany({
      where: professionalFinanceSessionWhere
    });
    if (professionalBookingIds.length > 0) {
      await tx.creditLedger.deleteMany({
        where: { bookingId: { in: professionalBookingIds } }
      });
    }
    if (professionalBookingIds.length > 0) {
      await tx.booking.deleteMany({
        where: { id: { in: professionalBookingIds } }
      });
    }
    await tx.financePayoutLine.deleteMany({
      where: { professionalId }
    });
    await tx.aIAuditJob.deleteMany({ where: { professionalId } });
    await tx.availabilitySlot.deleteMany({ where: { professionalId } });
    await tx.professionalDiploma.deleteMany({ where: { professionalId } });
    await tx.sessionPackage.updateMany({
      where: { professionalId },
      data: { professionalId: null }
    });

    const displayCfg = await tx.systemConfig.findUnique({ where: { key: PROFESSIONAL_DISPLAY_OVERRIDES_KEY } });
    const displayOverrides = parseProfessionalDisplayOverrides(displayCfg?.value);
    if (displayOverrides[professionalId] !== undefined) {
      const nextDisplay = { ...displayOverrides };
      delete nextDisplay[professionalId];
      await tx.systemConfig.upsert({
        where: { key: PROFESSIONAL_DISPLAY_OVERRIDES_KEY },
        create: { key: PROFESSIONAL_DISPLAY_OVERRIDES_KEY, value: nextDisplay as Prisma.InputJsonValue },
        update: { value: nextDisplay as Prisma.InputJsonValue }
      });
    }

    const paCfg = await tx.systemConfig.findUnique({ where: { key: PATIENT_ACTIVE_ASSIGNMENTS_KEY } });
    const assignments = parsePatientAssignments(paCfg?.value);
    const nextAssignments: Record<string, string | null> = { ...assignments };
    let assignmentsTouched = false;
    for (const [patientProfileId, assignedProfessionalId] of Object.entries(assignments)) {
      if (assignedProfessionalId === professionalId) {
        nextAssignments[patientProfileId] = null;
        assignmentsTouched = true;
      }
    }
    if (assignmentsTouched) {
      await tx.systemConfig.upsert({
        where: { key: PATIENT_ACTIVE_ASSIGNMENTS_KEY },
        create: { key: PATIENT_ACTIVE_ASSIGNMENTS_KEY, value: nextAssignments as Prisma.InputJsonValue },
        update: { value: nextAssignments as Prisma.InputJsonValue }
      });
    }

    await tx.professionalProfile.delete({ where: { id: professionalId } });
  }

  if (existing.admin?.id) {
    await tx.adminProfile.delete({ where: { id: existing.admin.id } });
  }

  await tx.chatMessage.deleteMany({ where: { senderUserId: existing.id } });
  await tx.user.delete({ where: { id: existing.id } });
}
