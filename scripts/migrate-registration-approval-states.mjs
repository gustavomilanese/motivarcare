/**
 * Migra ProfessionalRegistrationApproval: PENDING → IN_REVIEW / INCOMPLETE.
 *
 *   node scripts/migrate-registration-approval-states.mjs
 */
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
try {
  require("dotenv").config({ path: resolve(root, ".env") });
} catch {
  // ignore
}

const prisma = new PrismaClient();

async function main() {
  const pending = await prisma.professionalProfile.findMany({
    where: { registrationApproval: "PENDING" },
    select: { id: true, userId: true }
  });

  console.log(`[migrate-registration-approval] PENDING rows: ${pending.length}`);

  let toIncomplete = 0;
  let toInReview = 0;

  for (const row of pending) {
    const draft = await prisma.onboardingDraft.findFirst({
      where: {
        userId: row.userId,
        kind: "professional_onboarding"
      },
      select: { id: true }
    });

    const next = draft ? "INCOMPLETE" : "IN_REVIEW";
    await prisma.professionalProfile.update({
      where: { id: row.id },
      data: { registrationApproval: next }
    });
    if (draft) {
      toIncomplete += 1;
    } else {
      toInReview += 1;
    }
  }

  console.log(
    JSON.stringify({
      event: "migrate_registration_approval_done",
      toIncomplete,
      toInReview
    })
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
