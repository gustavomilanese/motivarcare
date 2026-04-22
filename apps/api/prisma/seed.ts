import { marketFromResidencyCountry, userNamePartsFromFullNameString } from "@therapy/types";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/auth.js";

type AppRole = "PATIENT" | "PROFESSIONAL" | "ADMIN";
type SeedContext = {
  patientProfileId: string;
  patientUserId: string;
  professionalProfileIds: [string, string, string];
  professionalUserIds: [string, string, string];
};

const defaultPassword = "SecurePass123";

/**
 * Rutas bajo el API (mismo host/puerto que login). Archivos en `apps/api/public/demo-avatars/`.
 * El cliente (Expo) arma la URL absoluta con su `apiBaseUrl` — evita CDNs bloqueados en el dispositivo.
 */
const DEMO_PATIENT_AVATAR_PATHS = [
  "/api/public/demo-avatars/patient-1.jpg",
  "/api/public/demo-avatars/patient-2.jpg",
  "/api/public/demo-avatars/patient-3.jpg"
] as const;

const DEMO_PRO_PHOTOS = [
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80"
] as const;

function dateFromNow(dayOffset: number, hour: number, minute: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function upsertUser(params: {
  email: string;
  fullName: string;
  role: AppRole;
  /** Si se omite en update, no se modifica el avatar existente. */
  avatarUrl?: string | null;
}) {
  const passwordHash = hashPassword(defaultPassword);
  const nameParts = userNamePartsFromFullNameString(params.fullName);

  return prisma.user.upsert({
    where: { email: params.email },
    update: {
      fullName: nameParts.fullName,
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      role: params.role,
      passwordHash,
      ...(params.avatarUrl !== undefined ? { avatarUrl: params.avatarUrl } : {})
    },
    create: {
      email: params.email,
      fullName: nameParts.fullName,
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      role: params.role,
      passwordHash,
      avatarUrl: params.avatarUrl ?? null
    }
  });
}

async function seedCoreUsers(): Promise<SeedContext> {
  const patientUser = await upsertUser({
    email: "alex@example.com",
    fullName: "Alex Morgan",
    role: "PATIENT",
    avatarUrl: DEMO_PATIENT_AVATAR_PATHS[0]
  });

  const professionalUsers = await Promise.all([
    upsertUser({
      email: "emma.collins@motivarte.com",
      fullName: "Dr. Emma Collins",
      role: "PROFESSIONAL",
      avatarUrl: DEMO_PRO_PHOTOS[0]
    }),
    upsertUser({
      email: "michael.rivera@motivarte.com",
      fullName: "Dr. Michael Rivera",
      role: "PROFESSIONAL",
      avatarUrl: DEMO_PRO_PHOTOS[1]
    }),
    upsertUser({
      email: "sophia.nguyen@motivarte.com",
      fullName: "Dr. Sophia Nguyen",
      role: "PROFESSIONAL",
      avatarUrl: DEMO_PRO_PHOTOS[2]
    })
  ]);

  const adminUser = await upsertUser({
    email: "admin@motivarte.com",
    fullName: "Motivarte Admin",
    role: "ADMIN"
  });

  const alexResidency = "US";
  const patientProfile = await prisma.patientProfile.upsert({
    where: { userId: patientUser.id },
    update: {
      timezone: "America/New_York",
      status: "active",
      residencyCountry: alexResidency,
      market: marketFromResidencyCountry(alexResidency)
    },
    create: {
      userId: patientUser.id,
      timezone: "America/New_York",
      status: "active",
      residencyCountry: alexResidency,
      market: marketFromResidencyCountry(alexResidency)
    }
  });

  const professionalConfigs = [
    {
      userId: professionalUsers[0].id,
      residencyCountry: "AR" as const,
      sessionPriceArs: 15_000,
      sessionPriceUsd: 50,
      bio: "Especialista en ansiedad, estres y burnout laboral.",
      therapeuticApproach: "CBT + mindfulness",
      yearsExperience: 11,
      photoUrl: DEMO_PRO_PHOTOS[0],
      videoUrl: "https://example.com/video/emma"
    },
    {
      userId: professionalUsers[1].id,
      residencyCountry: "US" as const,
      sessionPriceArs: null,
      sessionPriceUsd: 90,
      bio: "Trabajo en vinculos, trauma y regulacion emocional.",
      therapeuticApproach: "Integrativo psicodinamico",
      yearsExperience: 14,
      photoUrl: DEMO_PRO_PHOTOS[1],
      videoUrl: "https://example.com/video/michael"
    },
    {
      userId: professionalUsers[2].id,
      residencyCountry: "US" as const,
      sessionPriceArs: null,
      sessionPriceUsd: 85,
      bio: "Enfoque breve para depresion y transiciones vitales.",
      therapeuticApproach: "Evidencia + plan de objetivos",
      yearsExperience: 9,
      photoUrl: DEMO_PRO_PHOTOS[2],
      videoUrl: "https://example.com/video/sophia"
    }
  ];

  const professionalProfiles: Array<{ id: string; userId: string }> = [];
  for (const config of professionalConfigs) {
    const profile = await prisma.professionalProfile.upsert({
      where: { userId: config.userId },
      update: {
        visible: true,
        residencyCountry: config.residencyCountry,
        market: marketFromResidencyCountry(config.residencyCountry),
        sessionPriceArs: config.sessionPriceArs ?? null,
        sessionPriceUsd: config.sessionPriceUsd,
        bio: config.bio,
        therapeuticApproach: config.therapeuticApproach,
        yearsExperience: config.yearsExperience,
        photoUrl: config.photoUrl,
        videoUrl: config.videoUrl,
        cancellationHours: 24
      },
      create: {
        userId: config.userId,
        visible: true,
        residencyCountry: config.residencyCountry,
        market: marketFromResidencyCountry(config.residencyCountry),
        sessionPriceArs: config.sessionPriceArs ?? null,
        sessionPriceUsd: config.sessionPriceUsd,
        bio: config.bio,
        therapeuticApproach: config.therapeuticApproach,
        yearsExperience: config.yearsExperience,
        photoUrl: config.photoUrl,
        videoUrl: config.videoUrl,
        cancellationHours: 24
      }
    });
    professionalProfiles.push({ id: profile.id, userId: config.userId });
  }

  await prisma.adminProfile.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: { userId: adminUser.id }
  });

  return {
    patientProfileId: patientProfile.id,
    patientUserId: patientUser.id,
    professionalProfileIds: [
      professionalProfiles[0].id,
      professionalProfiles[1].id,
      professionalProfiles[2].id
    ],
    professionalUserIds: [
      professionalUsers[0].id,
      professionalUsers[1].id,
      professionalUsers[2].id
    ]
  };
}

