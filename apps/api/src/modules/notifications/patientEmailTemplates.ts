import { env } from "../../config/env.js";
import {
  buildEmailDetailCard,
  buildEmailNoteBox,
  buildMotivarCareEmailLayout,
  escapeHtml
} from "../../lib/emailHtml.js";
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

function sessionDetailCard(params: {
  professionalName: string;
  when: string;
  previousWhen?: string;
  reason?: string | null;
}): string {
  const rows = [{ label: "Profesional", value: params.professionalName }];

  if (params.previousWhen) {
    rows.push({ label: "Horario anterior", value: params.previousWhen });
  }

  rows.push({ label: params.previousWhen ? "Nuevo horario" : "Fecha y hora", value: params.when });

  let body = buildEmailDetailCard(rows);

  if (params.reason?.trim()) {
    body += `<div style="margin:14px 0 0 0;">${buildEmailNoteBox(`<strong>Motivo:</strong> ${escapeHtml(params.reason.trim())}`, "info")}</div>`;
  }

  return body;
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
  const sessionsUrl = portalLink("/sessions");
  const chatUrl = portalLink("/chat");
  const joinUrl = params.joinUrl?.trim() || null;
  const joinLabel = joinUrl ? "Unirme a la videollamada" : "Ver mis sesiones";
  const joinHref = joinUrl ?? sessionsUrl;
  const joinText = joinUrl ? `Unirme: ${joinUrl}` : `Ver sesiones: ${sessionsUrl}`;

  switch (params.eventType) {
    case "booking_confirmed":
      return {
        subject: "Sesión confirmada",
        html: buildMotivarCareEmailLayout({
          badge: "Confirmación",
          headline: "Tu sesión quedó confirmada",
          greetingName: name,
          introParagraphs: ["Te esperamos en el horario acordado. Guardá este correo para tener a mano el acceso."],
          bodyHtml: sessionDetailCard({ professionalName: pro, when }),
          primaryCta: { label: joinLabel, href: joinHref },
          secondaryCta: { label: "Escribirle a tu profesional", href: chatUrl },
          fallbackLink: joinHref
        }),
        text: [
          `Hola ${name},`,
          `Tu sesión con ${pro} quedó confirmada para ${when}.`,
          joinText,
          `Chat: ${chatUrl}`
        ].join("\n")
      };

    case "booking_reminder_24h":
      return {
        subject: "Recordatorio: sesión mañana",
        html: buildMotivarCareEmailLayout({
          badge: "Recordatorio",
          headline: "Tu sesión es mañana",
          greetingName: name,
          introParagraphs: ["Te recordamos que mañana tenés una sesión programada en MotivarCare."],
          bodyHtml: sessionDetailCard({ professionalName: pro, when }),
          primaryCta: { label: joinLabel, href: joinHref },
          fallbackLink: joinHref
        }),
        text: [`Hola ${name},`, `Mañana tenés sesión con ${pro} el ${when}.`, joinText].join("\n")
      };

    case "booking_reminder_1h":
      return {
        subject: "Tu sesión empieza en 1 hora",
        html: buildMotivarCareEmailLayout({
          badge: "Empieza pronto",
          headline: "Tu sesión empieza en 1 hora",
          greetingName: name,
          introParagraphs: ["Preparate un espacio tranquilo y revisá que tu conexión esté lista."],
          bodyHtml: sessionDetailCard({ professionalName: pro, when }),
          primaryCta: { label: joinLabel, href: joinHref },
          fallbackLink: joinHref
        }),
        text: [`Hola ${name},`, `Tu sesión con ${pro} empieza en ~1 hora (${when}).`, joinText].join("\n")
      };

    case "booking_cancelled": {
      const cancelledWhen = params.previousStartsAt
        ? formatPatientEmailDateTime(params.previousStartsAt, params.timeZone)
        : when;

      return {
        subject: "Tu sesión fue cancelada",
        html: buildMotivarCareEmailLayout({
          badge: "Cancelación",
          headline: "Tu sesión fue cancelada",
          greetingName: name,
          introParagraphs: [`${pro} canceló la sesión que tenías agendada.`],
          bodyHtml: sessionDetailCard({
            professionalName: pro,
            when: cancelledWhen,
            reason: params.reason
          }),
          primaryCta: { label: "Reservar un nuevo horario", href: sessionsUrl },
          fallbackLink: sessionsUrl
        }),
        text: [
          `Hola ${name},`,
          `${pro} canceló la sesión del ${cancelledWhen}.`,
          params.reason?.trim() ? `Motivo: ${params.reason.trim()}` : "",
          `Reservar: ${sessionsUrl}`
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

      return {
        subject: "Tu sesión fue reprogramada",
        html: buildMotivarCareEmailLayout({
          badge: "Cambio de horario",
          headline: "Tu sesión fue reprogramada",
          greetingName: name,
          introParagraphs: [`${pro} actualizó el horario de tu próxima sesión.`],
          bodyHtml: sessionDetailCard({
            professionalName: pro,
            when: to,
            previousWhen: from || undefined,
            reason: params.reason
          }),
          primaryCta: { label: joinLabel, href: joinHref },
          fallbackLink: joinHref
        }),
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

    case "purchase_confirmed": {
      const packageName = params.packageName ?? "paquete de sesiones";
      const rows = [{ label: "Paquete", value: packageName }];
      if (params.credits) {
        rows.push({ label: "Créditos disponibles", value: String(params.credits) });
      }
      if (params.amountLabel) {
        rows.push({ label: "Total abonado", value: params.amountLabel });
      }

      return {
        subject: "Compra confirmada",
        html: buildMotivarCareEmailLayout({
          badge: "Compra",
          headline: "Tu compra fue confirmada",
          greetingName: name,
          introParagraphs: ["Ya podés reservar tus sesiones desde el portal."],
          bodyHtml: buildEmailDetailCard(rows),
          primaryCta: { label: "Reservar sesión", href: sessionsUrl },
          fallbackLink: sessionsUrl
        }),
        text: [
          `Hola ${name},`,
          `Compra confirmada: ${packageName}.`,
          params.credits ? `Créditos: ${params.credits}` : "",
          params.amountLabel ? `Total: ${params.amountLabel}` : "",
          `Reservar: ${sessionsUrl}`
        ]
          .filter(Boolean)
          .join("\n")
      };
    }

    case "payment_failed":
      return {
        subject: "No pudimos procesar tu pago",
        html: buildMotivarCareEmailLayout({
          badge: "Pago pendiente",
          headline: "No pudimos procesar tu pago",
          greetingName: name,
          introParagraphs: ["El pago no se completó. Podés revisar tu método de pago e intentar nuevamente."],
          bodyHtml: params.failureMessage?.trim()
            ? buildEmailNoteBox(`<strong>Detalle:</strong> ${escapeHtml(params.failureMessage.trim())}`, "warning")
            : undefined,
          primaryCta: { label: "Reintentar compra", href: portalLink("/sessions?purchase=individual") },
          fallbackLink: portalLink("/sessions?purchase=individual")
        }),
        text: [
          `Hola ${name},`,
          `El pago no se completó${params.failureMessage ? `: ${params.failureMessage}` : "."}`,
          `Reintentar: ${portalLink("/sessions?purchase=individual")}`
        ].join("\n")
      };

    case "professional_assigned":
      return {
        subject: "Tu profesional asignado",
        html: buildMotivarCareEmailLayout({
          badge: "Tu equipo",
          headline: "Conocé a tu profesional",
          greetingName: name,
          introParagraphs: [
            `${pro} es tu profesional en MotivarCare.`,
            "Podés escribirle cuando quieras desde el chat del portal."
          ],
          bodyHtml: buildEmailDetailCard([{ label: "Profesional asignado", value: pro }]),
          primaryCta: { label: "Ir al chat", href: chatUrl },
          fallbackLink: chatUrl
        }),
        text: [`Hola ${name},`, `${pro} es tu profesional.`, `Chat: ${chatUrl}`].join("\n")
      };

    default:
      return {
        subject: "MotivarCare",
        html: buildMotivarCareEmailLayout({
          headline: "MotivarCare",
          greetingName: name
        }),
        text: `Hola ${name},`
      };
  }
}
