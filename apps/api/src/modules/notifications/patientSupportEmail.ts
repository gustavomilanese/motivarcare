import type { AppLanguage } from "@therapy/i18n-config";
import { env } from "../../config/env.js";
import { sendResendEmail } from "../../lib/resendSend.js";

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
    "Acción sugerida: revisar en Admin → Pacientes → editar paciente → Profesional asignado."
  ].join("\n");

  const html = text
    .split("\n")
    .map((line) => (line.length === 0 ? "<br/>" : `<p>${line.replace(/</g, "&lt;")}</p>`))
    .join("");

  if (!env.RESEND_API_KEY) {
    console.info("Professional change request email skipped: RESEND_API_KEY not configured", {
      patientEmail: params.patientEmail,
      supportEmail
    });
    return { delivered: false, supportEmail };
  }

  await sendResendEmail({
    to: supportEmail,
    subject,
    html,
    text,
    replyTo: params.patientEmail,
    tags: [{ name: "event", value: "professional_change_request" }]
  });

  return { delivered: true, supportEmail };
}
