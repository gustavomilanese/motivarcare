/**
 * Simula sesiones ejecutadas para un profesional (default: Rodrigo ElPotro):
 * - Paciente A: prueba en mayo + paquete 4 créditos, 4 sesiones en junio
 * - Paciente B: prueba en mayo + paquete 8 créditos, 3 sesiones en junio (+ reservas futuras)
 * - Paciente C: sesión de prueba en junio (sin paquete aún)
 *
 * Uso:
 *   npx tsx scripts/seed-rodrigo-executed-sessions.ts
 *   npx tsx scripts/seed-rodrigo-executed-sessions.ts --professional="Rodrigo ElPotro"
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { BookingStatus, CreditMovementType, Role } from "@prisma/client";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/auth.js";
import { ADMIN_USER_DELETE_TX_OPTIONS, hardDeleteUserInTransaction } from "../src/lib/hardDeleteUserInTransaction.js";
import { getFinanceRules } from "../src/modules/finance/finance.service.js";

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: resolve(apiRoot, "../../.env") });

const DEFAULT_PRO_NAME = "Rodrigo ElPotro";
const DEMO_PASSWORD = "DemoSeed2026!";

type PatientSeed = {
  key: string;
  fullName: string;
  email: string;
  scenario: "package4_all" | "package8_partial" | "individual";
};

const PATIENTS: PatientSeed[] = [
  {
    key: "camila-pkg4",
    fullName: "Camila Morales",
    email: "camila.morales.demo@motivare.test",
    scenario: "package4_all"
  },
  {
    key: "martin-pkg8",
    fullName: "Martín Delgado",
    email: "martin.delgado.demo@motivare.test",
    scenario: "package8_partial"
  },
  {
    key: "sofia-individual",
    fullName: "Sofía Ibarra",
    email: "sofia.ibarra.demo@motivare.test",
    scenario: "individual"
  }
];

function parseProfessionalArg(): string {
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--professional=")) {
      return arg.slice("--professional=".length).trim();
    }
  }
  return DEFAULT_PRO_NAME;
}

function daysAgo(n: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/** Sesión en un mes relativo al actual (0 = mes actual, -1 = mes anterior). */
function sessionInMonth(monthOffset: number, dayOfMonth: number, hour: number, minute = 0): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + monthOffset, dayOfMonth, hour, minute, 0, 0);
}

/** Sesión en el mes actual, día fijo (1–28), siempre antes de hoy si es posible. */
function sessionInCurrentMonth(dayOfMonth: number, hour: number, minute = 0): Date {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, hour, minute, 0, 0);
  if (d.getTime() >= now.getTime()) {
    d.setDate(Math.max(1, now.getDate() - 1));
    d.setHours(hour, minute, 0, 0);
  }
  return d;
}

function financeFromSessionPrice(sessionPriceCents: number, commissionPercent: number) {
  const platformFeeCents = roundCents((sessionPriceCents * commissionPercent) / 100);
  const professionalNetCents = Math.max(0, sessionPriceCents - platformFeeCents);
  return { platformFeeCents, professionalNetCents };
}

function sessionEnd(start: Date): Date {
  return new Date(start.getTime() + 50 * 60 * 1000);
}

function roundCents(value: number): number {
  return Math.round(value);
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) {
    return { firstName: fullName, lastName: "—" };
  }
  return { firstName: parts[0] ?? fullName, lastName: parts.slice(1).join(" ") };
}

