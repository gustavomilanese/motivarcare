import { env } from "../../config/env.js";
import { sendResendEmail } from "../../lib/resendSend.js";
import { prisma } from "../../lib/prisma.js";
import { buildPatientEmailContent } from "./patientEmailTemplates.js";
import {
  getPatientEmailPlatformSettings,
  platformEmailEventEnabled
} from "./patientEmailPlatformSettings.service.js";
import { patientEmailPrefGate, type PatientEmailEventType } from "./patientEmailTypes.js";

export function patientEmailDedupeKey(eventType: PatientEmailEventType, id: string): string {
  return `patient-email:${eventType}:${id}`;
}

async function recordDelivery(params: {
  patientId: string;
  dedupeKey: string;
  eventType: PatientEmailEventType;
  bookingId?: string | null;
}): Promise<void> {
  await prisma.patientEmailDelivery.create({
    data: {
      patientId: params.patientId,
      dedupeKey: params.dedupeKey,
      eventType: params.eventType,
      bookingId: params.bookingId ?? null
    }
  });
}

export async function sendPatientTransactionalEmail(params: {
  eventType: PatientEmailEventType;
  dedupeKey: string;
  patientId: string;
  patientEmail: string;
  patientName: string;
  notificationsEmail: boolean;
  notificationsReminder: boolean;
  bookingId?: string | null;
  professionalName?: string;
  startsAt?: Date;
  previousStartsAt?: Date;
  nextStartsAt?: Date;
  joinUrl?: string | null;
  reason?: string | null;
  packageName?: string;
  credits?: number;
  amountLabel?: string;
  failureMessage?: string;
  timeZone?: string | null;
}): Promise<{ delivered: boolean; skipped?: string }> {
  if (!env.RESEND_API_KEY) {
    console.info("Patient email skipped: RESEND_API_KEY not configured", {
      eventType: params.eventType,
      patientId: params.patientId
    });
    return { delivered: false, skipped: "resend_not_configured" };
  }

  if (!params.patientEmail.trim()) {
    return { delivered: false, skipped: "missing_email" };
  }

  const platformSettings = await getPatientEmailPlatformSettings();
  if (!platformEmailEventEnabled(platformSettings, params.eventType)) {
    return { delivered: false, skipped: "platform_disabled" };
  }

  if (
    !patientEmailPrefGate(params.eventType, {
      notificationsEmail: params.notificationsEmail,
      notificationsReminder: params.notificationsReminder
    })
  ) {
    return { delivered: false, skipped: "preference_disabled" };
  }

  const existing = await prisma.patientEmailDelivery.findUnique({
    where: { dedupeKey: params.dedupeKey },
    select: { id: true }
  });
  if (existing) {
    return { delivered: false, skipped: "already_sent" };
  }

  const content = buildPatientEmailContent({
    eventType: params.eventType,
    patientName: params.patientName,
    professionalName: params.professionalName,
    startsAt: params.startsAt,
    previousStartsAt: params.previousStartsAt,
    nextStartsAt: params.nextStartsAt,
    joinUrl: params.joinUrl,
    reason: params.reason,
    packageName: params.packageName,
    credits: params.credits,
    amountLabel: params.amountLabel,
    failureMessage: params.failureMessage,
    timeZone: params.timeZone
  });

  await sendResendEmail({
    to: params.patientEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
    tags: [{ name: "event", value: params.eventType }]
  });

  await recordDelivery({
    patientId: params.patientId,
    dedupeKey: params.dedupeKey,
    eventType: params.eventType,
    bookingId: params.bookingId
  });

  return { delivered: true };
}

