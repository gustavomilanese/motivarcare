import type { AppLanguage } from "@therapy/i18n-config";

/** Bandeja operativa pública (alineada con `SUPPORT_EMAIL` del API). */
export const PATIENT_SUPPORT_EMAIL = "soporte@motivarcare.com";

export function buildProfessionalChangeMailtoUrl(params: {
  supportEmail?: string;
  patientName?: string | null;
  patientEmail?: string | null;
  assignedProfessionalName?: string | null;
  reason?: string | null;
  language?: AppLanguage;
}): string {
  const to = (params.supportEmail ?? PATIENT_SUPPORT_EMAIL).trim();
  const language = params.language ?? "es";
  const copy =
    language === "en"
      ? {
          subject: "Request to change professional — MotivarCare",
          greeting: "Hello MotivarCare team,",
          intent: "I would like to request a change of professional.",
          name: "Name",
          email: "Email",
          current: "Current professional",
          reason: "Reason",
          thanks: "Thank you."
        }
      : language === "pt"
        ? {
            subject: "Solicitacao de troca de profissional — MotivarCare",
            greeting: "Ola equipe MotivarCare,",
            intent: "Gostaria de solicitar a troca de profissional.",
            name: "Nome",
            email: "E-mail",
            current: "Profissional atual",
            reason: "Motivo",
            thanks: "Obrigado."
          }
        : {
            subject: "Solicitud de cambio de profesional — MotivarCare",
            greeting: "Hola equipo de MotivarCare,",
            intent: "Quiero solicitar un cambio de profesional.",
            name: "Nombre",
            email: "Email",
            current: "Profesional actual",
            reason: "Motivo",
            thanks: "Gracias."
          };

  const lines = [
    copy.greeting,
    "",
    copy.intent,
    params.patientName ? `${copy.name}: ${params.patientName}` : null,
    params.patientEmail ? `${copy.email}: ${params.patientEmail}` : null,
    params.assignedProfessionalName ? `${copy.current}: ${params.assignedProfessionalName}` : null,
    params.reason?.trim() ? `${copy.reason}: ${params.reason.trim()}` : null,
    "",
    copy.thanks
  ].filter((line): line is string => Boolean(line));

  return `mailto:${to}?subject=${encodeURIComponent(copy.subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}
