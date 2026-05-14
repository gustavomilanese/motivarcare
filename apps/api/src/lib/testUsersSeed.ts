import { BookingStatus, ProfessionalRegistrationApproval, type Prisma } from "@prisma/client";
import { marketFromResidencyCountry, userNamePartsFromFullNameString } from "@therapy/types";
import { hashPassword } from "./auth.js";
import { prisma } from "./prisma.js";
import {
  ADMIN_USER_DELETE_TX_OPTIONS,
  hardDeleteUserInTransaction,
  type HardDeleteUserExisting
} from "./hardDeleteUserInTransaction.js";

/**
 * Misma key que usa el admin (`admin.routes.ts`) para guardar el mapping
 * `{ [patientProfileId]: professionalProfileId }`. Inyectar acá garantiza que
 * el portal del paciente vea al profesional asignado al loguearse, así no cae
 * en el flujo de "matching" antes de poder usar Calendar/Meet en el video.
 */
const PATIENT_ACTIVE_ASSIGNMENTS_KEY = "patient-active-assignments";

/**
 * Identidad estable de las cuentas que enviamos a Google App Verification.
 * No conviene cambiarlas en runtime: el reviewer las recibe por mail y las usa
 * tal cual. Si en algún momento hay que renombrarlas, hacerlo coordinado con
 * el ticket de Google.
 */
export const TEST_PATIENT_EMAIL = "motivarcare.test.pac@gmail.com";
export const TEST_PROFESSIONAL_EMAIL = "motivarcare.test.pro@gmail.com";
export const TEST_USERS_DEFAULT_PASSWORD = "MotivarCareTest!2026";

export interface SeedTestUsersOptions {
  /**
   * Si `true`, hace hard-delete de los dos usuarios (y todo su subgrafo) antes
   * de recrearlos: garantiza estado fresco. Si `false`, hace upsert: respeta el
   * historial existente y solo ajusta campos de onboarding.
   */
  purgeBefore?: boolean;
  /** Contraseña común a ambos usuarios. Si vacío, usa `TEST_USERS_DEFAULT_PASSWORD`. */
  password?: string;
}

export interface SeededTestUserSummary {
  email: string;
  userId: string;
  role: "PATIENT" | "PROFESSIONAL";
  /** `true` si se borró-y-recreó el usuario en esta corrida. */
  purged: boolean;
  /** `true` si el usuario no existía y se creó. */
  created: boolean;
}

export interface SeededDemoBookingSummary {
  bookingId: string;
  /** `true` si la booking se creó en esta corrida; `false` si ya existía y se respetó. */
  created: boolean;
  startsAt: Date;
}

export interface SeedTestUsersResult {
  patient: SeededTestUserSummary;
  professional: SeededTestUserSummary;
  /**
   * Booking CONFIRMED futura entre el patient y el professional test. Sirve
   * para que el reviewer vea "tu próxima sesión" al loguearse y pueda
   * demostrar el scope de Google Calendar (sin pasar por el matching).
   */
  demoBooking: SeededDemoBookingSummary;
  /** Echo de la password en claro (para devolverla al admin que la pidió). */
  passwordPlain: string;
}

const PATIENT_RESIDENCY_COUNTRY = "AR";
const PROFESSIONAL_RESIDENCY_COUNTRY = "AR";

/**
 * Respuestas del intake clínico (mismas keys que `INTAKE_CHAT_QUESTIONS`)
 * que dejan el patient con onboarding "completo" y riskLevel="low".
 */
const PATIENT_INTAKE_ANSWERS = {
  mainReason: "Ansiedad",
  therapyGoal: "Reducir ansiedad o estrés",
  therapistPreferences: "No tengo preferencias",
  preferredApproach: "No estoy seguro/a; lo que recomiende el profesional",
  previousTherapy: "No, nunca fui a terapia",
  emotionalState: "Con altibajos",
  supportNetwork: "Apoyo fuerte",
  safetyRisk: "No",
  availability: "Flexible",
  language: "Español"
} as const;

