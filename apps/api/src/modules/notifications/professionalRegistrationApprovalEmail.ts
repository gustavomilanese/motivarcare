import { ProfessionalRegistrationApproval } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { isPrismaUniqueViolation } from "../../lib/prismaUserError.js";
import { sendResendEmail } from "../../lib/resendSend.js";

export type ProfessionalRegistrationApprovalEmailStatus = "PENDING" | "APPROVED" | "REJECTED";

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

function buildApprovedEmailHtml(params: { fullName: string; portalUrl: string }): string {
  const name = escapeHtml(params.fullName.trim() || "profesional");
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
<h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:800;color:#0f1731;">Tu perfil fue aprobado</h1>
</td></tr>
<tr><td style="padding:12px 28px 8px 28px;text-align:center;">
<p style="margin:0;font-size:16px;line-height:1.55;color:#3d4a63;">Hola ${name},</p>
<p style="margin:14px 0 0 0;font-size:16px;line-height:1.55;color:#3d4a63;">Revisamos tu solicitud con atención y nos complace confirmarte que <strong style="color:#1f2b40;">tu perfil profesional ya está activo</strong> en MotivarCare.</p>
<p style="margin:14px 0 0 0;font-size:16px;line-height:1.55;color:#3d4a63;">Desde el portal podés publicar tu disponibilidad, completar los últimos detalles de tu consulta y comenzar a recibir pacientes cuando estés listo.</p>
</td></tr>
<tr><td style="padding:24px 28px 8px 28px;text-align:center;">
<a href="${hrefAttr}" style="display:inline-block;padding:14px 32px;background-color:#5f44eb;color:#ffffff;text-decoration:none;border-radius:14px;font-size:16px;font-weight:700;box-shadow:0 8px 24px rgba(95,68,235,0.35);">Ingresar al portal profesional</a>
</td></tr>
<tr><td style="padding:20px 28px 28px 28px;text-align:center;">
<p style="margin:0;font-size:13px;line-height:1.5;color:#62708a;">Te damos la bienvenida al equipo. Estamos a tu lado para que tu práctica online sea clara, humana y sostenible.</p>
<p style="margin:16px 0 0 0;font-size:12px;line-height:1.45;color:#94a3b8;word-break:break-all;">Si el botón no funciona, copia y pega este enlace en el navegador:<br><span style="color:#5f44eb;">${portalText}</span></p>
</td></tr>
</table>
<p style="margin:20px 0 0 0;font-size:12px;color:#94a3b8;text-align:center;">© MotivarCare · Terapia online</p>
</td></tr>
</table>
</body>
</html>`;
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

function buildRejectedEmailHtml(params: { fullName: string; supportEmail: string }): string {
  const name = escapeHtml(params.fullName.trim() || "profesional");
  const support = escapeHtml(params.supportEmail);
  const supportHref = escapeHtmlAttr(`mailto:${params.supportEmail}`);

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
<h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:800;color:#0f1731;">Actualización sobre tu alta</h1>
</td></tr>
<tr><td style="padding:12px 28px 8px 28px;text-align:center;">
<p style="margin:0;font-size:16px;line-height:1.55;color:#3d4a63;">Hola ${name},</p>
<p style="margin:14px 0 0 0;font-size:16px;line-height:1.55;color:#3d4a63;">Gracias por tu interés en acompañar pacientes a través de MotivarCare y por el tiempo que dedicaste a completar tu registro.</p>
<p style="margin:14px 0 0 0;font-size:16px;line-height:1.55;color:#3d4a63;">Tras revisar tu solicitud con el cuidado que merece cada alta, en esta oportunidad <strong style="color:#1f2b40;">no pudimos aprobar tu perfil</strong> para formar parte de la plataforma.</p>
<p style="margin:14px 0 0 0;font-size:16px;line-height:1.55;color:#3d4a63;">Si creés que hubo un error o querés más información, escribinos a <a href="${supportHref}" style="color:#5f44eb;font-weight:600;text-decoration:none;">${support}</a>. Con gusto revisaremos tu caso.</p>
</td></tr>
<tr><td style="padding:20px 28px 28px 28px;text-align:center;">
<p style="margin:0;font-size:13px;line-height:1.5;color:#62708a;">Apreciamos tu confianza y te deseamos lo mejor en tu práctica profesional.</p>
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
        status: "PENDING";
        profileCreatedAt: Date;
      }
    | {
        fullName: string;
        email: string;
        status: "APPROVED" | "REJECTED";
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

  if (params.status === "PENDING") {
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
      "Hasta entonces no podés acceder al portal profesional. Podés volver a ingresar más tarde para consultar el estado.",
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
      "Revisamos tu solicitud con atención y nos complace confirmarte que tu perfil profesional ya está activo en MotivarCare.",
      "",
      "Desde el portal podés publicar tu disponibilidad, completar los últimos detalles de tu consulta y comenzar a recibir pacientes cuando estés listo.",
      "",
      `Ingresá al portal profesional: ${portalUrl}`,
      "",
      "Te damos la bienvenida al equipo.",
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
  } else {
    const supportEmail = env.SUPPORT_EMAIL;
    const subject = "Actualización sobre tu alta en MotivarCare";
    const text = [
      `Hola ${greetingName},`,
      "",
      "Gracias por tu interés en acompañar pacientes a través de MotivarCare y por el tiempo que dedicaste a completar tu registro.",
      "",
      "Tras revisar tu solicitud, en esta oportunidad no pudimos aprobar tu perfil para formar parte de la plataforma.",
      "",
      `Si creés que hubo un error o querés más información, escribinos a ${supportEmail}.`,
      "",
      "Apreciamos tu confianza y te deseamos lo mejor en tu práctica profesional.",
      "",
      "— Equipo MotivarCare"
    ].join("\n");

    await sendResendEmail({
      to: recipient,
      subject,
      text,
      html: buildRejectedEmailHtml({ fullName: params.fullName, supportEmail }),
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

export async function maybeSendProfessionalRegistrationPendingEmail(params: {
  userId: string;
  fullName: string;
  email: string;
  registrationApproval: ProfessionalRegistrationApproval;
  profileCreatedAt: Date;
}): Promise<{ delivered: boolean; skipped?: string }> {
  if (params.registrationApproval !== ProfessionalRegistrationApproval.PENDING) {
    return { delivered: false, skipped: "not_pending" };
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
    status: "PENDING",
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
