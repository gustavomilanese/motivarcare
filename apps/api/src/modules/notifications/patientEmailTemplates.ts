import { env } from "../../config/env.js";
import type { PatientEmailEventType } from "./patientEmailTypes.js";

export function formatPatientEmailDateTime(value: Date, timeZone?: string | null): string {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timeZone ?? undefined
  }).format(value);
}

function portalLink(path = ""): string {
  const base = env.PATIENT_APP_URL.replace(/\/$/, "");
  return path ? `${base}${path.startsWith("/") ? path : `/${path}`}` : base;
}

export function buildPatientEmailContent(params: {
  eventType: PatientEmailEventType;
  patientName: string;
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
}): { subject: string; html: string; text: string } {
  const name = params.patientName.trim() || "Hola";
  const pro = params.professionalName?.trim() ?? "tu profesional";
  const when = params.startsAt ? formatPatientEmailDateTime(params.startsAt, params.timeZone) : "";
  const joinBlock = params.joinUrl
    ? `<p><a href="${params.joinUrl}">Unirme a la videollamada</a></p>`
    : `<p><a href="${portalLink("/sessions")}">Ver mis sesiones</a></p>`;
  const joinText = params.joinUrl
    ? `Unirme: ${params.joinUrl}`
    : `Ver sesiones: ${portalLink("/sessions")}`;

  switch (params.eventType) {
    case "booking_confirmed":
      return {
        subject: "Sesión confirmada",
        html: [
          `<p>Hola ${name},</p>`,
          `<p>Tu sesión con <strong>${pro}</strong> quedó confirmada para <strong>${when}</strong>.</p>`,
          joinBlock,
          `<p><a href="${portalLink("/chat")}">Escribirle a tu profesional</a></p>`
        ].join(""),
        text: [
          `Hola ${name},`,
          `Tu sesión con ${pro} quedó confirmada para ${when}.`,
          joinText,
          `Chat: ${portalLink("/chat")}`
        ].join("\n")
      };

    case "booking_reminder_24h":
      return {
        subject: "Recordatorio: sesión mañana",
        html: [
          `<p>Hola ${name},</p>`,
          `<p>Te recordamos que mañana tenés sesión con <strong>${pro}</strong> el <strong>${when}</strong>.</p>`,
          joinBlock
        ].join(""),
        text: [`Hola ${name},`, `Mañana tenés sesión con ${pro} el ${when}.`, joinText].join("\n")
      };

    case "booking_reminder_1h":
      return {
        subject: "Tu sesión empieza en 1 hora",
        html: [
          `<p>Hola ${name},</p>`,
          `<p>Tu sesión con <strong>${pro}</strong> empieza en aproximadamente 1 hora (${when}).</p>`,
          joinBlock
        ].join(""),
        text: [`Hola ${name},`, `Tu sesión con ${pro} empieza en ~1 hora (${when}).`, joinText].join("\n")
      };

    case "booking_cancelled": {
      const cancelledWhen = params.previousStartsAt
        ? formatPatientEmailDateTime(params.previousStartsAt, params.timeZone)
        : when;
      const reasonLine =
        params.reason && params.reason.trim().length > 0
          ? `<p><strong>Motivo:</strong> ${params.reason.trim()}</p>`
          : "";
      return {
        subject: "Tu sesión fue cancelada",
        html: [
          `<p>Hola ${name},</p>`,
          `<p><strong>${pro}</strong> canceló la sesión agendada para <strong>${cancelledWhen}</strong>.</p>`,
          reasonLine,
          `<p><a href="${portalLink("/sessions")}">Reservar un nuevo horario</a></p>`
        ].join(""),
        text: [
          `Hola ${name},`,
          `${pro} canceló la sesión del ${cancelledWhen}.`,
          params.reason?.trim() ? `Motivo: ${params.reason.trim()}` : "",
          `Reservar: ${portalLink("/sessions")}`
        ]
          .filter(Boolean)
          .join("\n")
      };
    }

    case "booking_rescheduled": {
      const from = params.previousStartsAt
        ? formatPatientEmailDateTime(params.previousStartsAt, params.timeZone)
        : "";
      const to = params.nextStartsAt ? formatPatientEmailDateTime(params.nextStartsAt, params.timeZone) : when;
      const reasonLine =
        params.reason && params.reason.trim().length > 0
          ? `<p><strong>Motivo:</strong> ${params.reason.trim()}</p>`
          : "";
      return {
        subject: "Tu sesión fue reprogramada",
        html: [
          `<p>Hola ${name},</p>`,
          `<p><strong>${pro}</strong> reprogramó tu sesión.</p>`,
          from ? `<p><strong>Horario anterior:</strong> ${from}</p>` : "",
          `<p><strong>Nuevo horario:</strong> ${to}</p>`,
          reasonLine,
          joinBlock
        ].join(""),
        text: [
          `Hola ${name},`,
          `${pro} reprogramó tu sesión.`,
          from ? `Horario anterior: ${from}` : "",
          `Nuevo horario: ${to}`,
          params.reason?.trim() ? `Motivo: ${params.reason.trim()}` : "",
          joinText
        ]
          .filter(Boolean)
          .join("\n")
      };
    }

    case "purchase_confirmed":
      return {
        subject: "Compra confirmada",
        html: [
          `<p>Hola ${name},</p>`,
          `<p>Recibimos tu compra de <strong>${params.packageName ?? "paquete de sesiones"}</strong>.</p>`,
          params.credits ? `<p>Créditos disponibles: <strong>${params.credits}</strong></p>` : "",
          params.amountLabel ? `<p>Total: ${params.amountLabel}</p>` : "",
          `<p><a href="${portalLink("/sessions")}">Reservar sesión</a></p>`
        ].join(""),
        text: [
          `Hola ${name},`,
          `Compra confirmada: ${params.packageName ?? "paquete"}.`,
          params.credits ? `Créditos: ${params.credits}` : "",
          params.amountLabel ? `Total: ${params.amountLabel}` : "",
          `Reservar: ${portalLink("/sessions")}`
        ]
          .filter(Boolean)
          .join("\n")
      };

    case "payment_failed":
      return {
        subject: "No pudimos procesar tu pago",
        html: [
          `<p>Hola ${name},</p>`,
          `<p>El pago no se completó${params.failureMessage ? `: ${params.failureMessage}` : "."}</p>`,
          `<p>Revisá tu método de pago e intentá de nuevo desde el portal.</p>`,
          `<p><a href="${portalLink("/sessions?purchase=individual")}">Reintentar compra</a></p>`
        ].join(""),
        text: [
          `Hola ${name},`,
          `El pago no se completó${params.failureMessage ? `: ${params.failureMessage}` : "."}`,
          `Reintentar: ${portalLink("/sessions?purchase=individual")}`
        ].join("\n")
      };

    case "professional_assigned":
      return {
        subject: "Tu profesional asignado",
        html: [
          `<p>Hola ${name},</p>`,
          `<p><strong>${pro}</strong> es tu profesional en MotivarCare.</p>`,
          `<p>Podés escribirle cuando quieras desde el chat del portal.</p>`,
          `<p><a href="${portalLink("/chat")}">Ir al chat</a></p>`
        ].join(""),
        text: [`Hola ${name},`, `${pro} es tu profesional.`, `Chat: ${portalLink("/chat")}`].join("\n")
      };

    default:
      return { subject: "MotivarCare", html: `<p>Hola ${name},</p>`, text: `Hola ${name},` };
  }
}