const PROFESSIONAL_PHOTO_URL =
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80";

/**
 * Busca y devuelve el shape mínimo necesario para `hardDeleteUserInTransaction`.
 * Si no existe, devuelve `null` para que el caller decida.
 */
async function findExistingForPurge(email: string): Promise<HardDeleteUserExisting | null> {
  const existing = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      patient: { select: { id: true } },
      professional: { select: { id: true } },
      admin: { select: { id: true } }
    }
  });
  return existing;
}

async function purgeUserIfPresent(email: string): Promise<boolean> {
  const existing = await findExistingForPurge(email);
  if (!existing) return false;
  await prisma.$transaction(async (tx) => {
    await hardDeleteUserInTransaction(tx, existing);
  }, ADMIN_USER_DELETE_TX_OPTIONS);
  return true;
}

async function upsertPatientTestUser(passwordHash: string): Promise<{
  userId: string;
  patientProfileId: string;
  created: boolean;
}> {
  const nameParts = userNamePartsFromFullNameString("Paciente de Prueba");
  const before = await prisma.user.findUnique({ where: { email: TEST_PATIENT_EMAIL }, select: { id: true } });

  const user = await prisma.user.upsert({
    where: { email: TEST_PATIENT_EMAIL },
    update: {
      fullName: nameParts.fullName,
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      role: "PATIENT",
      passwordHash,
      emailVerified: true,
      isActive: true,
      isTestUser: true,
      deactivatedAt: null
    },
    create: {
      email: TEST_PATIENT_EMAIL,
      fullName: nameParts.fullName,
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      role: "PATIENT",
      passwordHash,
      emailVerified: true,
      isActive: true,
      isTestUser: true
    },
    select: { id: true }
  });

  const profile = await prisma.patientProfile.upsert({
    where: { userId: user.id },
    update: {
      residencyCountry: PATIENT_RESIDENCY_COUNTRY,
      market: marketFromResidencyCountry(PATIENT_RESIDENCY_COUNTRY),
      timezone: "America/Argentina/Buenos_Aires",
      status: "active"
    },
    create: {
      userId: user.id,
      residencyCountry: PATIENT_RESIDENCY_COUNTRY,
      market: marketFromResidencyCountry(PATIENT_RESIDENCY_COUNTRY),
      timezone: "America/Argentina/Buenos_Aires",
      status: "active"
    },
    select: { id: true }
  });

  /** Onboarding clínico "submitido" con respuestas seguras (riskLevel=low). */
  await prisma.patientIntake.upsert({
    where: { patientId: profile.id },
    update: {
      riskLevel: "low",
      answers: PATIENT_INTAKE_ANSWERS as unknown as Prisma.InputJsonValue
    },
    create: {
      patientId: profile.id,
      riskLevel: "low",
      answers: PATIENT_INTAKE_ANSWERS as unknown as Prisma.InputJsonValue
    }
  });

  /**
   * Defensivo: si por una corrida previa quedó conectado Google, borramos para
   * que el reviewer SIEMPRE vea el flujo OAuth desde cero al ingresar.
   */
  await prisma.googleCalendarConnection.deleteMany({ where: { userId: user.id } });

  return { userId: user.id, patientProfileId: profile.id, created: !before };
}

