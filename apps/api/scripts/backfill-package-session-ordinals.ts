/**
 * Backfill packageSessionOrdinal on existing package-credit bookings.
 * Run: npx tsx scripts/backfill-package-session-ordinals.ts
 */
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const purchaseIds = await prisma.booking.findMany({
    where: {
      consumedPurchaseId: { not: null },
      consumedCredits: { gt: 0 },
      packageSessionOrdinal: null
    },
    select: { consumedPurchaseId: true },
    distinct: ["consumedPurchaseId"]
  });

  let updated = 0;
  for (const row of purchaseIds) {
    const purchaseId = row.consumedPurchaseId;
    if (!purchaseId) continue;

    const bookings = await prisma.booking.findMany({
      where: {
        consumedPurchaseId: purchaseId,
        consumedCredits: { gt: 0 },
        status: { not: "CANCELLED" }
      },
      orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
      select: { id: true, packageSessionOrdinal: true }
    });

    let ordinal = 0;
    for (const booking of bookings) {
      ordinal += 1;
      if (booking.packageSessionOrdinal === ordinal) continue;
      await prisma.booking.update({
        where: { id: booking.id },
        data: { packageSessionOrdinal: ordinal }
      });
      updated += 1;
    }
  }

  console.log(`Backfilled packageSessionOrdinal on ${updated} booking(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
