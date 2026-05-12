/**
 * Prepara las dos cuentas que enviamos a Google App Verification:
 *   - motivarcare.test.pac@gmail.com  (paciente con intake completo, riskLevel=low)
 *   - motivarcare.test.pro@gmail.com  (profesional con perfil aprobado y visible)
 *
 * Ambas quedan SIN conexión a Google Calendar para que el reviewer vea siempre
 * el OAuth consent screen desde cero al ingresar.
 *
 * Uso (con DATABASE_URL en .env del repo root):
 *   npx tsx scripts/seed-test-users.ts                # upsert (no toca historial)
 *   npx tsx scripts/seed-test-users.ts --purge        # hard-delete y recrea desde cero
 *   npx tsx scripts/seed-test-users.ts --password='X' # cambia password compartida
 *
 * Desde apps/api:
 *   npm run db:seed-test-users
 *   npm run db:seed-test-users -- --purge
 *   npm run db:seed-test-users -- --password='MiPass!2026'
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { prisma } from "../src/lib/prisma.js";
import { seedTestUsers } from "../src/lib/testUsersSeed.js";

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: resolve(apiRoot, "../../.env") });

function parsePasswordArg(): string | undefined {
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--password=")) {
      return arg.slice("--password=".length).trim();
    }
  }
  return undefined;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Load .env from repo root or export DATABASE_URL.");
    process.exit(1);
  }

  const purgeBefore = process.argv.slice(2).includes("--purge");
  const password = parsePasswordArg();
  const result = await seedTestUsers({ purgeBefore, password });

  /**
   * Salida pensada para copy/paste cuando preparás el envío a Google.
   * NO logueamos la password si vino por flag (asumimos que el operador ya la conoce);
   * solo mostramos la default cuando no se pasó nada.
   */
  console.log("Test users ready:");
  console.log(`  PATIENT       email=${result.patient.email}`);
  console.log(`                userId=${result.patient.userId}`);
  console.log(
    `                purged=${result.patient.purged} created=${result.patient.created}`
  );
  console.log(`  PROFESSIONAL  email=${result.professional.email}`);
  console.log(`                userId=${result.professional.userId}`);
  console.log(
    `                purged=${result.professional.purged} created=${result.professional.created}`
  );
  if (!password) {
    console.log(`  PASSWORD      ${result.passwordPlain}`);
  } else {
    console.log("  PASSWORD      (provided via --password flag)");
  }
  console.log(
    `  DEMO BOOKING  id=${result.demoBooking.bookingId} created=${result.demoBooking.created}`
  );
  console.log(`                startsAt=${result.demoBooking.startsAt.toISOString()}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
