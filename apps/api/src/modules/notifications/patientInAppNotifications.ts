import { prisma } from "../../lib/prisma.js";

type InAppEvent = "professional_rescheduled" | "professional_cancelled";

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(value);
}

function buildMessage(params: {
  event: InAppEvent;
  professionalName: string;
  previousStartsAt: Date;
  nextStartsAt?: Date;
  reason?: string | null;
}): string {
  if (params.event === "professional_rescheduled") {
    const nextDate = params.nextStartsAt ? formatDateTime(params.nextStartsAt) : "sin horario";
    const previousDate = formatDateTime(params.previousStartsAt);
    const reasonPart = params.reason && params.reason.trim().length > 0
      ? ` Motivo: ${params.reason.trim()}`
      : "";

    return `Tu profesional ${params.professionalName} reprogramó tu sesión de ${previousDate} a ${nextDate}.${reasonPart}`;
  }

  const cancelledDate = formatDateTime(params.previousStartsAt);
  const reasonPart = params.reason && params.reason.trim().length > 0
    ? ` Motivo: ${params.reason.trim()}`
    : "";

  return `Tu profesional ${params.professionalName} canceló tu sesión de ${cancelledDate}.${reasonPart}`;
}

export async function sendPatientInAppBookingNotification(params: {
  event: InAppEvent;
  patientId: string;
  professionalId: string;
  professionalUserId: string;
  bookingId: string;
  professionalName: string;
  previousStartsAt: Date;
  nextStartsAt?: Date;
  reason?: string | null;
}): Promise<void> {
  const thread = await prisma.chatThread.findFirst({
    where: {
      patientId: params.patientId,
      professionalId: params.professionalId
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true }
  });

  const threadId = thread?.id
    ?? (
      await prisma.chatThread.create({
        data: {
          patientId: params.patientId,
          professionalId: params.professionalId,
          bookingId: params.bookingId
        },
        select: { id: true }
      })
    ).id;

  await prisma.chatMessage.create({
    data: {
      threadId,
      senderUserId: params.professionalUserId,
      body: buildMessage({
        event: params.event,
        professionalName: params.professionalName,
        previousStartsAt: params.previousStartsAt,
        nextStartsAt: params.nextStartsAt,
        reason: params.reason
      })
    }
  });
}