async function upsertProfessionalTestUser(passwordHash: string): Promise<{
  userId: string;
  professionalProfileId: string;
  created: boolean;
}> {
  const nameParts = userNamePartsFromFullNameString("Profesional de Prueba");
  const before = await prisma.user.findUnique({ where: { email: TEST_PROFESSIONAL_EMAIL }, select: { id: true } });

  const user = await prisma.user.upsert({
    where: { email: TEST_PROFESSIONAL_EMAIL },
    update: {
      fullName: nameParts.fullName,
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      role: "PROFESSIONAL",
      passwordHash,
      emailVerified: true,
      isActive: true,
      isTestUser: true,
      deactivatedAt: null
    },
    create: {
      email: TEST_PROFESSIONAL_EMAIL,
      fullName: nameParts.fullName,
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      role: "PROFESSIONAL",
      passwordHash,
      emailVerified: true,
      isActive: true,
      isTestUser: true
    },
    select: { id: true }
  });

  const market = marketFromResidencyCountry(PROFESSIONAL_RESIDENCY_COUNTRY);

  const profile = await prisma.professionalProfile.upsert({
    where: { userId: user.id },
    update: {
      market,
      residencyCountry: PROFESSIONAL_RESIDENCY_COUNTRY,
      timezone: "America/Argentina/Buenos_Aires",
      visible: true,
      professionalTitle: "Licenciado en Psicología",
      specialization: "Psicología clínica de adultos",
      experienceBand: "10-15 años",
      practiceBand: "Consultorio privado",
      gender: "Hombre",
      birthCountry: "AR",
      focusPrimary: "Ansiedad, estrés y autoestima",
      focusAreas: ["Ansiedad", "Estrés", "Autoestima"] as unknown as Prisma.InputJsonValue,
      languages: ["Español"] as unknown as Prisma.InputJsonValue,
      bio: "Acompaño a adultos con enfoque cognitivo-conductual. Trabajo ansiedad, estrés, autoestima y procesos de cambio.",
      shortDescription: "Psicólogo clínico — adultos, enfoque CBT.",
      therapeuticApproach: "Cognitivo-conductual integrativo",
      yearsExperience: 12,
      graduationYear: 2014,
      registrationApproval: ProfessionalRegistrationApproval.APPROVED,
      sessionPriceArs: 15_000,
      sessionPriceUsd: 50,
      discount4: 10,
      discount8: 15,
      discount12: 20,
      photoUrl: PROFESSIONAL_PHOTO_URL,
      cancellationHours: 24
    },
    create: {
      userId: user.id,
      market,
      residencyCountry: PROFESSIONAL_RESIDENCY_COUNTRY,
      timezone: "America/Argentina/Buenos_Aires",
      visible: true,
      professionalTitle: "Licenciado en Psicología",
      specialization: "Psicología clínica de adultos",
      experienceBand: "10-15 años",
      practiceBand: "Consultorio privado",
      gender: "Hombre",
      birthCountry: "AR",
      focusPrimary: "Ansiedad, estrés y autoestima",
      focusAreas: ["Ansiedad", "Estrés", "Autoestima"] as unknown as Prisma.InputJsonValue,
      languages: ["Español"] as unknown as Prisma.InputJsonValue,
      bio: "Acompaño a adultos con enfoque cognitivo-conductual. Trabajo ansiedad, estrés, autoestima y procesos de cambio.",
      shortDescription: "Psicólogo clínico — adultos, enfoque CBT.",
      therapeuticApproach: "Cognitivo-conductual integrativo",
      yearsExperience: 12,
      graduationYear: 2014,
      registrationApproval: ProfessionalRegistrationApproval.APPROVED,
      sessionPriceArs: 15_000,
      sessionPriceUsd: 50,
      discount4: 10,
      discount8: 15,
      discount12: 20,
      photoUrl: PROFESSIONAL_PHOTO_URL,
      cancellationHours: 24
    },
    select: { id: true }
  });

  /**
   * Diploma obligatorio para que el perfil parezca "validado" en el directorio.
   * Idempotente: si ya hay diplomas, dejamos los existentes y aseguramos al menos uno.
   */
  const existingDiplomaCount = await prisma.professionalDiploma.count({
    where: { professionalId: profile.id }
  });
  if (existingDiplomaCount === 0) {
    await prisma.professionalDiploma.create({
      data: {
        professionalId: profile.id,
        institution: "Universidad de Buenos Aires",
        degree: "Licenciatura en Psicología",
        startYear: 2009,
        graduationYear: 2014,
        orderIndex: 0
      }
    });
  }

  /** Mismo cuidado que en el paciente: arrancamos sin conexión a Google. */
  await prisma.googleCalendarConnection.deleteMany({ where: { userId: user.id } });

  return { userId: user.id, professionalProfileId: profile.id, created: !before };
}

