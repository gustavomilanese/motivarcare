import { ProfessionalRegistrationApproval } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { isPrismaUniqueViolation } from "../../lib/prismaUserError.js";
import { sendResendEmail } from "../../lib/resendSend.js";

export type ProfessionalRegistrationApprovalEmailStatus =
  | "PENDING"
  | "IN_REVIEW"
  | "NEEDS_CHANGES"
  | "APPROVED"
  | "REJECTED";

function buildNeedsChangesEmailHtml(params: {
  fullName: string;
  supportEmail: string;
  portalUrl: string;
  reason?: string | null;
}): string {
  const name = escapeHtml(params.fullName.trim() || "profesional");
  const support = escapeHtml(params.supportEmail);
  const supportHref = escapeHtmlAttr(`mailto:${params.supportEmail}`);
  const reasonText = params.reason?.trim() || "";
  const reasonBlock = reasonText
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0 0 0;"><tr><td style="padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;text-align:left;"><p style="margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#64748b;">Qué necesitamos</p><p style="margin:8px 0 0 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#0f1731;">${escapeHtml(reasonText)}</p></td></tr></table>`
    : "";

  const bodyHtml = `
<p style="margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3d4a63;text-align:center;">Hola ${name},</p>
<p style="margin:16px 0 0 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3d4a63;text-align:center;">Revisamos tu perfil y <strong style="color:#0f1731;">necesitamos algunos cambios</strong> antes de poder aprobarlo.</p>
${reasonBlock}
<p style="margin:18px 0 0 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3d4a63;text-align:center;">Ingresá al portal, corregí lo indicado y reenviá tu alta. Volverá a la cola de revisión automáticamente.</p>
<p style="margin:16px 0 0 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#62708a;text-align:center;">Si necesitás ayuda, escribinos a <a href="${supportHref}" style="color:#5f44eb;font-weight:600;text-decoration:none;">${support}</a>.</p>`;

  return emailShell({
    title: "Necesitamos cambios en tu alta",
    accentBar: "#f59e0b",
    bodyHtml,
    ctaLabel: "Ingresar y corregir",
    ctaUrl: params.portalUrl,
    footerNote: escapeHtml("Tu cuenta sigue activa. Cuando reenvíes, el equipo vuelve a revisar tu perfil.")
  });
}

function buildHardRejectedEmailHtml(params: {
  fullName: string;
  supportEmail: string;
  reason?: string | null;
}): string {
  const name = escapeHtml(params.fullName.trim() || "profesional");
  const support = escapeHtml(params.supportEmail);
  const supportHref = escapeHtmlAttr(`mailto:${params.supportEmail}`);
  const reasonText = params.reason?.trim() || "";
  const reasonBlock = reasonText
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0 0 0;"><tr><td style="padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;text-align:left;"><p style="margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#64748b;">Motivo</p><p style="margin:8px 0 0 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#0f1731;">${escapeHtml(reasonText)}</p></td></tr></table>`
    : "";

  const bodyHtml = `
<p style="margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3d4a63;text-align:center;">Hola ${name},</p>
<p style="margin:16px 0 0 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3d4a63;text-align:center;">Gracias por tu interés en MotivarCare. Tras revisar tu solicitud, <strong style="color:#0f1731;">en esta oportunidad no podemos aprobar tu alta</strong>.</p>
${reasonBlock}
<p style="margin:18px 0 0 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3d4a63;text-align:center;">Si creés que hubo un error, escribinos a <a href="${supportHref}" style="color:#5f44eb;font-weight:600;text-decoration:none;">${support}</a>.</p>`;

  return emailShell({
    title: "Actualización sobre tu alta",
    accentBar: "#94a3b8",
    bodyHtml,
    ctaLabel: "Contactar soporte",
    ctaUrl: `mailto:${params.supportEmail}`,
    footerNote: escapeHtml("Apreciamos tu confianza y te deseamos lo mejor en tu práctica profesional.")
  });
}

export const PROFESSIONAL_PENDING_REGISTRATION_EMAIL_SENT_TYPE = "professional_pending_registration_email_sent";

function addBusinessDays(from: Date, businessDays: number): Date {
  const result = new Date(from.getTime());
  let remaining = Math.max(0, Math.floor(businessDays));
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      remaining -= 1;
    }
  }
  return result;
}

