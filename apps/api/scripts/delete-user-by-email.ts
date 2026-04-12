/**
 * Hard-deletes a user row (and patient/professional subgraph) by email.
 * Same teardown as admin "delete user" (no soft-delete branch).
 *
 * Usage (repo root .env with DATABASE_URL):
 *   npx tsx scripts/delete-user-by-email.ts you@example.com
 *
 * Or from apps/api:
 *   npm run db:delete-user-email -- you@example.com
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Role } from "@prisma/client";
import { ADMIN_USER_DELETE_TX_OPTIONS, hardDeleteUserInTransaction } from "../src/lib/hardDeleteUserInTransaction.js";
import { prisma } from "../src/lib/prisma.js";

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: resolve(apiRoot, "../../.env") });

const raw = process.argv[2]?.trim();
const email = (raw && raw.length > 0 ? raw : "motivarcare.test.pro@gmail.com").toLowerCase();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Load .env from repo root or export DATABASE_URL.");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      role: true,
      email: true,
      patient: { select: { id: true } },
      professional: { select: { id: true } },
      admin: { select: { id: true } }
    }
  });

  if (!existing) {
    console.log(`No user with email "${email}" — nothing to delete.`);
    return;
  }

  if (existing.role === Role.ADMIN) {
    console.error("Refusing to delete an ADMIN user from this script.");
    process.exit(1);
  }

  await prisma.$transaction(async (tx) => {
    await hardDeleteUserInTransaction(tx, existing);
  }, ADMIN_USER_DELETE_TX_OPTIONS);

  console.log(`Deleted user ${existing.id} (${existing.email}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
