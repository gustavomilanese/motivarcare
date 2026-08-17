/** Sesiones que Admin puede incluir en un pago: el profesional ya las envió a cobro. */
export const payoutEligibleSessionWhere = {
  bookingStatus: "COMPLETED" as const,
  submittedForPayoutAt: { not: null },
  payoutLineId: null
};

/** Sesiones En cobro para el profesional: enviadas, todavía no depositadas. */
export const awaitingPayoutDepositWhere = {
  bookingStatus: "COMPLETED" as const,
  submittedForPayoutAt: { not: null },
  OR: [{ payoutLineId: null }, { payoutLine: { status: { not: "PAID" } } }]
};