export async function sendPatientEmailForBooking(params: {
  bookingId: string;
  eventType: Extract<
    PatientEmailEventType,
    "booking_confirmed" | "booking_reminder_24h" | "booking_reminder_1h" | "booking_cancelled" | "booking_rescheduled"
  >;
  previousStartsAt?: Date;
  nextStartsAt?: Date;
  reason?: string | null;
}): Promise<{ delivered: boolean; skipped?: string }> {
  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId },
    include: {
      patient: {
        include: {
          user: { select: { email: true, fullName: true } }
        }
      },
      professional: {
        include: {
          user: { select: { fullName: true } }
        }
      },
      videoSession: { select: { joinUrlPatient: true } }
    }
  });

  if (!booking?.patient) {
    return { delivered: false, skipped: "booking_not_found" };
  }

  const dedupeKey = patientEmailDedupeKey(params.eventType, params.bookingId);

  return sendPatientTransactionalEmail({
    eventType: params.eventType,
    dedupeKey,
    patientId: booking.patientId,
    patientEmail: booking.patient.user.email,
    patientName: booking.patient.user.fullName,
    notificationsEmail: booking.patient.notificationsEmail,
    notificationsReminder: booking.patient.notificationsReminder,
    bookingId: booking.id,
    professionalName: booking.professional.user.fullName,
    startsAt: booking.startsAt,
    previousStartsAt: params.previousStartsAt ?? booking.startsAt,
    nextStartsAt: params.nextStartsAt,
    joinUrl: booking.videoSession?.joinUrlPatient ?? null,
    reason: params.reason,
    timeZone: booking.patientTimezoneAtBooking ?? booking.patient.timezone
  });
}

export async function sendPatientEmailForPurchase(params: {
  purchaseId: string;
}): Promise<{ delivered: boolean; skipped?: string }> {
  const purchase = await prisma.patientPackagePurchase.findUnique({
    where: { id: params.purchaseId },
    include: {
      patient: {
        include: {
          user: { select: { email: true, fullName: true } }
        }
      },
      sessionPackage: { select: { name: true } }
    }
  });

  if (!purchase?.patient) {
    return { delivered: false, skipped: "purchase_not_found" };
  }

  const currency = (purchase.packageCurrencySnapshot ?? "usd").toUpperCase();
  const amountCents = purchase.packagePriceCentsSnapshot ?? 0;
  const amountLabel =
    amountCents > 0
      ? new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(amountCents / 100)
      : undefined;

  return sendPatientTransactionalEmail({
    eventType: "purchase_confirmed",
    dedupeKey: patientEmailDedupeKey("purchase_confirmed", purchase.id),
    patientId: purchase.patientId,
    patientEmail: purchase.patient.user.email,
    patientName: purchase.patient.user.fullName,
    notificationsEmail: purchase.patient.notificationsEmail,
    notificationsReminder: purchase.patient.notificationsReminder,
    packageName: purchase.packageNameSnapshot ?? purchase.sessionPackage.name,
    credits: purchase.remainingCredits,
    amountLabel
  });
}

export async function sendPatientEmailForPaymentFailed(params: {
  patientId: string;
  checkoutSessionId: string;
  failureMessage?: string;
}): Promise<{ delivered: boolean; skipped?: string }> {
  const patient = await prisma.patientProfile.findUnique({
    where: { id: params.patientId },
    include: {
      user: { select: { email: true, fullName: true } }
    }
  });

  if (!patient) {
    return { delivered: false, skipped: "patient_not_found" };
  }

  return sendPatientTransactionalEmail({
    eventType: "payment_failed",
    dedupeKey: patientEmailDedupeKey("payment_failed", params.checkoutSessionId),
    patientId: patient.id,
    patientEmail: patient.user.email,
    patientName: patient.user.fullName,
    notificationsEmail: patient.notificationsEmail,
    notificationsReminder: patient.notificationsReminder,
    failureMessage: params.failureMessage
  });
}

export async function sendPatientEmailForProfessionalAssigned(params: {
  patientId: string;
  professionalId: string;
}): Promise<{ delivered: boolean; skipped?: string }> {
  const [patient, professional] = await Promise.all([
    prisma.patientProfile.findUnique({
      where: { id: params.patientId },
      include: { user: { select: { email: true, fullName: true } } }
    }),
    prisma.professionalProfile.findUnique({
      where: { id: params.professionalId },
      include: { user: { select: { fullName: true } } }
    })
  ]);

  if (!patient || !professional) {
    return { delivered: false, skipped: "not_found" };
  }

  return sendPatientTransactionalEmail({
    eventType: "professional_assigned",
    dedupeKey: patientEmailDedupeKey("professional_assigned", `${params.patientId}:${params.professionalId}`),
    patientId: patient.id,
    patientEmail: patient.user.email,
    patientName: patient.user.fullName,
    notificationsEmail: patient.notificationsEmail,
    notificationsReminder: patient.notificationsReminder,
    professionalName: professional.user.fullName
  });
}
