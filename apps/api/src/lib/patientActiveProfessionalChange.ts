import { patientHasReusableTrialCredit } from "../modules/payments/paymentCheckout.service.js";
import { prisma } from "./prisma.js";

const ACTIVE_BOOKING_STATUSES = ["REQUESTED", "CONFIRMED"] as const;

export type PatientActiveProfessionalChangeGate =
  | { ok: true }
  | {
      ok: false;
      status: 409;
      error: string;
      code: "CREDITS_REMAINING" | "RESERVED_SESSIONS" | "TRIAL_CREDIT_REMAINING";
    };

/**
 * Cambio de profesional ya asignado: solo si no quedan créditos de paquete,
 * crédito de prueba reagendable ni reservas vigentes.
 * Alta inicial, reafirmación del mismo pro o desasignación no usan este gate.
 */
export async function assertPatientMaySwitchActiveProfessional(params: {
  patientId: string;
  previousProfessionalId: string | null;
  nextProfessionalId: string | null;
}): Promise<PatientActiveProfessionalChangeGate> {
  const { patientId, previousProfessionalId, nextProfessionalId } = params;

  if (!previousProfessionalId || !nextProfessionalId || previousProfessionalId === nextProfessionalId) {
    return { ok: true };
  }

  const [creditSummary, upcomingCount, hasTrialCredit] = await Promise.all([
    prisma.patientPackagePurchase.aggregate({
      where: { patientId },
      _sum: { remainingCredits: true }
    }),
    prisma.booking.count({
      where: {
        patientId,
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
        endsAt: { gt: new Date() }
      }
    }),
    patientHasReusableTrialCredit({
      patientId,
      professionalId: previousProfessionalId
    })
  ]);

  const remainingCredits = creditSummary._sum.remainingCredits ?? 0;
  if (remainingCredits > 0) {
    return {
      ok: false,
      status: 409,
      code: "CREDITS_REMAINING",
      error:
        "No podés cambiar de profesional mientras tengas sesiones disponibles. Usálas o consultá a soporte."
    };
  }

  if (hasTrialCredit) {
    return {
      ok: false,
      status: 409,
      code: "TRIAL_CREDIT_REMAINING",
      error:
        "No podés cambiar de profesional mientras tengas una sesión de prueba pagada por reagendar. Elegí un horario o consultá a soporte."
    };
  }

  if (upcomingCount > 0) {
    return {
      ok: false,
      status: 409,
      code: "RESERVED_SESSIONS",
      error:
        "No podés cambiar de profesional mientras tengas sesiones reservadas. Cancelalas o completalas antes."
    };
  }

  return { ok: true };
}
