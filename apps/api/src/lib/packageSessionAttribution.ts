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
      packageCreditsSnapshot: true
    }
  });
  if (!purchase) {
    throw new Error("PURCHASE_NOT_FOUND");
  }

  const siblings = await tx.booking.findMany({
    where: {
      consumedPurchaseId: purchaseId,
      consumedCredits: { gt: 0 },
      status: { not: "CANCELLED" }
    },
    select: { packageSessionOrdinal: true }
  });
  const used = siblings
    .map((booking) => booking.packageSessionOrdinal)
    .filter((value): value is number => value != null && value > 0);
  const uniqueUsed = new Set(used);
  const nextFromCount = siblings.length + 1;
  const nextFromStored = used.length > 0 ? Math.max(...used) + 1 : 1;
  const ordinal =
    uniqueUsed.size === used.length ? Math.max(nextFromCount, nextFromStored) : nextFromCount;

  return {
    ordinal,
    packageCredits: purchase.packageCreditsSnapshot
  };
}

type PackageSessionIndexBooking = {
  id: string;
  packageSessionOrdinal: number | null;
  startsAt: Date;
  createdAt?: Date;
  status: string;
  completedAt: Date | null;
};

function compareBookingsByStart(left: PackageSessionIndexBooking, right: PackageSessionIndexBooking): number {
  const byStart = left.startsAt.getTime() - right.startsAt.getTime();
  if (byStart !== 0) return byStart;
  return (left.createdAt?.getTime() ?? 0) - (right.createdAt?.getTime() ?? 0);
}

/**
 * Numera 1..n las reservas de una compra. Si los ordinales persistidos están
 * completos y no se repiten, se respetan; si hay duplicados (p. ej. todo en 1),
 * se resecuencia por fecha.
 */
export function resolvePackageSessionIndexForPurchase(
  bookings: PackageSessionIndexBooking[]
): Map<string, number> {
  const indexByBookingId = new Map<string, number>();
  const active = bookings
    .filter((booking) => booking.status !== "CANCELLED")
    .sort(compareBookingsByStart);

  const stored = active
    .map((booking) => booking.packageSessionOrdinal)
    .filter((value): value is number => value != null && value > 0);
  const storedUsable = stored.length === active.length && new Set(stored).size === stored.length;

  if (storedUsable) {
    for (const booking of active) {
      indexByBookingId.set(booking.id, booking.packageSessionOrdinal as number);
    }
  } else {
    active.forEach((booking, index) => {
      indexByBookingId.set(booking.id, index + 1);
    });
  }

  for (const booking of bookings) {
    if (indexByBookingId.has(booking.id)) continue;
    if (booking.status === "COMPLETED" || booking.completedAt) {
      const peers = [...active, booking].sort(compareBookingsByStart);
      const pos = peers.findIndex((item) => item.id === booking.id);
      if (pos >= 0) {
        indexByBookingId.set(booking.id, pos + 1);
      }
    }
  }

  return indexByBookingId;
}

/**
 * Índice 1-based por bookingId dentro de cada purchaseId.
 * Preferencia: packageSessionOrdinal persistido si es único; si falta o hay
 * duplicados, orden por startsAt entre reservas con crédito de esa compra.
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
      createdAt: true,
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
    for (const [bookingId, ordinal] of resolvePackageSessionIndexForPurchase(list)) {
      indexByBookingId.set(bookingId, ordinal);
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