function resolveListPrice(professional: {
  market: string;
  sessionPriceArs: number | null;
  sessionPriceUsd: number | null;
  discount4: number | null;
  discount8: number | null;
}): {
  market: "AR" | "US";
  currency: string;
  listPriceCents: number;
  discount4Percent: number;
  discount8Percent: number;
  priceNote: string;
} {
  const discount4Percent = professional.discount4 ?? 10;
  const discount8Percent = professional.discount8 ?? 15;

  if (professional.market === "AR" && professional.sessionPriceArs != null && professional.sessionPriceArs > 0) {
    const usdNote =
      professional.sessionPriceUsd != null && professional.sessionPriceUsd > 0
        ? ` (también tiene USD ${professional.sessionPriceUsd} cargado; se usa ARS por mercado AR)`
        : "";
    return {
      market: "AR",
      currency: "ars",
      listPriceCents: professional.sessionPriceArs * 100,
      discount4Percent,
      discount8Percent,
      priceNote: `Precio lista ARS ${professional.sessionPriceArs.toLocaleString("es-AR")}/sesión${usdNote}`
    };
  }

  if (professional.sessionPriceUsd != null && professional.sessionPriceUsd > 0) {
    return {
      market: professional.market === "AR" ? "AR" : "US",
      currency: "usd",
      listPriceCents: professional.sessionPriceUsd * 100,
      discount4Percent,
      discount8Percent,
      priceNote: `Precio lista USD ${professional.sessionPriceUsd}/sesión`
    };
  }

  return {
    market: "US",
    currency: "usd",
    listPriceCents: 8000,
    discount4Percent,
    discount8Percent,
    priceNote: "Sin precio en perfil; fallback USD 80/sesión"
  };
}

async function cleanupLegacyDemoPatients() {
  const legacyEmails = [
    "demo.rodrigo.pkg4@motivare.test",
    "demo.rodrigo.pkg8@motivare.test",
    "demo.rodrigo.individual@motivare.test"
  ];

  for (const email of legacyEmails) {
    const user = await prisma.user.findUnique({
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
    if (!user) {
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await hardDeleteUserInTransaction(tx, user);
    }, ADMIN_USER_DELETE_TX_OPTIONS);
    console.log(`  · Eliminado paciente demo legacy: ${email}`);
  }
}

async function findProfessional(nameQuery: string) {
  const tokens = nameQuery.split(/\s+/).filter(Boolean);
  const professional = await prisma.professionalProfile.findFirst({
    where: {
      user: {
        role: Role.PROFESSIONAL,
        AND: tokens.map((token) => ({
          OR: [
            { fullName: { contains: token } },
            { firstName: { contains: token } },
            { lastName: { contains: token } }
          ]
        }))
      }
    },
    include: { user: { select: { fullName: true, email: true } } }
  });

  if (!professional) {
    const all = await prisma.user.findMany({
      where: { role: Role.PROFESSIONAL },
      select: { fullName: true, email: true },
      take: 20
    });
    throw new Error(
      `No se encontró profesional "${nameQuery}". Profesionales en DB (muestra): ${all.map((u) => u.fullName).join(", ") || "(ninguno)"}`
    );
  }

  return professional;
}

async function ensurePatient(seed: PatientSeed, market: "AR" | "US") {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const { firstName, lastName } = splitFullName(seed.fullName);
  const user = await prisma.user.upsert({
    where: { email: seed.email },
    create: {
      email: seed.email,
      emailVerified: true,
      isTestUser: true,
      passwordHash,
      fullName: seed.fullName,
      firstName,
      lastName,
      role: Role.PATIENT
    },
    update: {
      fullName: seed.fullName,
      firstName,
      lastName,
      isTestUser: true
    }
  });

  const patient = await prisma.patientProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      market,
      residencyCountry: market === "AR" ? "AR" : "US",
      timezone: market === "AR" ? "America/Argentina/Buenos_Aires" : "America/New_York"
    },
    update: {}
  });

  return { user, patient };
}

async function ensurePackage(input: {
  professionalId: string;
  market: "AR" | "US";
  credits: number;
  priceCents: number;
  currency: string;
  name: string;
  stripePriceId: string;
}) {
  return prisma.sessionPackage.upsert({
    where: {
      market_stripePriceId: {
        market: input.market,
        stripePriceId: input.stripePriceId
      }
    },
    create: {
      professionalId: input.professionalId,
      market: input.market,
      stripePriceId: input.stripePriceId,
      name: input.name,
      credits: input.credits,
      priceCents: input.priceCents,
      currency: input.currency,
      active: true
    },
    update: {
      professionalId: input.professionalId,
      name: input.name,
      credits: input.credits,
      priceCents: input.priceCents,
      currency: input.currency,
      active: true
    }
  });
}

