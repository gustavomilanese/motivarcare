import { prisma } from "../../lib/prisma.js";

/**
 * Contexto que se inyecta en el system prompt del treatment-chat para que el
 * asistente pueda responder consultas operativas básicas ("¿cuándo es mi
 * próxima sesión?", "¿con qué profesional?", "¿cuántos créditos me quedan?")
 * y personalizar la conversación con el primer nombre del paciente.
 *
 * Diseño:
 * - Se calcula a partir de fuentes ya existentes en DB. Sin tablas nuevas.
 * - Es DATA-ONLY: no se persiste, se lee fresh en cada request del chat
 *   (dos lecturas por turno: una para el LLM y otra eventual para safety).
 *   Los costos de DB son chicos (todas las queries usan índices existentes).
 * - Si un dato falta, se omite del prompt en lugar de inventar valores.
 */
export interface TreatmentChatPatientContext {
  patientFirstName: string | null;
  /** IANA timezone (ej. "America/Argentina/Buenos_Aires"). */
  timezone: string;
  /** ISO 3166-1 alpha-2 (ej. "AR", "US", "BR"); útil para referencias de emergencia regionales. */
  residencyCountry: string | null;
  /** Profesional con el que el paciente tiene actividad reciente (último booking). */
  assignedProfessional: {
    fullName: string;
    professionalTitle: string | null;
  } | null;
  /** Próximo turno del paciente (REQUESTED o CONFIRMED) que aún no terminó. */
  nextSession: {
    startsAtIso: string;
    /** ISO 4-digit year-month-day-hour-minute, ya formateado en TZ del paciente. */
    startsAtLocalLabel: string;
    professionalFullName: string;
    /** "REQUESTED" | "CONFIRMED". */
    status: string;
  } | null;
  /** Total de créditos remanentes sumando todas las purchases activas. */
  creditsRemaining: number;
}

/**
 * Carga el contexto operativo del paciente. Pensado para llamarse antes de
 * cada request al LLM. No cachea: privilegiamos consistencia (que el chat
 * refleje un booking que se acaba de mover, por ejemplo) sobre throughput.
 */
export async function loadPatientContext(patientId: string): Promise<TreatmentChatPatientContext> {
  const now = new Date();

  const [patient, nextBooking, creditsAgg, mostRecentBookingProfessional] = await Promise.all([
    prisma.patientProfile.findUnique({
      where: { id: patientId },
      include: {
        user: { select: { firstName: true, fullName: true } }
      }
    }),
    /**
     * Próximo turno: el primero ordenado ASC con status REQUESTED o CONFIRMED y
     * que todavía no terminó. Cubre el caso "sesión hoy en 2 horas".
     */
    prisma.booking.findFirst({
      where: {
        patientId,
        status: { in: ["REQUESTED", "CONFIRMED"] },
        endsAt: { gte: now }
      },
      orderBy: { startsAt: "asc" },
      include: {
        professional: {
          include: {
            user: { select: { fullName: true } }
          }
        }
      }
    }),
    prisma.patientPackagePurchase.aggregate({
      where: { patientId },
      _sum: { remainingCredits: true }
    }),
    /**
     * Profesional "asignado": el último booking del paciente (cualquier estado).
     * No tenemos un campo dedicado en PatientProfile, así que lo inferimos.
     * Si hay nextBooking, eso ya tiene professional; si no, fallback a este.
     */
    prisma.booking.findFirst({
      where: { patientId },
      orderBy: { startsAt: "desc" },
      include: {
        professional: {
          include: {
            user: { select: { fullName: true } }
          }
        }
      }
    })
  ]);

  const timezone = patient?.lastSeenTimezone ?? patient?.timezone ?? "America/New_York";

  const assignedProfessional = nextBooking?.professional
    ? {
        fullName: nextBooking.professional.user.fullName,
        professionalTitle: nextBooking.professional.professionalTitle ?? null
      }
    : mostRecentBookingProfessional?.professional
      ? {
          fullName: mostRecentBookingProfessional.professional.user.fullName,
          professionalTitle: mostRecentBookingProfessional.professional.professionalTitle ?? null
        }
      : null;

  const nextSession = nextBooking
    ? {
        startsAtIso: nextBooking.startsAt.toISOString(),
        startsAtLocalLabel: formatDateInTimezone(nextBooking.startsAt, timezone),
        professionalFullName: nextBooking.professional.user.fullName,
        status: nextBooking.status
      }
    : null;

  const creditsRemaining = creditsAgg._sum.remainingCredits ?? 0;

  return {
    patientFirstName:
      patient?.user.firstName?.trim()?.length
        ? patient.user.firstName.trim()
        : (patient?.user.fullName?.split(" ")[0] ?? null),
    timezone,
    residencyCountry: patient?.residencyCountry ?? null,
    assignedProfessional,
    nextSession,
    creditsRemaining
  };
}

/**
 * Formato amigable en TZ del paciente. Ej "lunes 28 de abril, 18:30".
 *
 * Usamos `Intl.DateTimeFormat` con locale fijo `es-AR` porque el prompt es
 * neutro y el LLM se adapta al idioma del usuario; lo importante es que la
 * fecha sea correcta en el huso horario del paciente.
 */
function formatDateInTimezone(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone
    }).format(date);
  } catch {
    /** TZ inválida: degradamos a UTC en formato mínimo. */
    return new Intl.DateTimeFormat("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC"
    }).format(date);
  }
}
