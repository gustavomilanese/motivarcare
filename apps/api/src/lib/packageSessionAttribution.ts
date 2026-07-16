import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

type Tx = Prisma.TransactionClient | typeof prisma;

/**
 * Ordinal 1-based dentro de una compra concreta (FIFO por créditos de esa fila).
 * Usa remainingCredits + packageCreditsSnapshot antes del decremento.
 */
export function packageSessionOrdinalFromRemaining(params: {
  remainingCreditsBeforeConsume: number;
  packageCreditsSnapshot: number | null;
  totalCredits: number;
}): number {
  const capacity =
    params.packageCreditsSnapshot != null && params.packageCreditsSnapshot > 0
      ? params.packageCreditsSnapshot
      : params.totalCredits;
  if (capacity > 0 && params.remainingCreditsBeforeConsume <= capacity) {
    return Math.max(1, capacity - params.remainingCreditsBeforeConsume + 1);
  }
  // Wallet consolidado histórico: remaining > capacity → no inventar n fuera de rango.
  const usedGuess = Math.max(0, params.totalCredits - params.remainingCreditsBeforeConsume);
  return Math.max(1, usedGuess + 1);
}

export async function allocateNextPackageSessionOrdinal(
  tx: Tx,
  purchaseId: string
): Promise<{ ordinal: number; packageCredits: number | null }> {
  const purchase = await tx.patientPackagePurchase.findUnique({
    where: { id: purchaseId },
    select: {
      remainingCredits: true,
      packageCreditsSnapshot: true,
      totalCredits: true
    }
  });
  if (!purchase) {
    throw new Error("PURCHASE_NOT_FOUND");
  }

  if (
    purchase.packageCreditsSnapshot != null
    && purchase.packageCreditsSnapshot > 0
    && purchase.remainingCredits <= purchase.packageCreditsSnapshot
  ) {
    return {
      ordinal: packageSessionOrdinalFromRemaining({
        remainingCreditsBeforeConsume: purchase.remainingCredits,
        packageCreditsSnapshot: purchase.packageCreditsSnapshot,
        totalCredits: purchase.totalCredits
      }),
      packageCredits: purchase.packageCreditsSnapshot
    };
  }

  const priorActive = await tx.booking.count({
    where: {
      consumedPurchaseId: purchaseId,
      consumedCredits: { gt: 0 },
      status: { not: "CANCELLED" }
    }
  });

  return {
    ordinal: priorActive + 1,
    packageCredits: purchase.packageCreditsSnapshot
  };
}

/**
 * Índice 1-based por bookingId dentro de cada purchaseId.
 * Preferencia: packageSessionOrdinal persistido; si falta, orden por startsAt
 * entre reservas con crédito de esa compra (no canceladas).
 */
export async function buildPackageSessionIndexByBookingId(
  purchaseIds: string[]
): Promise<Map<string, number>> {
  const indexByBookingId = new Map<string, number>();
  const uniquePurchaseIds = [...new Set(purchaseIds.filter(Boolean))];
  if (uniquePurchaseIds.length === 0) {
    return indexByBookingId;
  }

  const bookings = await prisma.booking.findMany({
    where: {
      consumedPurchaseId: { in: uniquePurchaseIds },
      consumedCredits: { gt: 0 }
    },
    select: {
      id: true,
      consumedPurchaseId: true,
      packageSessionOrdinal: true,
      startsAt: true,
      status: true,
      completedAt: true
    },
    orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }]
  });

  const byPurchase = new Map<string, typeof bookings>();
  for (const booking of bookings) {
    if (!booking.consumedPurchaseId) continue;
    const list = byPurchase.get(booking.consumedPurchaseId) ?? [];
    list.push(booking);
    byPurchase.set(booking.consumedPurchaseId, list);
  }

  for (const list of byPurchase.values()) {
    const withStored = list.filter(
      (b) => b.packageSessionOrdinal != null && b.packageSessionOrdinal > 0
    );
    for (const booking of withStored) {
      indexByBookingId.set(booking.id, booking.packageSessionOrdinal as number);
    }

    const needFallback = list.filter(
      (b) =>
        (b.packageSessionOrdinal == null || b.packageSessionOrdinal <= 0)
        && b.status !== "CANCELLED"
    );
    needFallback.forEach((booking, index) => {
      if (!indexByBookingId.has(booking.id)) {
        indexByBookingId.set(booking.id, index + 1);
      }
    });

    // Completadas canceladas raras: si no tienen ordinal, ubicarlas por startsAt entre todas.
    for (const booking of list) {
      if (indexByBookingId.has(booking.id)) continue;
      if (booking.status === "COMPLETED" || booking.completedAt) {
        const peers = list
          .filter((b) => b.status !== "CANCELLED" || b.id === booking.id)
          .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
        const pos = peers.findIndex((b) => b.id === booking.id);
        if (pos >= 0) {
          indexByBookingId.set(booking.id, pos + 1);
        }
      }
    }
  }

  return indexByBookingId;
}

export function formatPackageSessionSourceLabel(params: {
  packageName: string;
  packageCredits: number | null;
  packageSessionNumber: number | null;
  discountPercent: number | null;
}): string {
  const name = params.packageName.trim() || "Paquete";
  const parts: string[] = [name];
  if (
    params.packageCredits != null
    && params.packageCredits > 0
    && params.packageSessionNumber != null
    && params.packageSessionNumber > 0
  ) {
    parts.push(`${params.packageSessionNumber}/${params.packageCredits}`);
  } else if (params.packageCredits != null && params.packageCredits > 0) {
    parts.push(`${params.packageCredits} cr`);
  }
  if (params.discountPercent != null && params.discountPercent > 0) {
    parts.push(`−${params.discountPercent}%`);
  }
  return parts.join(" · ");
}
