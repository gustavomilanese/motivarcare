/**
 * Ejecutar una vez tras agregar User.firstName / User.lastName:
 *   npm run db:backfill-names -w @therapy/api
 */
import { userNamePartsFromFullNameString } from "@therapy/types";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, fullName: true } });
  for (const u of users) {
    const p = userNamePartsFromFullNameString(u.fullName);
    await prisma.user.update({
      where: { id: u.id },
      data: {
        fullName: p.fullName,
        firstName: p.firstName,
        lastName: p.lastName
      }
    });
  }
  console.log(`Updated ${users.length} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
