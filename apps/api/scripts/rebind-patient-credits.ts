/**
 * Reasigna el professionalIdSnapshot de compras con créditos restantes
 * al profesional indicado (p. ej. después de cambiar el vínculo Gaston→Siro).
 *
 * Usage:
 *   npx tsx apps/api/scripts/rebind-patient-credits.ts --patient-email gaston@… --professional-name SIRO
 *   npx tsx apps/api/scripts/rebind-patient-credits.ts --patient-email gaston@… --professional-id <proProfileId>
 *
 * From apps/api:
 *   npm run db:rebind-credits -- --patient-email … --professional-name SIRO
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { prisma } from "../src/lib/prisma.js";

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: resolve(apiRoot, "../../.env") });

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) return undefined;
  const value = process.argv[index + 1]?.trim();
  return value && !value.startsWith("-") ? value : undefined;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const patientEmail = argValue("--patient-email")?.toLowerCase();
  const professionalId = argValue("--professional-id");
  const professionalName = argValue("--professional-name");

  if (!patientEmail || (!professionalId && !professionalName)) {
    console.error("Need --patient-email and (--professional-id or --professional-name).");
    process.exit(1);
  }

  const patient = await prisma.patientProfile.findFirst({
    where: { user: { email: patientEmail } },
    select: {
      id: true,
      user: { select: { email: true, fullName: true } },
      purchases: {
        where: { remainingCredits: { gt: 0 } },
        select: {
          id: true,
          remainingCredits: true,
          professionalIdSnapshot: true,
          purchasedAt: true
        }
      }
    }
  });

  if (!patient) {
    console.error(`No patient with email ${patientEmail}`);
    process.exit(1);
  }

  const pros = await prisma.professionalProfile.findMany({
    where: professionalId
      ? { id: professionalId }
      : {
          user: {
            OR: [
              { fullName: { contains: professionalName! } },
              { firstName: { contains: professionalName! } },
              { lastName: { contains: professionalName! } }
            ]
          }
        },
    select: {
      id: true,
      user: { select: { email: true, fullName: true } }
    },
    take: 10
  });

  if (pros.length === 0) {
    console.error("No professional matched.");
    process.exit(1);
  }
  if (pros.length > 1 && !professionalId) {
    console.error("Multiple professionals matched:");
    for (const pro of pros) {
      console.log(`- ${pro.user.fullName} <${pro.user.email}> id=${pro.id}`);
    }
    process.exit(1);
  }

  const target = pros[0]!;
  console.log(
    `Patient ${patient.user.fullName} <${patient.user.email}> → rebind ${patient.purchases.length} purchase(s) with remaining credits to ${target.user.fullName} (${target.id})`
  );
  for (const purchase of patient.purchases) {
    console.log(
      `  ${purchase.id} remaining=${purchase.remainingCredits} snapshot=${purchase.professionalIdSnapshot ?? "null"}`
    );
  }

  if (patient.purchases.length === 0) {
    console.log("Nothing to rebind.");
    return;
  }

  const result = await prisma.patientPackagePurchase.updateMany({
    where: {
      id: { in: patient.purchases.map((item) => item.id) }
    },
    data: { professionalIdSnapshot: target.id }
  });

  console.log(`Updated ${result.count} purchase(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