async function ensurePurchase(input: {
  patientId: string;
  packageId: string;
  totalCredits: number;
  remainingCredits: number;
  packageName: string;
  packageCredits: number;
  packagePriceCents: number;
  currency: string;
  professionalId: string;
  checkoutId: string;
  commissionPercent: number;
  trialCommissionPercent: number;
}) {
  return prisma.patientPackagePurchase.upsert({
    where: { stripeCheckoutSessionId: input.checkoutId },
    create: {
      patientId: input.patientId,
      packageId: input.packageId,
      stripeCheckoutSessionId: input.checkoutId,
      totalCredits: input.totalCredits,
      remainingCredits: input.remainingCredits,
      packageNameSnapshot: input.packageName,
      packageCreditsSnapshot: input.packageCredits,
      packagePriceCentsSnapshot: input.packagePriceCents,
      packageCurrencySnapshot: input.currency,
      platformCommissionPercentSnapshot: input.commissionPercent,
      trialPlatformPercentSnapshot: input.trialCommissionPercent,
      professionalIdSnapshot: input.professionalId,
      fxArsPerUsdSnapshot: input.currency === "ars" ? 1200 : null,
      purchasedAt: sessionInCurrentMonth(1, 9)
    },
    update: {
      remainingCredits: input.remainingCredits,
      packageNameSnapshot: input.packageName,
      packageCreditsSnapshot: input.packageCredits,
      packagePriceCentsSnapshot: input.packagePriceCents,
      packageCurrencySnapshot: input.currency,
      professionalIdSnapshot: input.professionalId,
      platformCommissionPercentSnapshot: input.commissionPercent,
      trialPlatformPercentSnapshot: input.trialCommissionPercent
    }
  });
}

async function resetSeedBookings(professionalId: string) {
  for (const seed of PATIENTS) {
    const user = await prisma.user.findUnique({
      where: { email: seed.email },
      select: { patient: { select: { id: true } } }
    });
    if (!user?.patient) {
      continue;
    }
    const patientId = user.patient.id;
    const bookings = await prisma.booking.findMany({
      where: { patientId, professionalId },
      select: { id: true }
    });
    const bookingIds = bookings.map((b) => b.id);
    await prisma.financeSessionRecord.deleteMany({ where: { patientId, professionalId } });
    if (bookingIds.length > 0) {
      await prisma.creditLedger.deleteMany({ where: { bookingId: { in: bookingIds } } });
    }
    await prisma.booking.deleteMany({ where: { patientId, professionalId } });
  }
}

async function createCompletedSession(input: {
  patientId: string;
  professionalId: string;
  purchaseId: string | null;
  packageId: string | null;
  startsAt: Date;
  sessionPriceCents: number;
  currency: string;
  consumedCredits: number;
  bookingKey: string;
  commissionPercent: number;
  isTrial?: boolean;
  trialCommissionPercent?: number;
}) {
  const completedAt = sessionEnd(input.startsAt);
  const appliedCommission = input.isTrial
    ? (input.trialCommissionPercent ?? 100)
    : input.commissionPercent;
  const { platformFeeCents, professionalNetCents } = financeFromSessionPrice(
    input.sessionPriceCents,
    appliedCommission
  );

  const booking = await prisma.booking.create({
    data: {
      patientId: input.patientId,
      professionalId: input.professionalId,
      consumedPurchaseId: input.purchaseId,
      startsAt: input.startsAt,
      endsAt: completedAt,
      status: BookingStatus.COMPLETED,
      completedAt,
      consumedCredits: input.consumedCredits,
      patientTimezoneAtBooking: "America/Argentina/Buenos_Aires",
      professionalTimezoneAtBooking: "America/Argentina/Buenos_Aires"
    }
  });

  if (input.consumedCredits > 0) {
    await prisma.creditLedger.create({
      data: {
        patientId: input.patientId,
        bookingId: booking.id,
        type: CreditMovementType.SESSION_CONSUMED,
        amount: -input.consumedCredits,
        note: `Seed ${input.bookingKey}`
      }
    });
  }

  await prisma.financeSessionRecord.create({
    data: {
      bookingId: booking.id,
      patientId: input.patientId,
      professionalId: input.professionalId,
      packageId: input.packageId,
      purchaseId: input.purchaseId,
      isTrial: input.isTrial ?? false,
      currency: input.currency,
      sessionPriceCents: input.sessionPriceCents,
      platformCommissionPercent: appliedCommission,
      platformFeeCents,
      professionalNetCents,
      bookingStatus: BookingStatus.COMPLETED,
      bookingCompletedAt: completedAt,
      bookingStartsAt: input.startsAt
    }
  });

  return { bookingId: booking.id };
}

