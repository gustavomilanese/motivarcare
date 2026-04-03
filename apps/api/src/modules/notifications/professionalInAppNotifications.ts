import { prisma } from "../../lib/prisma.js";

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(value);
}

function normalizeReason(reason: string | null | undefined): string | null {
  const raw = (reason ?? "").trim();
  if (!raw || raw === "patient_cancelled") {
    return null;
  }
  return raw;
}

export async function sendProfessionalInAppBookingCancellation(params: {
  patientId: string;
  professionalId: string;
  patientUserId: string;
  bookingId: string;
  patientName: string;
  previousStartsAt: Date;
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

  const formattedDate = formatDateTime(params.previousStartsAt);
  const reason = normalizeReason(params.reason);
  const reasonPart = reason ? ` Motivo: ${reason}` : "";
  const body = `${params.patientName} canceló su sesión del ${formattedDate}.${reasonPart}`;

  await prisma.chatMessage.create({
    data: {
      threadId,
      senderUserId: params.patientUserId,
      body
    }
  });
}

