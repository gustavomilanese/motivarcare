import type { AppLanguage } from "@therapy/i18n-config";
import { buildAdminPatientEditLink } from "../../lib/adminAppLinks.js";
import { escapeHtml, escapeHtmlAttr } from "../../lib/emailHtml.js";
import { env } from "../../config/env.js";
import { sendResendEmail } from "../../lib/resendSend.js";

function buildProfessionalChangeRequestEmailHtml(params: {
  patientName: string;
  patientEmail: string;
  currentProfessionalName: string;
  reason: string | null;
  adminEditUrl: string;
}): string {
  const patientName = escapeHtml(params.patientName);
  const patientEmail = escapeHtml(params.patientEmail);
  const professionalName = escapeHtml(params.currentProfessionalName);
  const adminHref = escapeHtmlAttr(params.adminEditUrl);
  const adminLinkText = escapeHtml(params.adminEditUrl);
  const reasonHtml = params.reason?.trim()
    ? `<p style="margin:0;font-size:15px;line-height:1.55;color:#1f2b40;font-style:italic;">&ldquo;${escapeHtml(params.reason.trim())}&rdquo;</p>`
    : `<p style="margin:0;font-size:14px;line-height:1.5;color:#94a3b8;">Sin motivo adicional en el formulario.</p>`;

  const detailRow = (label: string, value: string) => `
<tr>
  <td style="padding:10px 0;border-bottom:1px solid #e8edf5;">
    <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#94a3b8;">${label}</p>
    <p style="margin:6px 0 0;font-size:15px;line-height:1.45;font-weight:600;color:#0f1731;">${value}</p>
  </td>
</tr>`;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#eef0f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef0f9;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 12px 40px rgba(56,52,92,0.1);">
<tr><td style="padding:28px 28px 0 28px;text-align:center;">
<p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.06em;color:#5f44eb;text-transform:uppercase;">MotivarCare</p>
<p style="margin:12px 0 0;display:inline-block;padding:6px 12px;background:#fef3c7;color:#92400e;border-radius:999px;font-size:12px;font-weight:700;">Acción requerida · Soporte</p>
</td></tr>
<tr><td style="padding:16px 28px 8px 28px;text-align:center;">
<h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:800;color:#0f1731;">Cambio de profesional</h1>
</td></tr>
<tr><td style="padding:8px 28px 20px 28px;text-align:center;">
<p style="margin:0;font-size:16px;line-height:1.55;color:#3d4a63;">Un paciente solicitó otro psicólogo. Revisá el caso y actualizá la asignación en Admin.</p>
</td></tr>
<tr><td style="padding:0 28px 24px 28px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border-radius:14px;border:1px solid #e8edf5;">
<tr><td style="padding:16px 18px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
${detailRow("Paciente", patientName)}
${detailRow("Email", `<a href="mailto:${escapeHtmlAttr(params.patientEmail)}" style="color:#5f44eb;text-decoration:none;">${patientEmail}</a>`)}
${detailRow("Profesional actual", professionalName)}
<tr>
  <td style="padding:10px 0 0 0;">
    <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#94a3b8;">Motivo del paciente</p>
    <div style="margin:8px 0 0;padding:12px 14px;background:#ffffff;border-radius:10px;border-left:4px solid #5f44eb;">
      ${reasonHtml}
    </div>
  </td>
</tr>
</table>
</td></tr>
</table>
</td></tr>
<tr><td style="padding:0 28px 8px 28px;text-align:center;">
<a href="${adminHref}" style="display:inline-block;padding:14px 32px;background-color:#5f44eb;color:#ffffff;text-decoration:none;border-radius:14px;font-size:16px;font-weight:700;box-shadow:0 8px 24px rgba(95,68,235,0.35);">Abrir paciente en Admin</a>
</td></tr>
<tr><td style="padding:16px 28px 28px 28px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5ff;border-radius:12px;">
<tr><td style="padding:14px 16px;">
<p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#5f44eb;text-transform:uppercase;letter-spacing:0.04em;">Pasos rápidos</p>
<ol style="margin:0;padding:0 0 0 18px;font-size:14px;line-height:1.55;color:#3d4a63;">
<li style="margin:0 0 6px;">Iniciá sesión en Admin si te lo pide el navegador.</li>
<li style="margin:0 0 6px;">En el modal, cambiá <strong style="color:#0f1731;">Profesional asignado</strong>.</li>
<li style="margin:0;">Guardá y respondé al paciente por email (Reply en este correo).</li>
</ol>
</td></tr>
</table>
<p style="margin:18px 0 0;font-size:12px;line-height:1.45;color:#94a3b8;word-break:break-all;text-align:center;">Si el botón no abre el modal, copiá este enlace:<br><a href="${adminHref}" style="color:#5f44eb;text-decoration:none;">${adminLinkText}</a></p>
</td></tr>
</table>
<p style="margin:20px 0 0;font-size:12px;color:#94a3b8;text-align:center;">© MotivarCare · Terapia online</p>
</td></tr>
</table>
</body>
</html>`;
}

export async function sendProfessionalChangeRequestEmail(params: {
  patientName: string;
  patientEmail: string;
  patientId: string;
  currentProfessionalName?: string | null;
  reason?: string | null;
  language?: AppLanguage;
}): Promise<{ delivered: boolean; supportEmail: string }> {
  const supportEmail = env.SUPPORT_EMAIL;
  const reasonBlock = params.reason?.trim()
    ? `\n\nMotivo indicado por el paciente:\n${params.reason.trim()}`
    : "\n\n(Sin motivo adicional en el formulario.)";

  const proLine = params.currentProfessionalName?.trim()
    ? params.currentProfessionalName.trim()
    : "(sin profesional asignado en el sistema)";

  const adminEditUrl = buildAdminPatientEditLink(params.patientId);
  const subject = `[MotivarCare] Solicitud de cambio de profesional — ${params.patientName}`;
  const text = [
    "Solicitud de cambio de profesional (proceso manual).",
    "",
    `Paciente: ${params.patientName}`,
    `Email: ${params.patientEmail}`,
    `Patient profile ID: ${params.patientId}`,
    `Profesional actual: ${proLine}`,
    reasonBlock,
    "",
    "Abrir en Admin (iniciá sesión si hace falta):",
    adminEditUrl,
    "",
    "En el modal, actualizá el campo «Profesional asignado» y guardá."
  ].join("\n");

  const html = buildProfessionalChangeRequestEmailHtml({
    patientName: params.patientName,
    patientEmail: params.patientEmail,
    currentProfessionalName: proLine,
    reason: params.reason?.trim() ?? null,
    adminEditUrl
  });

  if (!env.RESEND_API_KEY?.trim()) {
    console.info(
      JSON.stringify({
        level: "info",
        event: "professional_change_request_email_skipped",
        reason: "missing_resend_api_key",
        patientEmail: params.patientEmail,
        supportEmail,
        patientId: params.patientId,
        timestamp: new Date().toISOString()
      })
    );
    return { delivered: false, supportEmail };
  }

  try {
    await sendResendEmail({
      to: supportEmail,
      subject,
      html,
      text,
      replyTo: params.patientEmail,
      tags: [{ name: "event", value: "professional_change_request" }]
    });

    console.info(
      JSON.stringify({
        level: "info",
        event: "professional_change_request_email_sent",
        patientEmail: params.patientEmail,
        supportEmail,
        patientId: params.patientId,
        timestamp: new Date().toISOString()
      })
    );

    return { delivered: true, supportEmail };
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "professional_change_request_email_failed",
        patientEmail: params.patientEmail,
        supportEmail,
        patientId: params.patientId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      })
    );
    return { delivered: false, supportEmail };
  }
}
