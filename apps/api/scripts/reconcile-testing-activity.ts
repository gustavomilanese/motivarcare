/**
 * Testing reconcile: wipe commercial/financial activity while keeping
 * active patient + professional (+ admin) profiles.
 *
 * Clears: bookings, video, chats de sesión, compras, créditos, checkouts,
 * finance session records, payouts, daily aggregates, outbox.
 *
 * Keeps: users, PatientProfile, ProfessionalProfile, intakes, availability,
 * diplomas, catalog SessionPackage, SystemConfig (except display counters reset).
 *
 * Usage (repo root .env / DATABASE_URL):
 *   npm run db:reconcile-testing -w @therapy/api -- --dry-run
 *   ALLOW_RECONCILE_TESTING=1 npm run db:reconcile-testing -w @therapy/api -- --apply
 *
 * Non-localhost hosts require ALLOW_RECONCILE_TESTING=1 even for dry-run counts
 * that only read; --apply always requires the flag when host is not localhost.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { type Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma.js";

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: resolve(apiRoot, "../../.env") });
dotenv.config();

const PROFESSIONAL_DISPLAY_OVERRIDES_KEY = "professional-display-overrides";

type CountSnapshot = Record<string, number>;

function databaseHost(): string {
  const raw = process.env.DATABASE_URL ?? "";
  if (!raw) return "(missing DATABASE_URL)";
  try {
    const normalized = raw.replace(/^mysql:\/\//i, "http://").replace(/^postgresql:\/\//i, "http://");
    return new URL(normalized).hostname || "(unknown)";
  } catch {
    return "(unparsed)";
  }
}

function isLocalHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

async function snapshotCounts(): Promise<CountSnapshot> {
  const [
    patients,
    professionals,
    admins,
    bookings,
    videoSessions,
    chatThreads,
    chatMessages,
    purchases,
    creditLedger,
    paymentCheckouts,
    financeSessions,
    payoutLines,
    payoutRuns,
    dailyAggregates,
    outbox,
    reviews
  ] = await Promise.all([
    prisma.patientProfile.count(),
    prisma.professionalProfile.count(),
    prisma.adminProfile.count(),
    prisma.booking.count(),
    prisma.videoSession.count(),
    prisma.chatThread.count(),
    prisma.chatMessage.count(),
    prisma.patientPackagePurchase.count(),
    prisma.creditLedger.count(),
    prisma.paymentCheckout.count(),
    prisma.financeSessionRecord.count(),
    prisma.financePayoutLine.count(),
    prisma.financePayoutRun.count(),
    prisma.financeDailyAggregate.count(),
    prisma.outboxEvent.count(),
    prisma.professionalReview.count()
  ]);

  return {
    patients,
    professionals,
    admins,
    bookings,
    videoSessions,
    chatThreads,
    chatMessages,
    purchases,
    creditLedger,
    paymentCheckouts,
    financeSessions,
    payoutLines,
    payoutRuns,
    dailyAggregates,
    outbox,
    reviews
  };
}

function printSnapshot(label: string, counts: CountSnapshot): void {
  console.log(`\n=== ${label} ===`);
  for (const [key, value] of Object.entries(counts)) {
    console.log(`  ${key.padEnd(20)} ${value}`);
  }
}

async function resetProfessionalDisplayCounters(tx: Prisma.TransactionClient): Promise<void> {
  const cfg = await tx.systemConfig.findUnique({ where: { key: PROFESSIONAL_DISPLAY_OVERRIDES_KEY } });
  if (!cfg?.value || typeof cfg.value !== "object" || Array.isArray(cfg.value)) return;

  const current = cfg.value as Record<string, Record<string, unknown>>;
  const next: Record<string, Record<string, unknown>> = {};
  let touched = false;

  for (const [professionalId, override] of Object.entries(current)) {
    if (!override || typeof override !== "object") {
      next[professionalId] = override;
      continue;
    }
    const cleaned = { ...override };
    for (const key of ["activePatientsCount", "sessionsCount", "completedSessionsCount"] as const) {
      if (key in cleaned) {
        delete cleaned[key];
        touched = true;
      }
    }
    next[professionalId] = cleaned;
  }

  if (touched) {
    await tx.systemConfig.update({
      where: { key: PROFESSIONAL_DISPLAY_OVERRIDES_KEY },
      data: { value: next as Prisma.InputJsonValue }
    });
    console.log("  reset professional-display-overrides session counters");
  }
}

async function applyReconcile(): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      await tx.financeSessionRecord.updateMany({ data: { payoutLineId: null, purchaseId: null } });
      const financeSessions = await tx.financeSessionRecord.deleteMany();
      const payoutLines = await tx.financePayoutLine.deleteMany();
      const payoutRuns = await tx.financePayoutRun.deleteMany();
      const dailyAggregates = await tx.financeDailyAggregate.deleteMany();

      const paymentCheckouts = await tx.paymentCheckout.deleteMany();
      const creditLedger = await tx.creditLedger.deleteMany();
      const purchases = await tx.patientPackagePurchase.deleteMany();

      const chatMessages = await tx.chatMessage.deleteMany();
      const chatThreads = await tx.chatThread.deleteMany();
      const videoSessions = await tx.videoSession.deleteMany();
      await tx.aIAuditJob.deleteMany({ where: { bookingId: { not: null } } });
      const bookings = await tx.booking.deleteMany();

      const reviews = await tx.professionalReview.deleteMany();
      const outbox = await tx.outboxEvent.deleteMany();

      await resetProfessionalDisplayCounters(tx);

      console.log("\n=== deleted ===");
      console.log(`  financeSessions     ${financeSessions.count}`);
      console.log(`  payoutLines         ${payoutLines.count}`);
      console.log(`  payoutRuns          ${payoutRuns.count}`);
      console.log(`  dailyAggregates     ${dailyAggregates.count}`);
      console.log(`  paymentCheckouts    ${paymentCheckouts.count}`);
      console.log(`  creditLedger        ${creditLedger.count}`);
      console.log(`  purchases           ${purchases.count}`);
      console.log(`  chatMessages        ${chatMessages.count}`);
      console.log(`  chatThreads         ${chatThreads.count}`);
      console.log(`  videoSessions       ${videoSessions.count}`);
      console.log(`  bookings            ${bookings.count}`);
      console.log(`  reviews             ${reviews.count}`);
      console.log(`  outbox              ${outbox.count}`);
    },
    { timeout: 180_000 }
  );
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const apply = args.has("--apply");
  const dryRun = !apply || args.has("--dry-run");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const host = databaseHost();
  const local = isLocalHost(host);
  const allow = process.env.ALLOW_RECONCILE_TESTING === "1";

  console.log(`Database host: ${host}`);
  console.log(`Mode: ${apply && !dryRun ? "APPLY" : "DRY-RUN"}`);

  if (!local && !allow) {
    console.error(
      "Refusing: non-localhost DATABASE_URL without ALLOW_RECONCILE_TESTING=1.\n" +
        "This script is for the Testing environment only."
    );
    process.exit(1);
  }

  if (apply && !dryRun && !local && !allow) {
    console.error("Refusing apply on remote without ALLOW_RECONCILE_TESTING=1.");
    process.exit(1);
  }

  const before = await snapshotCounts();
  printSnapshot("before (kept profiles should stay)", before);

  if (!apply) {
    console.log("\nDry-run only. Re-run with --apply to wipe activity.");
    console.log("Kept: patients, professionals, admins, intakes, availability, diplomas, packages catalog.");
    return;
  }

  console.log("\nApplying reconcile…");
  await applyReconcile();

  const after = await snapshotCounts();
  printSnapshot("after", after);

  console.log("\nReconcile complete. Profiles preserved; commercial/finance activity cleared.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
