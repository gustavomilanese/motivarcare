import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/auth.js";

type AppRole = "PATIENT" | "PROFESSIONAL" | "ADMIN";

const defaultPassword = "SecurePass123";

function dateFromNow(dayOffset: number, hour: number, minute: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function upsertUser(params: {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
}) {
  const passwordHash = hashPassword(defaultPassword);

  return prisma.user.upsert({
    where: { email: params.email },
    update: {
      fullName: params.fullName,
      role: params.role,
      passwordHash
    },
    create: {
      id: params.id,
      email: params.email,
      fullName: params.fullName,
      role: params.role,
      passwordHash
    }
  });
}

async function seedCoreUsers() {
  const patientUser = await upsertUser({
    id: "user-pat-1",
    email: "alex@example.com",
    fullName: "Alex Morgan",
      role: "PATIENT"
  });

  const professionalUsers = await Promise.all([
    upsertUser({
      id: "user-pro-1",
      email: "emma.collins@motivarte.com",
      fullName: "Dr. Emma Collins",
      role: "PROFESSIONAL"
    }),
    upsertUser({
      id: "user-pro-2",
      email: "michael.rivera@motivarte.com",
      fullName: "Dr. Michael Rivera",
      role: "PROFESSIONAL"
    }),
    upsertUser({
      id: "user-pro-3",
      email: "sophia.nguyen@motivarte.com",
      fullName: "Dr. Sophia Nguyen",
      role: "PROFESSIONAL"
    })
  ]);

  await upsertUser({
    id: "user-admin-1",
    email: "admin@motivarte.com",
    fullName: "Motivarte Admin",
    role: "ADMIN"
  });

  await prisma.patientProfile.upsert({
    where: { userId: patientUser.id },
    update: {
      timezone: "America/New_York",
      status: "active"
    },
    create: {
      id: "pat-1",
      userId: patientUser.id,
      timezone: "America/New_York",
      status: "active"
    }
  });

  const professionalConfigs = [
    {
      id: "pro-1",
      userId: professionalUsers[0].id,
      bio: "Especialista en ansiedad, estres y burnout laboral.",
      therapeuticApproach: "CBT + mindfulness",
      yearsExperience: 11,
      photoUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80",
      videoUrl: "https://example.com/video/emma"
    },
    {
      id: "pro-2",
      userId: professionalUsers[1].id,
      bio: "Trabajo en vinculos, trauma y regulacion emocional.",
      therapeuticApproach: "Integrativo psicodinamico",
      yearsExperience: 14,
      photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80",
      videoUrl: "https://example.com/video/michael"
    },
    {
      id: "pro-3",
      userId: professionalUsers[2].id,
      bio: "Enfoque breve para depresion y transiciones vitales.",
      therapeuticApproach: "Evidencia + plan de objetivos",
      yearsExperience: 9,
      photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80",
      videoUrl: "https://example.com/video/sophia"
    }
  ];

  for (const config of professionalConfigs) {
    await prisma.professionalProfile.upsert({
      where: { userId: config.userId },
      update: {
        visible: true,
        bio: config.bio,
        therapeuticApproach: config.therapeuticApproach,
        yearsExperience: config.yearsExperience,
        photoUrl: config.photoUrl,
        videoUrl: config.videoUrl,
        cancellationHours: 24
      },
      create: {
        id: config.id,
        userId: config.userId,
        visible: true,
        bio: config.bio,
        therapeuticApproach: config.therapeuticApproach,
        yearsExperience: config.yearsExperience,
        photoUrl: config.photoUrl,
        videoUrl: config.videoUrl,
        cancellationHours: 24
      }
    });
  }

  await prisma.adminProfile.upsert({
    where: { userId: "user-admin-1" },
    update: {},
    create: { userId: "user-admin-1" }
  });
}

async function seedAvailability() {
  const slots = [
    { id: "slot-pro1-1", professionalId: "pro-1", startsAt: dateFromNow(1, 9, 0), endsAt: dateFromNow(1, 9, 50) },
    { id: "slot-pro1-2", professionalId: "pro-1", startsAt: dateFromNow(1, 11, 0), endsAt: dateFromNow(1, 11, 50) },
    { id: "slot-pro1-3", professionalId: "pro-1", startsAt: dateFromNow(2, 16, 30), endsAt: dateFromNow(2, 17, 20) },
    { id: "slot-pro2-1", professionalId: "pro-2", startsAt: dateFromNow(1, 14, 0), endsAt: dateFromNow(1, 14, 50) },
    { id: "slot-pro2-2", professionalId: "pro-2", startsAt: dateFromNow(3, 15, 30), endsAt: dateFromNow(3, 16, 20) },
    { id: "slot-pro3-1", professionalId: "pro-3", startsAt: dateFromNow(2, 17, 0), endsAt: dateFromNow(2, 17, 50) },
    { id: "slot-pro3-2", professionalId: "pro-3", startsAt: dateFromNow(5, 9, 0), endsAt: dateFromNow(5, 9, 50) }
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

async function seedPackagesAndPurchase() {
  await prisma.sessionPackage.upsert({
    where: { stripePriceId: "pkg-4-demo" },
    update: { name: "Inicio - 4 sesiones", credits: 4, priceCents: 36000, discountPercent: 30, currency: "usd", active: true },
    create: { stripePriceId: "pkg-4-demo", name: "Inicio - 4 sesiones", credits: 4, priceCents: 36000, discountPercent: 30, currency: "usd", active: true }
  });

  await prisma.sessionPackage.upsert({
    where: { stripePriceId: "pkg-8-demo" },
    update: { name: "Continuidad - 8 sesiones", credits: 8, priceCents: 68000, discountPercent: 36, currency: "usd", active: true },
    create: { stripePriceId: "pkg-8-demo", name: "Continuidad - 8 sesiones", credits: 8, priceCents: 68000, discountPercent: 36, currency: "usd", active: true }
  });

  await prisma.sessionPackage.upsert({
    where: { stripePriceId: "pkg-12-demo" },
    update: { name: "Intensivo - 12 sesiones", credits: 12, priceCents: 96000, discountPercent: 40, currency: "usd", active: true },
    create: { stripePriceId: "pkg-12-demo", name: "Intensivo - 12 sesiones", credits: 12, priceCents: 96000, discountPercent: 40, currency: "usd", active: true }
  });

  const growthPackage = await prisma.sessionPackage.findUniqueOrThrow({ where: { stripePriceId: "pkg-8-demo" } });

  await prisma.patientPackagePurchase.upsert({
    where: { stripeCheckoutSessionId: "checkout-demo-1" },
    update: {
      patientId: "pat-1",
      packageId: growthPackage.id,
      totalCredits: 8,
      remainingCredits: 7
    },
    create: {
      id: "purchase-demo-1",
      patientId: "pat-1",
      packageId: growthPackage.id,
      stripeCheckoutSessionId: "checkout-demo-1",
      totalCredits: 8,
      remainingCredits: 7
    }
  });
}

async function seedBookingAndChat() {
  const startsAt = dateFromNow(1, 9, 0);
  const endsAt = dateFromNow(1, 9, 50);

  await prisma.booking.upsert({
    where: { id: "booking-demo-1" },
    update: {
      patientId: "pat-1",
      professionalId: "pro-1",
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
      patientId: "pat-1",
      professionalId: "pro-1",
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
      id: "video-demo-1",
      bookingId: "booking-demo-1",
      provider: "daily",
      externalRoomId: "session-booking-demo-1",
      joinUrlPatient: "https://demo.daily.co/session-booking-demo-1?role=patient",
      joinUrlProfessional: "https://demo.daily.co/session-booking-demo-1?role=professional"
    }
  });

  await prisma.chatThread.upsert({
    where: { id: "thread-demo-1" },
    update: {
      patientId: "pat-1",
      professionalId: "pro-1",
      bookingId: "booking-demo-1"
    },
    create: {
      id: "thread-demo-1",
      patientId: "pat-1",
      professionalId: "pro-1",
      bookingId: "booking-demo-1"
    }
  });

  await prisma.chatMessage.upsert({
    where: { id: "msg-demo-1" },
    update: {
      threadId: "thread-demo-1",
      senderUserId: "user-pro-1",
      body: "Hola Alex, tengo disponibilidad para una intro call breve antes de la sesion completa.",
      readAt: null
    },
    create: {
      id: "msg-demo-1",
      threadId: "thread-demo-1",
      senderUserId: "user-pro-1",
      body: "Hola Alex, tengo disponibilidad para una intro call breve antes de la sesion completa."
    }
  });
}

async function main() {
  await seedCoreUsers();
  await seedAvailability();
  await seedPackagesAndPurchase();
  await seedBookingAndChat();

  console.log("Seed completed. Demo credentials:");
  console.log("- Patient: alex@example.com / SecurePass123");
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
