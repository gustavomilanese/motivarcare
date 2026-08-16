/** Sesiones que Admin puede incluir en un pago: el profesional ya las envió a cobro. */
export const payoutEligibleSessionWhere = {
  bookingStatus: "COMPLETED" as const,
  submittedForPayoutAt: { not: null },
  payoutLineId: null
};