async function seedAvailability(context: SeedContext) {
  const slots = [
    { id: "slot-pro1-1", professionalId: context.professionalProfileIds[0], startsAt: dateFromNow(1, 9, 0), endsAt: dateFromNow(1, 9, 50) },
    { id: "slot-pro1-2", professionalId: context.professionalProfileIds[0], startsAt: dateFromNow(1, 11, 0), endsAt: dateFromNow(1, 11, 50) },
    { id: "slot-pro1-3", professionalId: context.professionalProfileIds[0], startsAt: dateFromNow(2, 16, 30), endsAt: dateFromNow(2, 17, 20) },
    { id: "slot-pro2-1", professionalId: context.professionalProfileIds[1], startsAt: dateFromNow(1, 14, 0), endsAt: dateFromNow(1, 14, 50) },
    { id: "slot-pro2-2", professionalId: context.professionalProfileIds[1], startsAt: dateFromNow(3, 15, 30), endsAt: dateFromNow(3, 16, 20) },
    { id: "slot-pro3-1", professionalId: context.professionalProfileIds[2], startsAt: dateFromNow(2, 17, 0), endsAt: dateFromNow(2, 17, 50) },
    { id: "slot-pro3-2", professionalId: context.professionalProfileIds[2], startsAt: dateFromNow(5, 9, 0), endsAt: dateFromNow(5, 9, 50) }
  ];

  for (const slot of slots) {
    await prisma.availabilitySlot.upsert({
      where: { id: slot.id },
      update: {
        professionalId: slot.professionalId,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        isBlocked: false,
        source: "seed"
      },
      create: {
        id: slot.id,
        professionalId: slot.professionalId,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        isBlocked: false,
        source: "seed"
      }
    });
  }
}

