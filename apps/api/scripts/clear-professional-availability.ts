/**
 * Borra toda la disponibilidad publicada de un profesional (AvailabilitySlot).
 * No toca reservas. Sirve para republicar limpio (ej. SIRO).
 *
 * Usage (repo root .env with DATABASE_URL):
 *   npx tsx apps/api/scripts/clear-professional-availability.ts --name SIRO
 *   npx tsx apps/api/scripts/clear-professional-availability.ts --email pro@example.com
 *   npx tsx apps/api/scripts/clear-professional-availability.ts --id <professionalProfileId>
 *
 * Or from apps/api:
 *   npm run db:clear-availability -- --name SIRO
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { clearProfessionalAvailability } from "../src/lib/clearProfessionalAvailability.js";
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
    console.error("DATABASE_URL is not set. Load .env from repo root or export DATABASE_URL.");
    process.exit(1);
  }

  const byId = argValue("--id");
  const byEmail = argValue("--email")?.toLowerCase();
  const byName = argValue("--name");

  if (!byId && !byEmail && !byName) {
    console.error("Pass --id, --email, or --name (e.g. --name SIRO).");
    process.exit(1);
  }

  const matches = await prisma.professionalProfile.findMany({
    where: byId
      ? { id: byId }
      : byEmail
        ? { user: { email: byEmail } }
        : {
            user: {
              OR: [
                { fullName: { contains: byName! } },
                { firstName: { contains: byName! } },
                { lastName: { contains: byName! } }
              ]
            }
          },
    select: {
      id: true,
      user: { select: { email: true, fullName: true } },
      _count: { select: { availabilitySlots: true } }
    },
    take: 10
  });

  if (matches.length === 0) {
    console.log("No professional matched.");
    return;
  }

  if (matches.length > 1 && !byId) {
    console.log("Multiple professionals matched — be more specific:");
    for (const item of matches) {
      console.log(`- ${item.user.fullName} <${item.user.email}> id=${item.id} slots=${item._count.availabilitySlots}`);
    }
    process.exit(1);
  }

  const target = matches[0]!;
  const { deletedCount } = await clearProfessionalAvailability(target.id);
  console.log(
    `Cleared ${deletedCount} slot(s) for ${target.user.fullName} <${target.user.email}> (${target.id}).`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
