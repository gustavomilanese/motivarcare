/** Sesiones realizadas todavía no enviadas a cobro. */
export const readyToSendForPayoutWhere = {
  bookingStatus: "COMPLETED" as const,
  submittedForPayoutAt: null,
  payoutLineId: null
};

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