async function seedPackagesAndPurchase(context: SeedContext) {
  await prisma.sessionPackage.upsert({
    where: { market_stripePriceId: { market: "AR", stripePriceId: "pkg-1-demo" } },
    update: {
      name: "1 sesión — precio de lista",
      credits: 1,
      priceCents: 12000,
      discountPercent: 0,
      currency: "ars",
      active: true,
      paymentProvider: "MERCADOPAGO"
    },
    create: {
      market: "AR",
      paymentProvider: "MERCADOPAGO",
      stripePriceId: "pkg-1-demo",
      name: "1 sesión — precio de lista",
      credits: 1,
      priceCents: 12000,
      discountPercent: 0,
      currency: "ars",
      active: true
    }
  });

  await prisma.sessionPackage.upsert({
    where: { market_stripePriceId: { market: "AR", stripePriceId: "pkg-4-demo" } },
    update: {
      name: "Inicio - 4 sesiones",
      credits: 4,
      priceCents: 3_600_000,
      discountPercent: 30,
      currency: "ars",
      active: true,
      paymentProvider: "MERCADOPAGO"
    },
    create: {
      market: "AR",
      paymentProvider: "MERCADOPAGO",
      stripePriceId: "pkg-4-demo",
      name: "Inicio - 4 sesiones",
      credits: 4,
      priceCents: 3_600_000,
      discountPercent: 30,
      currency: "ars",
      active: true
    }
  });

  await prisma.sessionPackage.upsert({
    where: { market_stripePriceId: { market: "AR", stripePriceId: "pkg-8-demo" } },
    update: {
      name: "Continuidad - 8 sesiones",
      credits: 8,
      priceCents: 6_800_000,
      discountPercent: 36,
      currency: "ars",
      active: true,
      paymentProvider: "MERCADOPAGO"
    },
    create: {
      market: "AR",
      paymentProvider: "MERCADOPAGO",
      stripePriceId: "pkg-8-demo",
      name: "Continuidad - 8 sesiones",
      credits: 8,
      priceCents: 6_800_000,
      discountPercent: 36,
      currency: "ars",
      active: true
    }
  });

  await prisma.sessionPackage.upsert({
    where: { market_stripePriceId: { market: "AR", stripePriceId: "pkg-12-demo" } },
    update: {
      name: "Intensivo - 12 sesiones",
      credits: 12,
      priceCents: 9_600_000,
      discountPercent: 40,
      currency: "ars",
      active: true,
      paymentProvider: "MERCADOPAGO"
    },
    create: {
      market: "AR",
      paymentProvider: "MERCADOPAGO",
      stripePriceId: "pkg-12-demo",
      name: "Intensivo - 12 sesiones",
      credits: 12,
      priceCents: 9_600_000,
      discountPercent: 40,
      currency: "ars",
      active: true
    }
  });

  await prisma.sessionPackage.upsert({
    where: { market_stripePriceId: { market: "US", stripePriceId: "us-pkg-4-demo" } },
    update: {
      name: "Starter - 4 sessions (US)",
      credits: 4,
      priceCents: 36000,
      discountPercent: 30,
      currency: "usd",
      active: true,
      paymentProvider: "STRIPE"
    },
    create: {
      market: "US",
      paymentProvider: "STRIPE",
      stripePriceId: "us-pkg-4-demo",
      name: "Starter - 4 sessions (US)",
      credits: 4,
      priceCents: 36000,
      discountPercent: 30,
      currency: "usd",
      active: true
    }
  });

  await prisma.sessionPackage.upsert({
    where: { market_stripePriceId: { market: "US", stripePriceId: "us-pkg-8-demo" } },
    update: {
      name: "Continuity - 8 sessions (US)",
      credits: 8,
      priceCents: 68000,
      discountPercent: 36,
      currency: "usd",
      active: true,
      paymentProvider: "STRIPE"
    },
    create: {
      market: "US",
      paymentProvider: "STRIPE",
      stripePriceId: "us-pkg-8-demo",
      name: "Continuity - 8 sessions (US)",
      credits: 8,
      priceCents: 68000,
      discountPercent: 36,
      currency: "usd",
      active: true
    }
  });

  await prisma.sessionPackage.upsert({
    where: { market_stripePriceId: { market: "US", stripePriceId: "us-pkg-12-demo" } },
    update: {
      name: "Intensive - 12 sessions (US)",
      credits: 12,
      priceCents: 96000,
      discountPercent: 40,
      currency: "usd",
      active: true,
      paymentProvider: "STRIPE"
    },
    create: {
      market: "US",
      paymentProvider: "STRIPE",
      stripePriceId: "us-pkg-12-demo",
      name: "Intensive - 12 sessions (US)",
      credits: 12,
      priceCents: 96000,
      discountPercent: 40,
      currency: "usd",
      active: true
    }
  });

  for (const row of [
    {
      market: "BR" as const,
      stripePriceId: "br-pkg-4-demo",
      name: "Inicio - 4 sessões (BR)",
      credits: 4,
      priceCents: 199_000,
      discountPercent: 30,
      currency: "brl"
    },
    {
      market: "BR" as const,
      stripePriceId: "br-pkg-8-demo",
      name: "Continuidade - 8 sessões (BR)",
      credits: 8,
      priceCents: 379_000,
      discountPercent: 36,
      currency: "brl"
    },
    {
      market: "BR" as const,
      stripePriceId: "br-pkg-12-demo",
      name: "Intensivo - 12 sessões (BR)",
      credits: 12,
      priceCents: 529_000,
      discountPercent: 40,
      currency: "brl"
    },
    {
      market: "ES" as const,
      stripePriceId: "es-pkg-4-demo",
      name: "Inicio - 4 sesiones (ES)",
      credits: 4,
      priceCents: 33_600,
      discountPercent: 30,
      currency: "eur"
    },
    {
      market: "ES" as const,
      stripePriceId: "es-pkg-8-demo",
      name: "Continuidad - 8 sesiones (ES)",
      credits: 8,
      priceCents: 63_200,
      discountPercent: 36,
      currency: "eur"
    },
    {
      market: "ES" as const,
      stripePriceId: "es-pkg-12-demo",
      name: "Intensivo - 12 sesiones (ES)",
      credits: 12,
      priceCents: 89_600,
      discountPercent: 40,
      currency: "eur"
    }
  ]) {
    await prisma.sessionPackage.upsert({
      where: { market_stripePriceId: { market: row.market, stripePriceId: row.stripePriceId } },
      update: {
        name: row.name,
        credits: row.credits,
        priceCents: row.priceCents,
        discountPercent: row.discountPercent,
        currency: row.currency,
        active: true,
        paymentProvider: "STRIPE"
      },
      create: {
        market: row.market,
        paymentProvider: "STRIPE",
        stripePriceId: row.stripePriceId,
        name: row.name,
        credits: row.credits,
        priceCents: row.priceCents,
        discountPercent: row.discountPercent,
        currency: row.currency,
        active: true
      }
    });
  }

  const growthPackage = await prisma.sessionPackage.findUniqueOrThrow({
    where: { market_stripePriceId: { market: "AR", stripePriceId: "pkg-8-demo" } }
  });

  await prisma.patientPackagePurchase.upsert({
    where: { stripeCheckoutSessionId: "checkout-demo-1" },
    update: {
      patientId: context.patientProfileId,
      packageId: growthPackage.id,
      totalCredits: 8,
      remainingCredits: 7
    },
    create: {
      patientId: context.patientProfileId,
      packageId: growthPackage.id,
      stripeCheckoutSessionId: "checkout-demo-1",
      totalCredits: 8,
      remainingCredits: 7
    }
  });
}