function formatPendingReviewDeadlineLabel(profileCreatedAt: Date): string {
  const deadline = addBusinessDays(profileCreatedAt, 5);
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(deadline);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeHtmlAttr(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function professionalPortalUrl(): string {
  const base = env.PROFESSIONAL_APP_URL.trim().replace(/\/+$/, "");
  return base || "https://pro.motivarcare.com";
}

function emailShell(params: {
  title: string;
  accentBar?: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote: string;
}): string {
  const hrefAttr = escapeHtmlAttr(params.ctaUrl);
  const portalText = escapeHtml(params.ctaUrl);
  const title = escapeHtml(params.title);
  const accent = params.accentBar ?? "#5f44eb";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#eef0f9;font-family:Georgia,'Times New Roman',serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef0f9;padding:36px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:540px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 18px 48px rgba(56,52,92,0.12);">
<tr><td style="height:6px;background:${accent};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:32px 32px 8px 32px;text-align:center;">
<p style="margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.12em;color:#5f44eb;text-transform:uppercase;">MotivarCare</p>
</td></tr>
<tr><td style="padding:12px 32px 4px 32px;text-align:center;">
<h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;font-weight:700;color:#0f1731;">${title}</h1>
</td></tr>
<tr><td style="padding:18px 32px 8px 32px;">
${params.bodyHtml}
</td></tr>
<tr><td style="padding:28px 32px 8px 32px;text-align:center;">
<a href="${hrefAttr}" style="display:inline-block;padding:14px 28px;background-color:#5f44eb;color:#ffffff;text-decoration:none;border-radius:8px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;box-shadow:0 8px 24px rgba(95,68,235,0.28);">${escapeHtml(params.ctaLabel)}</a>
</td></tr>
<tr><td style="padding:20px 32px 32px 32px;text-align:center;">
<p style="margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.55;color:#62708a;">${params.footerNote}</p>
<p style="margin:16px 0 0 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.45;color:#94a3b8;word-break:break-all;">Si el botón no funciona, copiá y pegá este enlace:<br><span style="color:#5f44eb;">${portalText}</span></p>
</td></tr>
</table>
<p style="margin:22px 0 0 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#94a3b8;text-align:center;">© MotivarCare · Terapia online</p>
</td></tr>
</table>
</body>
</html>`;
}

function buildApprovedEmailHtml(params: { fullName: string; portalUrl: string }): string {
  const name = escapeHtml(params.fullName.trim() || "profesional");
  const bodyHtml = `
<p style="margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3d4a63;text-align:center;">Hola ${name},</p>
<p style="margin:16px 0 0 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3d4a63;text-align:center;">Revisamos tu solicitud con cuidado y tenemos una buena noticia: <strong style="color:#0f1731;">tu perfil profesional ya está aprobado</strong> en MotivarCare.</p>
<p style="margin:16px 0 0 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3d4a63;text-align:center;">Ingresá al portal para publicar tu disponibilidad, revisar tu perfil y empezar a recibir pacientes cuando estés listo.</p>`;

  return emailShell({
    title: "Tu perfil fue aprobado",
    accentBar: "#22c55e",
    bodyHtml,
    ctaLabel: "Ingresar al portal profesional",
    ctaUrl: params.portalUrl,
    footerNote: escapeHtml("Te damos la bienvenida. Estamos a tu lado para que tu práctica online sea clara, humana y sostenible.")
  });
}

function buildPendingEmailHtml(params: {
  fullName: string;
  email: string;
  deadlineLabel: string;
  portalUrl: string;
}): string {
  const name = escapeHtml(params.fullName.trim() || "profesional");
  const email = escapeHtml(params.email);
  const deadline = escapeHtml(params.deadlineLabel);
  const hrefAttr = escapeHtmlAttr(params.portalUrl);
  const portalText = escapeHtml(params.portalUrl);

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#eef0f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef0f9;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 12px 40px rgba(56,52,92,0.1);">
<tr><td style="padding:28px 28px 8px 28px;text-align:center;">
<p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.06em;color:#5f44eb;text-transform:uppercase;">MotivarCare</p>
</td></tr>
<tr><td style="padding:8px 28px 4px 28px;text-align:center;">
<h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:800;color:#0f1731;">Tu perfil está en revisión</h1>
</td></tr>
<tr><td style="padding:12px 28px 8px 28px;text-align:center;">
<p style="margin:0;font-size:16px;line-height:1.55;color:#3d4a63;">Hola ${name},</p>
<p style="margin:14px 0 0 0;font-size:16px;line-height:1.55;color:#3d4a63;">Recibimos tu registro correctamente. Nuestro equipo revisa cada alta de forma manual para cuidar la calidad del matching con pacientes.</p>
<p style="margin:14px 0 0 0;font-size:16px;line-height:1.55;color:#3d4a63;">El proceso suele tardar hasta <strong style="color:#1f2b40;">5 días hábiles</strong> (estimado hasta el ${deadline}). Te avisaremos por email a <strong style="color:#1f2b40;">${email}</strong> cuando tu perfil esté aprobado.</p>
<p style="margin:14px 0 0 0;font-size:16px;line-height:1.55;color:#62708a;">Hasta entonces no podés acceder al portal profesional. Podés volver a ingresar más tarde para consultar el estado.</p>
</td></tr>
<tr><td style="padding:24px 28px 8px 28px;text-align:center;">
<a href="${hrefAttr}" style="display:inline-block;padding:14px 32px;background-color:#5f44eb;color:#ffffff;text-decoration:none;border-radius:14px;font-size:16px;font-weight:700;box-shadow:0 8px 24px rgba(95,68,235,0.35);">Ir al portal profesional</a>
</td></tr>
<tr><td style="padding:20px 28px 28px 28px;text-align:center;">
<p style="margin:0;font-size:13px;line-height:1.5;color:#62708a;">Gracias por confiar en MotivarCare. Revisamos tu solicitud con el mismo cuidado con el que acompañamos a quienes buscan ayuda.</p>
<p style="margin:16px 0 0 0;font-size:12px;line-height:1.45;color:#94a3b8;word-break:break-all;">Si el botón no funciona, copia y pega este enlace en el navegador:<br><span style="color:#5f44eb;">${portalText}</span></p>
</td></tr>
</table>
<p style="margin:20px 0 0 0;font-size:12px;color:#94a3b8;text-align:center;">© MotivarCare · Terapia online</p>
</td></tr>
</table>
</body>
</html>`;
}

function buildRejectedEmailHtml(params: {
  fullName: string;
  supportEmail: string;
  portalUrl: string;
  reason?: string | null;
}): string {
  const name = escapeHtml(params.fullName.trim() || "profesional");
  const support = escapeHtml(params.supportEmail);
  const supportHref = escapeHtmlAttr(`mailto:${params.supportEmail}`);
  const reasonText = params.reason?.trim() || "";
  const reasonBlock = reasonText
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0 0 0;"><tr><td style="padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;text-align:left;"><p style="margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#64748b;">Motivo de la revisión</p><p style="margin:8px 0 0 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#0f1731;">${escapeHtml(reasonText)}</p></td></tr></table>`
    : "";

  const bodyHtml = `
<p style="margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3d4a63;text-align:center;">Hola ${name},</p>
<p style="margin:16px 0 0 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3d4a63;text-align:center;">Gracias por el tiempo que dedicaste a tu registro. Tras revisar tu solicitud, <strong style="color:#0f1731;">todavía no pudimos aprobar tu alta</strong>.</p>
${reasonBlock}
<p style="margin:18px 0 0 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3d4a63;text-align:center;">Podés ingresar de nuevo al portal, completar o corregir lo que falte y volver a enviarlo para una nueva revisión.</p>
<p style="margin:16px 0 0 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#62708a;text-align:center;">Si necesitás ayuda, escribinos a <a href="${supportHref}" style="color:#5f44eb;font-weight:600;text-decoration:none;">${support}</a>.</p>`;

  return emailShell({
    title: "Necesitamos que completes tu alta",
    accentBar: "#f59e0b",
    bodyHtml,
    ctaLabel: "Ingresar y continuar",
    ctaUrl: params.portalUrl,
    footerNote: escapeHtml(
      "Tu cuenta sigue activa. Cuando actualices lo solicitado, tu perfil vuelve a revisión."
    )
  });
}

function buildDocsRequestEmailHtml(params: {
  fullName: string;
  supportEmail: string;
  missingItems: string[];
  note?: string | null;
  portalUrl: string;
}): string {
  const name = escapeHtml(params.fullName.trim() || "profesional");
  const support = escapeHtml(params.supportEmail);
  const supportHref = escapeHtmlAttr(`mailto:${params.supportEmail}`);
  const portalHref = escapeHtmlAttr(params.portalUrl);
  const portalText = escapeHtml(params.portalUrl);
  const items = params.missingItems
    .map((item) => `<li style="margin:0 0 8px 0;">${escapeHtml(item)}</li>`)
    .join("");
  const note = params.note?.trim()
    ? `<p style="margin:14px 0 0 0;font-size:16px;line-height:1.55;color:#3d4a63;"><strong style="color:#1f2b40;">Mensaje del equipo:</strong> ${escapeHtml(params.note.trim())}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#eef0f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef0f9;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 12px 40px rgba(56,52,92,0.1);">
<tr><td style="padding:28px 28px 8px 28px;text-align:center;">
<p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.06em;color:#5f44eb;text-transform:uppercase;">MotivarCare</p>
</td></tr>
<tr><td style="padding:8px 28px 4px 28px;text-align:center;">
<h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:800;color:#0f1731;">Necesitamos documentos para tu alta</h1>
</td></tr>
<tr><td style="padding:12px 28px 8px 28px;text-align:center;">
<p style="margin:0;font-size:16px;line-height:1.55;color:#3d4a63;">Hola ${name},</p>
<p style="margin:14px 0 0 0;font-size:16px;line-height:1.55;color:#3d4a63;">Estamos revisando tu perfil y aún nos faltan estos documentos para poder avanzar:</p>
<ul style="margin:16px auto 0;padding:0 0 0 20px;max-width:360px;text-align:left;font-size:16px;line-height:1.5;color:#1f2b40;">${items}</ul>
${note}
<p style="margin:14px 0 0 0;font-size:16px;line-height:1.55;color:#3d4a63;">Ingresá al portal profesional y usá <strong style="color:#1f2b40;">Completar documentos</strong> para subir los archivos (JPG, PNG o PDF).</p>
</td></tr>
<tr><td style="padding:24px 28px 8px 28px;text-align:center;">
<a href="${portalHref}" style="display:inline-block;padding:14px 32px;background-color:#5f44eb;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:700;box-shadow:0 8px 24px rgba(95,68,235,0.35);">Ir al portal profesional</a>
</td></tr>
<tr><td style="padding:20px 28px 28px 28px;text-align:center;">
<p style="margin:0;font-size:13px;line-height:1.5;color:#62708a;">Tu alta sigue en revisión. Si preferís, también podés responder este correo a <a href="${supportHref}" style="color:#5f44eb;font-weight:600;text-decoration:none;">${support}</a>.</p>
<p style="margin:16px 0 0 0;font-size:12px;line-height:1.45;color:#94a3b8;word-break:break-all;">Si el botón no funciona, copia y pega este enlace:<br><span style="color:#5f44eb;">${portalText}</span></p>
</td></tr>
</table>
<p style="margin:20px 0 0 0;font-size:12px;color:#94a3b8;text-align:center;">© MotivarCare · Terapia online</p>
</td></tr>
</table>
</body>
</html>`;
}

export async function sendProfessionalRegistrationApprovalEmail(
  params:
    | {
        fullName: string;
        email: string;
        status: "PENDING" | "IN_REVIEW";
        profileCreatedAt: Date;
      }
    | {
        fullName: string;
        email: string;
        status: "APPROVED";
      }
    | {
        fullName: string;
        email: string;
        status: "NEEDS_CHANGES";
        reason?: string | null;
      }
    | {
        fullName: string;
        email: string;
        status: "REJECTED";
        reason?: string | null;
      }
): Promise<{ delivered: boolean; skipped?: string }> {
  if (!env.RESEND_API_KEY?.trim()) {
    console.info("Professional registration approval email skipped: RESEND_API_KEY not configured", {
      status: params.status,
      email: params.email
    });
    return { delivered: false, skipped: "resend_not_configured" };
  }

  const recipient = params.email.trim();
  if (!recipient) {
    return { delivered: false, skipped: "missing_email" };
  }

  const greetingName = params.fullName.trim() || "profesional";

  if (params.status === "PENDING" || params.status === "IN_REVIEW") {
    const portalUrl = professionalPortalUrl();
    const deadlineLabel = formatPendingReviewDeadlineLabel(params.profileCreatedAt);
    const subject = "Recibimos tu registro — perfil en revisión";
    const text = [
      `Hola ${greetingName},`,
      "",
      "Recibimos tu registro correctamente. Nuestro equipo revisa cada alta de forma manual para cuidar la calidad del matching con pacientes.",
      "",
      `El proceso suele tardar hasta 5 días hábiles (estimado hasta el ${deadlineLabel}). Te avisaremos por email a ${recipient} cuando tu perfil esté aprobado.`,
      "",
      "Hasta entonces el portal completo permanece en pausa. Podés volver a ingresar para consultar el estado o completar documentos si te lo pedimos.",
      "",
      `Portal profesional: ${portalUrl}`,
      "",
      "— Equipo MotivarCare"
    ].join("\n");

    await sendResendEmail({
      to: recipient,
      subject,
      text,
      html: buildPendingEmailHtml({
        fullName: params.fullName,
        email: recipient,
        deadlineLabel,
        portalUrl
      }),
      tags: [{ name: "event", value: "professional_registration_pending" }]
    });
  } else if (params.status === "APPROVED") {
    const portalUrl = professionalPortalUrl();
    const subject = "Tu perfil fue aprobado — MotivarCare";
    const text = [
      `Hola ${greetingName},`,
      "",
      "Revisamos tu solicitud con cuidado y tenemos una buena noticia: tu perfil profesional ya está aprobado en MotivarCare.",
      "",
      "Ingresá al portal para publicar tu disponibilidad, revisar tu perfil y empezar a recibir pacientes cuando estés listo.",
      "",
      `Ingresar al portal profesional: ${portalUrl}`,
      "",
      "Te damos la bienvenida.",
      "",
      "— Equipo MotivarCare"
    ].join("\n");

    await sendResendEmail({
      to: recipient,
      subject,
      text,
      html: buildApprovedEmailHtml({ fullName: params.fullName, portalUrl }),
      tags: [{ name: "event", value: "professional_registration_approved" }]
    });
  } else if (params.status === "NEEDS_CHANGES") {
    const supportEmail = env.SUPPORT_EMAIL;
    const portalUrl = professionalPortalUrl();
    const reason = params.reason?.trim() || "";
    const subject = "Necesitamos cambios en tu alta — MotivarCare";
    const text = [
      `Hola ${greetingName},`,
      "",
      "Revisamos tu perfil y necesitamos algunos cambios antes de poder aprobarlo.",
      ...(reason ? ["", `Qué necesitamos: ${reason}`] : []),
      "",
      "Ingresá al portal, corregí lo indicado y reenviá tu alta. Volverá a la cola de revisión automáticamente.",
      "",
      `Ingresar y corregir: ${portalUrl}`,
      "",
      `Si necesitás ayuda, escribinos a ${supportEmail}.`,
      "",
      "— Equipo MotivarCare"
    ].join("\n");

    await sendResendEmail({
      to: recipient,
      subject,
      text,
      html: buildNeedsChangesEmailHtml({
        fullName: params.fullName,
        supportEmail,
        portalUrl,
        reason: reason || null
      }),
      tags: [{ name: "event", value: "professional_registration_needs_changes" }]
    });
  } else if (params.status === "REJECTED") {
    const supportEmail = env.SUPPORT_EMAIL;
    const reason = params.reason?.trim() || "";
    const subject = "Actualización sobre tu alta en MotivarCare";
    const text = [
      `Hola ${greetingName},`,
      "",
      "Gracias por tu interés en MotivarCare. Tras revisar tu solicitud, en esta oportunidad no podemos aprobar tu alta.",
      ...(reason ? ["", `Motivo: ${reason}`] : []),
      "",
      `Si creés que hubo un error, escribinos a ${supportEmail}.`,
      "",
      "— Equipo MotivarCare"
    ].join("\n");

    await sendResendEmail({
      to: recipient,
      subject,
      text,
      html: buildHardRejectedEmailHtml({
        fullName: params.fullName,
        supportEmail,
        reason: reason || null
      }),
      tags: [{ name: "event", value: "professional_registration_rejected" }]
    });
  }

  console.log(
    JSON.stringify({
      level: "info",
      event: "professional_registration_approval_email_sent",
      status: params.status,
      email: recipient,
      timestamp: new Date().toISOString()
    })
  );

  return { delivered: true };
}

export async function sendProfessionalRegistrationDocsRequestEmail(params: {
  fullName: string;
  email: string;
  missingItems: string[];
  note?: string | null;
}): Promise<{ delivered: boolean; skipped?: string }> {
  if (!env.RESEND_API_KEY?.trim()) {
    console.info("Professional docs request email skipped: RESEND_API_KEY not configured", {
      email: params.email
    });
    return { delivered: false, skipped: "resend_not_configured" };
  }

  const recipient = params.email.trim();
  if (!recipient) {
    return { delivered: false, skipped: "missing_email" };
  }
  if (params.missingItems.length === 0) {
    return { delivered: false, skipped: "no_missing_items" };
  }

  const greetingName = params.fullName.trim() || "profesional";
  const supportEmail = env.SUPPORT_EMAIL;
  const note = params.note?.trim() || "";
  const portalUrl = professionalPortalUrl();
  const subject = "Necesitamos documentos para completar tu alta — MotivarCare";
  const text = [
    `Hola ${greetingName},`,
    "",
    "Estamos revisando tu perfil y aún nos faltan estos documentos para poder avanzar:",
    ...params.missingItems.map((item) => `- ${item}`),
    ...(note ? ["", `Mensaje del equipo: ${note}`] : []),
    "",
    "Ingresá al portal profesional y usá Completar documentos para subir los archivos (JPG, PNG o PDF).",
    `Portal: ${portalUrl}`,
    "",
    `Si preferís, también podés responder este correo a ${supportEmail} adjuntando los archivos.`,
    "",
    "Tu alta sigue en revisión. Gracias por ayudarnos a completar la verificación.",
    "",
    "— Equipo MotivarCare"
  ].join("\n");

  await sendResendEmail({
    to: recipient,
    subject,
    text,
    html: buildDocsRequestEmailHtml({
      fullName: params.fullName,
      supportEmail,
      missingItems: params.missingItems,
      note: note || null,
      portalUrl
    }),
    tags: [{ name: "event", value: "professional_registration_docs_request" }]
  });

  return { delivered: true };
}

export async function maybeSendProfessionalRegistrationPendingEmail(params: {
  userId: string;
  fullName: string;
  email: string;
  registrationApproval: ProfessionalRegistrationApproval;
  profileCreatedAt: Date;
}): Promise<{ delivered: boolean; skipped?: string }> {
  if (params.registrationApproval !== ProfessionalRegistrationApproval.IN_REVIEW) {
    return { delivered: false, skipped: "not_in_review" };
  }

  const existingMarker = await prisma.verificationToken.findFirst({
    where: {
      userId: params.userId,
      type: PROFESSIONAL_PENDING_REGISTRATION_EMAIL_SENT_TYPE
    },
    select: { id: true }
  });
  if (existingMarker) {
    return { delivered: false, skipped: "already_sent" };
  }

  const delivery = await sendProfessionalRegistrationApprovalEmail({
    fullName: params.fullName,
    email: params.email,
    status: "IN_REVIEW",
    profileCreatedAt: params.profileCreatedAt
  });

  if (!delivery.delivered) {
    return delivery;
  }

  try {
    await prisma.verificationToken.create({
      data: {
        userId: params.userId,
        token: `pro-pending-reg-email:${params.userId}`,
        type: PROFESSIONAL_PENDING_REGISTRATION_EMAIL_SENT_TYPE,
        expiresAt: new Date("2099-01-01T00:00:00.000Z")
      }
    });
  } catch (error) {
    if (!isPrismaUniqueViolation(error)) {
      console.error("[professional-registration-pending-email] marker create failed", {
        userId: params.userId,
        error
      });
    }
  }

  return delivery;
}
