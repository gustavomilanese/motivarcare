/** Bandeja operativa pública (alineada con `SUPPORT_EMAIL` del API). */
export const PATIENT_SUPPORT_EMAIL = "soporte@motivarcare.com";

export function buildProfessionalChangeMailtoUrl(params: {
  supportEmail?: string;
  patientName?: string | null;
  patientEmail?: string | null;
  assignedProfessionalName?: string | null;
  reason?: string | null;
}): string {
  const to = (params.supportEmail ?? PATIENT_SUPPORT_EMAIL).trim();
  const subject = "Solicitud de cambio de profesional — MotivarCare";
  const lines = [
    "Hola equipo de MotivarCare,",
    "",
    "Quiero solicitar un cambio de profesional.",
    params.patientName ? `Nombre: ${params.patientName}` : null,
    params.patientEmail ? `Email: ${params.patientEmail}` : null,
    params.assignedProfessionalName ? `Profesional actual: ${params.assignedProfessionalName}` : null,
    params.reason?.trim() ? `Motivo: ${params.reason.trim()}` : null,
    "",
    "Gracias."
  ].filter((line): line is string => Boolean(line));

  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}
