/** Sesiones realizadas todavía no enviadas a cobro. */
export const readyToSendForPayoutWhere = {
  bookingStatus: "COMPLETED" as const,
  submittedForPayoutAt: null,
  payoutLineId: null
};

/**
 * Sesiones que Admin puede incluir en un pago: el profesional ya las envió a cobro
 * y todavía no hay un payout en vuelo o pagado.
 *
 * Incluye líneas FAILED: si dLocal rechaza el envío, las sesiones deben volver a
 * Pendiente (no quedar huérfanas atadas a la línea fallida).
 * No incluye SUBMITTED (webhook en curso) ni PAID.
 */
export const payoutEligibleSessionWhere = {
  bookingStatus: "COMPLETED" as const,
  submittedForPayoutAt: { not: null },
  OR: [{ payoutLineId: null }, { payoutLine: { status: "FAILED" } }]
};

/** Sesiones En cobro para el profesional: enviadas, todavía no depositadas. */
export const awaitingPayoutDepositWhere = {
  bookingStatus: "COMPLETED" as const,
  submittedForPayoutAt: { not: null },
  OR: [{ payoutLineId: null }, { payoutLine: { status: { not: "PAID" } } }]
};

/**
 * Espejo testeable del filtro Prisma `payoutEligibleSessionWhere`.
 * Si esto y el where se desalinean, las sesiones desaparecen del dashboard.
 */
export function isSessionEligibleForAdminPayout(input: {
  bookingStatus: string;
  submittedForPayoutAt: string | Date | null;
  payoutLineStatus: string | null | undefined;
}): boolean {
  if (input.bookingStatus !== "COMPLETED") {
    return false;
  }
  if (input.submittedForPayoutAt == null) {
    return false;
  }
  const status = input.payoutLineStatus ?? null;
  return status == null || status === "FAILED";
}

/**
 * Solo soltamos sesiones si dLocal NO confirmó un payout_id.
 * Si el pago ya existe en dLocal, soltarlas permitiría un segundo envío.
 */
export function shouldReleaseSessionsAfterDlocalFailure(line: {
  dlocalPayoutId?: string | null;
}): boolean {
  return !line.dlocalPayoutId?.trim();
}