/** Pacientes extra con el mismo profesional demo (Emma) para listas admin / portal pro. */
async function seedExtraDemoPatientsWithEmma(context: SeedContext) {
  const emmaProfessionalId = context.professionalProfileIds[0];

  const luciaUser = await upsertUser({
    email: "lucia.torres@example.com",
    fullName: "Lucía Torres",
    role: "PATIENT",
    avatarUrl: DEMO_PATIENT_AVATAR_PATHS[1]
  });
  const marcosUser = await upsertUser({
    email: "marcos.diaz@example.com",
    fullName: "Marcos Díaz",
    role: "PATIENT",
    avatarUrl: DEMO_PATIENT_AVATAR_PATHS[2]
  });

  const luciaResidency = "AR";
  const luciaProfile = await prisma.patientProfile.upsert({
    where: { userId: luciaUser.id },
    update: {
      timezone: "America/Argentina/Buenos_Aires",
      status: "active",
      residencyCountry: luciaResidency,
      market: marketFromResidencyCountry(luciaResidency)
    },
    create: {
      userId: luciaUser.id,
      timezone: "America/Argentina/Buenos_Aires",
      status: "active",
      residencyCountry: luciaResidency,
      market: marketFromResidencyCountry(luciaResidency)
    }
  });
  const marcosResidency = "MX";
  const marcosProfile = await prisma.patientProfile.upsert({
    where: { userId: marcosUser.id },
    update: {
      timezone: "America/Mexico_City",
      status: "active",
      residencyCountry: marcosResidency,
      market: marketFromResidencyCountry(marcosResidency)
    },
    create: {
      userId: marcosUser.id,
      timezone: "America/Mexico_City",
      status: "active",
      residencyCountry: marcosResidency,
      market: marketFromResidencyCountry(marcosResidency)
    }
  });

  const luciaStart = dateFromNow(2, 10, 0);
  const luciaEnd = dateFromNow(2, 10, 50);
  const marcosStart = dateFromNow(3, 15, 0);
  const marcosEnd = dateFromNow(3, 15, 50);

  await prisma.booking.upsert({
    where: { id: "booking-demo-lucia-1" },
    update: {
      patientId: luciaProfile.id,
      professionalId: emmaProfessionalId,
      startsAt: luciaStart,
      endsAt: luciaEnd,
      status: "CONFIRMED",
      consumedCredits: 1,
      cancellationReason: null,
      cancelledAt: null,
      completedAt: null
    },
    create: {
      id: "booking-demo-lucia-1",
      patientId: luciaProfile.id,
      professionalId: emmaProfessionalId,
      startsAt: luciaStart,
      endsAt: luciaEnd,
      status: "CONFIRMED",
      consumedCredits: 1
    }
  });

  await prisma.booking.upsert({
    where: { id: "booking-demo-marcos-1" },
    update: {
      patientId: marcosProfile.id,
      professionalId: emmaProfessionalId,
      startsAt: marcosStart,
      endsAt: marcosEnd,
      status: "CONFIRMED",
      consumedCredits: 1,
      cancellationReason: null,
      cancelledAt: null,
      completedAt: null
    },
    create: {
      id: "booking-demo-marcos-1",
      patientId: marcosProfile.id,
      professionalId: emmaProfessionalId,
      startsAt: marcosStart,
      endsAt: marcosEnd,
      status: "CONFIRMED",
      consumedCredits: 1
    }
  });
}