/** Día futuro en el mes actual (o días adelante si el día ya pasó). */
function sessionUpcoming(daysAhead: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function createUpcomingBooking(input: {
  patientId: string;
  professionalId: string;
  purchaseId: string;
  startsAt: Date;
  bookingKey: string;
}) {
  const endsAt = sessionEnd(input.startsAt);
  return prisma.booking.create({
    data: {
      patientId: input.patientId,
      professionalId: input.professionalId,
      consumedPurchaseId: input.purchaseId,
      startsAt: input.startsAt,
      endsAt,
      status: BookingStatus.CONFIRMED,
      consumedCredits: 1,
      patientTimezoneAtBooking: "America/Argentina/Buenos_Aires",
      professionalTimezoneAtBooking: "America/Argentina/Buenos_Aires"
    }
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const professionalName = parseProfessionalArg();
  console.log("Limpiando pacientes demo legacy (si existen)…");
  await cleanupLegacyDemoPatients();

  const professional = await findProfessional(professionalName);
  const financeRules = await getFinanceRules();
  const commissionPercent = financeRules.platformCommissionPercent;
  const trialCommissionPercent = financeRules.trialPlatformPercent;

  console.log("Reiniciando bookings demo del mes actual…");
  await resetSeedBookings(professional.id);

  const pricing = resolveListPrice(professional);
  const { market, currency, listPriceCents, discount4Percent, discount8Percent, priceNote } = pricing;

  console.log(`Profesional: ${professional.user.fullName} (${professional.user.email})`);
  console.log(`Profile ID: ${professional.id} · market=${market} · ${priceNote}`);
  console.log(`Comisión portal: ${commissionPercent}% · prueba ${trialCommissionPercent}% · descuentos paquete 4 → ${discount4Percent}% · paquete 8 → ${discount8Percent}%`);

  const package4Price = roundCents(listPriceCents * 4 * (1 - discount4Percent / 100));
  const package8Price = roundCents(listPriceCents * 8 * (1 - discount8Percent / 100));
  const perSessionFrom4 = roundCents(package4Price / 4);
  const perSessionFrom8 = roundCents(package8Price / 8);

  const pkg4 = await ensurePackage({
    professionalId: professional.id,
    market,
    credits: 4,
    priceCents: package4Price,
    currency,
    name: "Paquete 4 sesiones",
    stripePriceId: `seed_rodrigo_pkg4_${professional.id.slice(0, 8)}`
  });

  const pkg8 = await ensurePackage({
    professionalId: professional.id,
    market,
    credits: 8,
    priceCents: package8Price,
    currency,
    name: "Paquete 8 sesiones",
    stripePriceId: `seed_rodrigo_pkg8_${professional.id.slice(0, 8)}`
  });

  const camilaTrialMay = sessionInMonth(-1, 12, 10);
  const martinTrialMay = sessionInMonth(-1, 18, 11);
  const camilaSessions = [
    sessionInCurrentMonth(2, 10),
    sessionInCurrentMonth(4, 11),
    sessionInCurrentMonth(6, 12),
    sessionInCurrentMonth(8, 14)
  ];
  const martinSessions = [
    sessionInCurrentMonth(3, 15),
    sessionInCurrentMonth(5, 16),
    sessionInCurrentMonth(9, 17)
  ];
  const sofiaSession = sessionInCurrentMonth(10, 16, 50);

  const martinUpcoming = [
    sessionUpcoming(2, 10),
    sessionUpcoming(4, 11),
    sessionUpcoming(6, 12),
    sessionUpcoming(8, 14),
    sessionUpcoming(10, 15)
  ];

  const createdBookings: string[] = [];

  for (const seed of PATIENTS) {
    const { patient } = await ensurePatient(seed, market);

    if (seed.scenario === "package4_all") {
      const trialResult = await createCompletedSession({
        patientId: patient.id,
        professionalId: professional.id,
        purchaseId: null,
        packageId: null,
        startsAt: camilaTrialMay,
        sessionPriceCents: listPriceCents,
        currency,
        consumedCredits: 0,
        bookingKey: `${seed.key}-trial-may`,
        commissionPercent,
        isTrial: true,
        trialCommissionPercent
      });
      createdBookings.push(trialResult.bookingId);

      const purchase = await ensurePurchase({
        patientId: patient.id,
        packageId: pkg4.id,
        totalCredits: 4,
        remainingCredits: 0,
        packageName: pkg4.name,
        packageCredits: 4,
        packagePriceCents: package4Price,
        currency,
        professionalId: professional.id,
        checkoutId: `seed_checkout_${seed.key}_${professional.id.slice(0, 8)}`,
        commissionPercent,
        trialCommissionPercent
      });

      for (let i = 0; i < camilaSessions.length; i += 1) {
        const result = await createCompletedSession({
          patientId: patient.id,
          professionalId: professional.id,
          purchaseId: purchase.id,
          packageId: pkg4.id,
          startsAt: camilaSessions[i]!,
          sessionPriceCents: perSessionFrom4,
          currency,
          consumedCredits: 1,
          bookingKey: `${seed.key}-${i + 1}`,
          commissionPercent
        });
        createdBookings.push(result.bookingId);
      }
    }

    if (seed.scenario === "package8_partial") {
      const trialResult = await createCompletedSession({
        patientId: patient.id,
        professionalId: professional.id,
        purchaseId: null,
        packageId: null,
        startsAt: martinTrialMay,
        sessionPriceCents: listPriceCents,
        currency,
        consumedCredits: 0,
        bookingKey: `${seed.key}-trial-may`,
        commissionPercent,
        isTrial: true,
        trialCommissionPercent
      });
      createdBookings.push(trialResult.bookingId);

      const purchase = await ensurePurchase({
        patientId: patient.id,
        packageId: pkg8.id,
        totalCredits: 8,
        remainingCredits: 0,
        packageName: pkg8.name,
        packageCredits: 8,
        packagePriceCents: package8Price,
        currency,
        professionalId: professional.id,
        checkoutId: `seed_checkout_${seed.key}_${professional.id.slice(0, 8)}`,
        commissionPercent,
        trialCommissionPercent
      });

      for (let i = 0; i < martinSessions.length; i += 1) {
        const result = await createCompletedSession({
          patientId: patient.id,
          professionalId: professional.id,
          purchaseId: purchase.id,
          packageId: pkg8.id,
          startsAt: martinSessions[i]!,
          sessionPriceCents: perSessionFrom8,
          currency,
          consumedCredits: 1,
          bookingKey: `${seed.key}-${i + 1}`,
          commissionPercent
        });
        createdBookings.push(result.bookingId);
      }

      for (let i = 0; i < martinUpcoming.length; i += 1) {
        const upcoming = await createUpcomingBooking({
          patientId: patient.id,
          professionalId: professional.id,
          purchaseId: purchase.id,
          startsAt: martinUpcoming[i]!,
          bookingKey: `${seed.key}-upcoming-${i + 1}`
        });
        createdBookings.push(upcoming.id);
      }
    }

    if (seed.scenario === "individual") {
      const result = await createCompletedSession({
        patientId: patient.id,
        professionalId: professional.id,
        purchaseId: null,
        packageId: null,
        startsAt: sofiaSession,
        sessionPriceCents: listPriceCents,
        currency,
        consumedCredits: 0,
        bookingKey: seed.key,
        commissionPercent,
        isTrial: true,
        trialCommissionPercent
      });
      createdBookings.push(result.bookingId);
    }

    console.log(`  ✓ ${seed.fullName} (${seed.scenario})`);
  }

  const totalFinance = await prisma.financeSessionRecord.count({
    where: { professionalId: professional.id, bookingStatus: BookingStatus.COMPLETED }
  });

  console.log("\nListo.");
  console.log(`  Sesiones financieras COMPLETED del profesional: ${totalFinance}`);
  console.log(`  Bookings tocados en esta corrida: ${createdBookings.length}`);
  console.log("  Pacientes demo (password compartida):", DEMO_PASSWORD);
  console.log("  Emails:", PATIENTS.map((p) => p.email).join(", "));
  console.log("\nVer en portal profesional → Ingresos:");
  console.log("  · Junio: 8 sesiones (paquetes + prueba Sofía)");
  console.log("  · Mayo: 2 sesiones de prueba (Camila y Martín)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
