/**
 * Deletes all patient/professional data and non-admin users.
 * Keeps User rows with role ADMIN (and AdminProfile).
 *
 * Usage (from repo root):
 *   npm run db:wipe-non-admin -w @therapy/api
 *
 * Production: set ALLOW_WIPE_NON_ADMIN=1 or the script exits.
 */
import { Role } from "@prisma/client";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd && process.env.ALLOW_WIPE_NON_ADMIN !== "1") {
    console.error(
      "Refusing to wipe: NODE_ENV=production. Set ALLOW_WIPE_NON_ADMIN=1 if you really intend this."
    );
    process.exit(1);
  }

  const adminUsers = await prisma.user.findMany({
    where: { role: Role.ADMIN },
    select: { id: true, email: true }
  });
  console.log(`Keeping ${adminUsers.length} admin user(s): ${adminUsers.map((u) => u.email).join(", ") || "(none)"}`);

  await prisma.$transaction(
    async (tx) => {
      await tx.financeSessionRecord.updateMany({ data: { payoutLineId: null, purchaseId: null } });
      await tx.financeSessionRecord.deleteMany();
      await tx.financePayoutLine.deleteMany();
      await tx.financePayoutRun.deleteMany();
      await tx.financeDailyAggregate.deleteMany();

      await tx.outboxEvent.deleteMany();

      await tx.chatMessage.deleteMany();
      await tx.chatThread.deleteMany();
      await tx.videoSession.deleteMany();
      await tx.booking.deleteMany();

      await tx.creditLedger.deleteMany();
      await tx.patientPackagePurchase.deleteMany();

      await tx.patientIntake.deleteMany();
      await tx.consent.deleteMany();
      await tx.aiAuditJob.deleteMany();

      await tx.availabilitySlot.deleteMany();
      await tx.professionalDiploma.deleteMany();

      await tx.sessionPackage.deleteMany({ where: { professionalId: { not: null } } });

      await tx.patientProfile.deleteMany();
      await tx.professionalProfile.deleteMany();

      const deletedUsers = await tx.user.deleteMany({
        where: { role: { not: Role.ADMIN } }
      });

      console.log(`Deleted ${deletedUsers.count} non-admin user row(s).`);
    },
    { timeout: 120_000 }
  );

  console.log("Wipe complete. Platform SessionPackage rows (professionalId null) and SystemConfig were kept.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
