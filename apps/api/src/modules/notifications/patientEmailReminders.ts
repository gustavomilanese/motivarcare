import { prisma } from "../../lib/prisma.js";
import { getPatientEmailPlatformSettings, reminderWindowMs } from "./patientEmailPlatformSettings.service.js";
import { sendPatientEmailForBooking } from "./patientEmailService.js";

async function processReminderWindow(params: {
  eventType: "booking_reminder_24h" | "booking_reminder_1h";
  minMs: number;
  maxMs: number;
}): Promise<number> {
  const now = Date.now();
  const minStartsAt = new Date(now + params.minMs);
  const maxStartsAt = new Date(now + params.maxMs);

  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      startsAt: {
        gte: minStartsAt,
        lte: maxStartsAt
      }
    },
    select: { id: true }
  });

  let sent = 0;
  for (const booking of bookings) {
    const result = await sendPatientEmailForBooking({
      bookingId: booking.id,
      eventType: params.eventType
    });
    if (result.delivered) {
      sent += 1;
    }
  }
  return sent;
}

export async function runPatientEmailReminderBatch(): Promise<{
  sent24h: number;
  sent1h: number;
  cronPollMinutes: number;
}> {
  const settings = await getPatientEmailPlatformSettings();
  const windows = reminderWindowMs(settings);

  let sent24h = 0;
  let sent1h = 0;

  if (windows.reminder24h) {
    sent24h = await processReminderWindow({
      eventType: "booking_reminder_24h",
      minMs: windows.reminder24h.minMs,
      maxMs: windows.reminder24h.maxMs
    });
  }

  if (windows.reminder1h) {
    sent1h = await processReminderWindow({
      eventType: "booking_reminder_1h",
      minMs: windows.reminder1h.minMs,
      maxMs: windows.reminder1h.maxMs
    });
  }

  return { sent24h, sent1h, cronPollMinutes: settings.cronPollMinutes };
}
