/**
 * Sincroniza `ProfessionalProfile.market` desde `residencyCountry`
 * (p. ej. tras añadir la columna o corregir datos).
 *
 *   npx tsx apps/api/scripts/backfill-professional-market.ts
 */
import { marketFromResidencyCountry } from "@therapy/types";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const rows = await prisma.professionalProfile.findMany({
    select: { id: true, residencyCountry: true }
  });
  let updated = 0;
  for (const row of rows) {
    const market = marketFromResidencyCountry(row.residencyCountry);
    await prisma.professionalProfile.update({
      where: { id: row.id },
      data: { market }
    });
    updated += 1;
  }
  console.log(`backfill-professional-market: updated ${updated} profiles`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
