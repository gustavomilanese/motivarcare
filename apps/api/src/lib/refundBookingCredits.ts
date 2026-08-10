import type { Prisma } from "@prisma/client";

type RefundTx = Prisma.TransactionClient;

/**
 * Devuelve créditos al paquete que se consumió en la reserva (`consumedPurchaseId`).
 * Sin id de compra no reintegra a otro paquete (evita mezclar wallets).
 */
export async function refundBookingCreditsToConsumedPurchase(
  tx: RefundTx,
  params: {
    patientId: string;
    bookingId: string;
    consumedPurchaseId: string | null;
    consumedCredits: number;
    note: string;
  }
): Promise<{ refundedCredits: number; purchaseId: string | null }> {
  const amount = Math.max(0, Number(params.consumedCredits) || 0);
  if (amount <= 0 || !params.consumedPurchaseId) {
    return { refundedCredits: 0, purchaseId: null };
  }

  const purchaseToRefund = await tx.patientPackagePurchase.findFirst({
    where: {
      id: params.consumedPurchaseId,
      patientId: params.patientId
    },
    select: { id: true }
  });

  if (!purchaseToRefund) {
    return { refundedCredits: 0, purchaseId: null };
  }

  await tx.patientPackagePurchase.update({
    where: { id: purchaseToRefund.id },
    data: {
      remainingCredits: { increment: amount }
    }
  });

  await tx.creditLedger.create({
    data: {
      patientId: params.patientId,
      bookingId: params.bookingId,
      type: "SESSION_REFUND",
      amount,
      note: params.note
    }
  });

  return { refundedCredits: amount, purchaseId: purchaseToRefund.id };
}