/**
 * Asigna el patient test al professional test en `SystemConfig`. Esto hace que
 * el portal del paciente vea a "su" profesional ya elegido al iniciar sesión
 * (skip matching), pieza clave para que el video del reviewer no muestre el
 * flujo interno de selección.
 */
async function assignTestPatientToTestProfessional(
  patientProfileId: string,
  professionalProfileId: string
): Promise<void> {
  const existing = await prisma.systemConfig.findUnique({
    where: { key: PATIENT_ACTIVE_ASSIGNMENTS_KEY }
  });

  const currentRaw =
    existing?.value && typeof existing.value === "object" && !Array.isArray(existing.value)
      ? (existing.value as Record<string, unknown>)
      : {};

  /** Conservamos asignaciones ajenas y solo pisamos la nuestra. */
  const merged: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(currentRaw)) {
    if (typeof value === "string" || value === null) {
      merged[key] = value;
    }
  }
  merged[patientProfileId] = professionalProfileId;

  await prisma.systemConfig.upsert({
    where: { key: PATIENT_ACTIVE_ASSIGNMENTS_KEY },
    update: { value: merged as Prisma.InputJsonValue },
    create: {
      key: PATIENT_ACTIVE_ASSIGNMENTS_KEY,
      value: merged as Prisma.InputJsonValue
    }
  });
}

/**
 * Garantiza que el patient test tenga al menos UNA reserva CONFIRMED futura
 * con el professional test. La reserva sale gratis (sin créditos consumidos,
 * sin purchase asociada) — solo sirve como "demo data" para que el reviewer
 * vea su próxima sesión en el dashboard y demuestre el uso del scope de
 * Google Calendar agregándola al calendario.
 *
 * Idempotente: si ya hay una reserva CONFIRMED futura entre ambos, no crea
 * otra para no inundar la base de datos al re-seedear varias veces.
 */
async function ensureFutureConfirmedBooking(
  patientProfileId: string,
  professionalProfileId: string
): Promise<{ bookingId: string; created: boolean; startsAt: Date }> {
  const now = new Date();
  const existing = await prisma.booking.findFirst({
    where: {
      patientId: patientProfileId,
      professionalId: professionalProfileId,
      status: BookingStatus.CONFIRMED,
      startsAt: { gte: now }
    },
    orderBy: { startsAt: "asc" }
  });

  if (existing) {
    return { bookingId: existing.id, created: false, startsAt: existing.startsAt };
  }

  /**
   * Próxima sesión: ~2 días a las 11:00 hs hora Argentina (= 14:00 UTC).
   * Suficientemente lejos como para no chocar contra políticas de cancelación
   * y para que aparezca claro como "upcoming" en el dashboard.
   */
  const startsAt = new Date();
  startsAt.setUTCDate(startsAt.getUTCDate() + 2);
  startsAt.setUTCHours(14, 0, 0, 0);
  const endsAt = new Date(startsAt.getTime() + 50 * 60 * 1000);

  const created = await prisma.booking.create({
    data: {
      patientId: patientProfileId,
      professionalId: professionalProfileId,
      patientTimezoneAtBooking: "America/Argentina/Buenos_Aires",
      professionalTimezoneAtBooking: "America/Argentina/Buenos_Aires",
      startsAt,
      endsAt,
      status: BookingStatus.CONFIRMED,
      consumedCredits: 0
    }
  });

  return { bookingId: created.id, created: true, startsAt: created.startsAt };
}

/**
 * Crea/repone los dos usuarios test de MotivarCare con onboarding completo
 * y SIN conexión a Google Calendar. Pensado para Google App Verification:
 * cuando el reviewer entra, va directo al dashboard y al activar "Conectar
 * Google" ve el consent screen completo (sin Calendar pre-conectado por error).
 *
 * Es idempotente: lo podés correr cuantas veces quieras desde script o desde
 * el endpoint admin. Con `purgeBefore=true` arranca de cero (hard-delete y
 * vuelve a crear); con `purgeBefore=false` solo ajusta campos por upsert.
 */