async function seedBookingAndChat(context: SeedContext) {
  const startsAt = dateFromNow(1, 9, 0);
  const endsAt = dateFromNow(1, 9, 50);

  await prisma.booking.upsert({
    where: { id: "booking-demo-1" },
    update: {
      patientId: context.patientProfileId,
      professionalId: context.professionalProfileIds[0],
      startsAt,
      endsAt,
      status: "CONFIRMED",
      consumedCredits: 1,
      cancellationReason: null,
      cancelledAt: null,
      completedAt: null
    },
    create: {
      id: "booking-demo-1",
      patientId: context.patientProfileId,
      professionalId: context.professionalProfileIds[0],
      startsAt,
      endsAt,
      status: "CONFIRMED",
      consumedCredits: 1
    }
  });

  await prisma.videoSession.upsert({
    where: { bookingId: "booking-demo-1" },
    update: {
      provider: "daily",
      externalRoomId: "session-booking-demo-1",
      joinUrlPatient: "https://demo.daily.co/session-booking-demo-1?role=patient",
      joinUrlProfessional: "https://demo.daily.co/session-booking-demo-1?role=professional"
    },
    create: {
      bookingId: "booking-demo-1",
      provider: "daily",
      externalRoomId: "session-booking-demo-1",
      joinUrlPatient: "https://demo.daily.co/session-booking-demo-1?role=patient",
      joinUrlProfessional: "https://demo.daily.co/session-booking-demo-1?role=professional"
    }
  });

  const thread = await prisma.chatThread.upsert({
    where: { bookingId: "booking-demo-1" },
    update: {
      patientId: context.patientProfileId,
      professionalId: context.professionalProfileIds[0],
      bookingId: "booking-demo-1"
    },
    create: {
      patientId: context.patientProfileId,
      professionalId: context.professionalProfileIds[0],
      bookingId: "booking-demo-1"
    }
  });

  await prisma.chatMessage.upsert({
    where: { id: "msg-demo-1" },
    update: {
      threadId: thread.id,
      senderUserId: context.professionalUserIds[0],
      body: "Hola Alex, tengo disponibilidad para una intro call breve antes de la sesion completa.",
      readAt: null
    },
    create: {
      id: "msg-demo-1",
      threadId: thread.id,
      senderUserId: context.professionalUserIds[0],
      body: "Hola Alex, tengo disponibilidad para una intro call breve antes de la sesion completa."
    }
  });
}

async function main() {
  const context = await seedCoreUsers();
  await seedAvailability(context);
  await seedPackagesAndPurchase(context);
  await seedBookingAndChat(context);
  await seedExtraDemoPatientsWithEmma(context);

  console.log("Seed completed. Demo credentials (avatares de prueba Unsplash; reemplazar en producción):");
  console.log("- Patient: alex@example.com / SecurePass123");
  console.log("- Patient: lucia.torres@example.com / SecurePass123");
  console.log("- Patient: marcos.diaz@example.com / SecurePass123");
  console.log("- Professional Emma: emma.collins@motivarte.com / SecurePass123");
  console.log("- Professional Michael: michael.rivera@motivarte.com / SecurePass123");
  console.log("- Professional Sophia: sophia.nguyen@motivarte.com / SecurePass123");
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
