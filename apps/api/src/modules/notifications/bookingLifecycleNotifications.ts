import { prisma } from "../../lib/prisma.js";
import { sendPatientBookingLifecycleEmail } from "./patientEmailNotifications.js";
import { sendPatientInAppBookingNotification } from "./patientInAppNotifications.js";

type BookingLifecycleEvent = "professional_rescheduled" | "professional_cancelled";

export async function notifyPatientOnProfessionalBookingChange(params: {
  bookingId: string;
  event: BookingLifecycleEvent;
  previousStartsAt: Date;
  nextStartsAt?: Date;
  reason?: string | null;
}): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId },
    include: {
      patient: {
        include: {
          user: {
            select: {
              email: true,
              fullName: true
            }
          }
        }
      },
      professional: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true
            }
          }
        }
      }
    }
  });

  if (!booking) {
    return;
  }

  await Promise.allSettled([
    sendPatientInAppBookingNotification({
      event: params.event,
      patientId: booking.patientId,
      professionalId: booking.professionalId,
      professionalUserId: booking.professional.user.id,
      bookingId: booking.id,
      professionalName: booking.professional.user.fullName,
      previousStartsAt: params.previousStartsAt,
      nextStartsAt: params.nextStartsAt,
      reason: params.reason
    }),
    sendPatientBookingLifecycleEmail({
      event: params.event,
      patientEmail: booking.patient.user.email,
      patientName: booking.patient.user.fullName,
      professionalName: booking.professional.user.fullName,
      previousStartsAt: params.previousStartsAt,
      nextStartsAt: params.nextStartsAt,
      reason: params.reason
    })
  ]);
}