export async function seedTestUsers(opts: SeedTestUsersOptions = {}): Promise<SeedTestUsersResult> {
  const password = opts.password?.trim() || TEST_USERS_DEFAULT_PASSWORD;
  const passwordHash = hashPassword(password);

  let purgedPatient = false;
  let purgedPro = false;
  if (opts.purgeBefore) {
    purgedPatient = await purgeUserIfPresent(TEST_PATIENT_EMAIL);
    purgedPro = await purgeUserIfPresent(TEST_PROFESSIONAL_EMAIL);
  }

  const patient = await upsertPatientTestUser(passwordHash);
  const professional = await upsertProfessionalTestUser(passwordHash);

  /**
   * Asignación + reserva de demo: en este orden para que cuando el frontend
   * llame a `/api/profiles/me`, ya encuentre tanto el `activeProfessional`
   * como la booking futura.
   */
  await assignTestPatientToTestProfessional(patient.patientProfileId, professional.professionalProfileId);
  const demoBooking = await ensureFutureConfirmedBooking(
    patient.patientProfileId,
    professional.professionalProfileId
  );

  return {
    patient: {
      email: TEST_PATIENT_EMAIL,
      userId: patient.userId,
      role: "PATIENT",
      purged: purgedPatient,
      created: patient.created
    },
    professional: {
      email: TEST_PROFESSIONAL_EMAIL,
      userId: professional.userId,
      role: "PROFESSIONAL",
      purged: purgedPro,
      created: professional.created
    },
    demoBooking,
    passwordPlain: password
  };
}

/**
 * Idempotente: alinea **cualquier** paciente (por `userId`) con el mismo estado base que los usuarios
 * test de Google Verification — intake bajo riesgo, profesional test asignado, reserva CONFIRMED futura,
 * sin Google Calendar conectado. Pensado para staging con `REVIEWER_STAGING_PREP_ENABLED` (sin UI; aplica a todo paciente en ese API).
 */
export async function prepareStagingPatientForReviewerFlow(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { patient: true }
  });

  if (!user || user.role !== "PATIENT" || !user.patient) {
    return;
  }

  const passwordHash = hashPassword(TEST_USERS_DEFAULT_PASSWORD);
  const professional = await upsertProfessionalTestUser(passwordHash);

  const nameParts = userNamePartsFromFullNameString(user.fullName?.trim() || "Paciente Reviewer");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      fullName: nameParts.fullName,
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      emailVerified: true,
      isActive: true
    }
  });

  await prisma.patientProfile.update({
    where: { id: user.patient.id },
    data: {
      residencyCountry: PATIENT_RESIDENCY_COUNTRY,
      market: marketFromResidencyCountry(PATIENT_RESIDENCY_COUNTRY),
      timezone: "America/Argentina/Buenos_Aires",
      status: "active"
    }
  });

  await prisma.patientIntake.upsert({
    where: { patientId: user.patient.id },
    update: {
      riskLevel: "low",
      answers: PATIENT_INTAKE_ANSWERS as unknown as Prisma.InputJsonValue
    },
    create: {
      patientId: user.patient.id,
      riskLevel: "low",
      answers: PATIENT_INTAKE_ANSWERS as unknown as Prisma.InputJsonValue
    }
  });

  await prisma.googleCalendarConnection.deleteMany({ where: { userId: user.id } });

  await assignTestPatientToTestProfessional(user.patient.id, professional.professionalProfileId);
  await ensureFutureConfirmedBooking(user.patient.id, professional.professionalProfileId);
}

/**
 * Staging con `REVIEWER_STAGING_PREP_ENABLED`: deja al profesional listo para el flujo reviewer
 * (email verificado, sin Google Calendar en DB). Idempotente.
 */
export async function prepareStagingProfessionalForReviewerFlow(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { professional: true }
  });

  if (!user || user.role !== "PROFESSIONAL" || !user.professional) {
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      isActive: true
    }
  });

  await prisma.googleCalendarConnection.deleteMany({ where: { userId: user.id } });
}
