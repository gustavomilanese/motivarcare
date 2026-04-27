import { env } from "../../config/env.js";
import { sendResendEmail } from "../../lib/resendSend.js";

type BookingEmailEvent = "professional_rescheduled" | "professional_cancelled";

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(value);
}

function buildEmailContent(params: {
  event: BookingEmailEvent;
  patientName: string;
  professionalName: string;
  previousStartsAt: Date;
  nextStartsAt?: Date;
  reason?: string | null;
}) {
  if (params.event === "professional_rescheduled") {
    const subject = "Tu sesión fue reprogramada";
    const nextDate = params.nextStartsAt ? formatDateTime(params.nextStartsAt) : "(sin horario)";
    const previousDate = formatDateTime(params.previousStartsAt);
    const reasonLine = params.reason && params.reason.trim().length > 0
      ? `<p><strong>Motivo:</strong> ${params.reason.trim()}</p>`
      : "";

    const html = [
      `<p>Hola ${params.patientName},</p>`,
      `<p>Tu profesional <strong>${params.professionalName}</strong> reprogramó tu sesión.</p>`,
      `<p><strong>Horario anterior:</strong> ${previousDate}</p>`,
      `<p><strong>Nuevo horario:</strong> ${nextDate}</p>`,
      reasonLine,
      "<p>Si necesitás un cambio adicional, podés responder desde el chat de la plataforma.</p>"
    ].join("");

    const text = [
      `Hola ${params.patientName},`,
      `Tu profesional ${params.professionalName} reprogramó tu sesión.`,
      `Horario anterior: ${previousDate}`,
      `Nuevo horario: ${nextDate}`,
      params.reason && params.reason.trim().length > 0 ? `Motivo: ${params.reason.trim()}` : "",
      "Si necesitás un cambio adicional, podés responder desde el chat de la plataforma."
    ].filter(Boolean).join("\n");

    return { subject, html, text };
  }

  const subject = "Tu sesión fue cancelada";
  const cancelledDate = formatDateTime(params.previousStartsAt);
  const reasonLine = params.reason && params.reason.trim().length > 0
    ? `<p><strong>Motivo:</strong> ${params.reason.trim()}</p>`
    : "";

  const html = [
    `<p>Hola ${params.patientName},</p>`,
    `<p>Tu profesional <strong>${params.professionalName}</strong> canceló la sesión agendada para <strong>${cancelledDate}</strong>.</p>`,
    reasonLine,
    "<p>Puedes reservar un nuevo horario desde tu portal cuando quieras.</p>"
  ].join("");

  const text = [
    `Hola ${params.patientName},`,
    `Tu profesional ${params.professionalName} canceló la sesión agendada para ${cancelledDate}.`,
    params.reason && params.reason.trim().length > 0 ? `Motivo: ${params.reason.trim()}` : "",
    "Puedes reservar un nuevo horario desde tu portal cuando quieras."
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}

export async function sendPatientBookingLifecycleEmail(params: {
  event: BookingEmailEvent;
  patientEmail: string;
  patientName: string;
  professionalName: string;
  previousStartsAt: Date;
  nextStartsAt?: Date;
  reason?: string | null;
}): Promise<{ delivered: boolean }> {
  if (!env.RESEND_API_KEY) {
    console.info("Booking lifecycle email skipped: RESEND_API_KEY not configured", {
      event: params.event,
      patientEmail: params.patientEmail
    });
    return { delivered: false };
  }

  const content = buildEmailContent(params);

  await sendResendEmail({
    to: params.patientEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
    tags: [{ name: "event", value: params.event }]
  });

  return { delivered: true };
}
