import { getEmergencyResources, renderEmergencyResourcesText } from "@therapy/types";
import type { AppLanguage } from "@therapy/i18n-config";
import { env } from "../../config/env.js";
import { buildEmailNoteBox, buildMotivarCareEmailLayout, escapeHtml } from "../../lib/emailHtml.js";
import { sendResendEmail } from "../../lib/resendSend.js";

function localizedIntro(language: AppLanguage): string[] {
  switch (language) {
    case "en":
      return [
        "Thank you for taking the time to share how you are feeling.",
        "MotivarCare is an online therapy platform and is not equipped to provide emergency or crisis care.",
        "Because of what you shared, we cannot continue with registration at this time.",
        "Please reach out now to a local crisis line, emergency service, or someone you trust who can stay with you."
      ];
    case "pt":
      return [
        "Obrigado por dedicar um tempo para compartilhar como voce esta se sentindo.",
        "A MotivarCare e uma plataforma de terapia online e nao esta preparada para atendimento de emergencia ou crise.",
        "Por isso, nao podemos continuar com o cadastro neste momento.",
        "Por favor, busque agora uma linha de crise local, um servico de emergencia ou alguem de confianca que possa ficar com voce."
      ];
    default:
      return [
        "Gracias por tomarte el tiempo de contarnos cómo te sentís.",
        "MotivarCare es una plataforma de terapia online y no está preparada para brindar atención de emergencia o crisis.",
        "Por lo que nos compartiste, no podemos continuar con el registro en este momento.",
        "Te pedimos que busques ahora una línea de crisis local, un servicio de emergencia o una persona de confianza que pueda acompañarte."
      ];
  }
}

function localizedSubject(language: AppLanguage): string {
  switch (language) {
    case "en":
      return "Important: crisis support resources — MotivarCare";
    case "pt":
      return "Importante: recursos de apoio em crise — MotivarCare";
    default:
      return "Importante: recursos de apoyo en crisis — MotivarCare";
  }
}

function localizedHeadline(language: AppLanguage): string {
  switch (language) {
    case "en":
      return "Crisis support resources";
    case "pt":
      return "Recursos de apoio em crise";
    default:
      return "Recursos de apoyo en crisis";
  }
}

function localizedBadge(language: AppLanguage): string {
  switch (language) {
    case "en":
      return "Important";
    case "pt":
      return "Importante";
    default:
      return "Importante";
  }
}

function localizedFallbackResources(language: AppLanguage): string {
  switch (language) {
    case "en":
      return [
        "If you are in immediate danger, call your local emergency number.",
        "United States: 988 (Suicide & Crisis Lifeline) or 911.",
        "Argentina: 0800-345-1435 or 911."
      ].join("\n");
    case "pt":
      return [
        "Se voce estiver em perigo imediato, ligue para o numero de emergencia local.",
        "Estados Unidos: 988 ou 911.",
        "Argentina: 0800-345-1435 ou 911."
      ].join("\n");
    default:
      return [
        "Si estás en peligro inmediato, llamá al número de emergencias local.",
        "Estados Unidos: 988 (línea de crisis) o 911.",
        "Argentina: 0800-345-1435 o 911."
      ].join("\n");
  }
}

function localizedGreeting(language: AppLanguage, fullName: string): string {
  switch (language) {
    case "en":
      return `Hello ${fullName},`;
    case "pt":
      return `Ola ${fullName},`;
    default:
      return `Hola ${fullName},`;
  }
}

function buildResourcesHtml(resourcesBlock: string): string {
  const lines = resourcesBlock
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p style="margin:0 0 8px 0;font-size:14px;line-height:1.5;color:#1f2b40;">${escapeHtml(line)}</p>`)
    .join("");

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border-radius:14px;border:1px solid #e8edf5;">
<tr><td style="padding:16px 18px;">
<p style="margin:0 0 10px 0;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#94a3b8;">Recursos de ayuda</p>
${lines}
</td></tr>
</table>`;
}

function buildEmailBody(params: {
  fullName: string;
  language: AppLanguage;
  residencyCountry?: string | null;
}): { subject: string; html: string; text: string } {
  const intro = localizedIntro(params.language);
  const resources = getEmergencyResources(params.residencyCountry);
  const resourcesBlock = resources
    ? renderEmergencyResourcesText(resources)
    : localizedFallbackResources(params.language);

  const greeting = localizedGreeting(params.language, params.fullName);
  const text = [greeting, "", ...intro, "", resourcesBlock].join("\n");

  const html = buildMotivarCareEmailLayout({
    lang: params.language,
    badge: localizedBadge(params.language),
    headline: localizedHeadline(params.language),
    introParagraphs: intro,
    bodyHtml: [
      buildEmailNoteBox(
        params.language === "en"
          ? "If you are in immediate danger, contact local emergency services now."
          : params.language === "pt"
            ? "Se voce estiver em perigo imediato, contate os servicos de emergencia locais agora."
            : "Si estás en peligro inmediato, contactá a emergencias locales ahora.",
        "warning"
      ),
      `<div style="margin:14px 0 0 0;">${buildResourcesHtml(resourcesBlock)}</div>`
    ].join(""),
    maxWidth: 560
  });

  return {
    subject: localizedSubject(params.language),
    html,
    text
  };
}

export async function sendPatientSafetyReferralEmail(params: {
  fullName: string;
  email: string;
  language?: AppLanguage;
  residencyCountry?: string | null;
}): Promise<{ delivered: boolean }> {
  const language = params.language ?? "es";
  const content = buildEmailBody({
    fullName: params.fullName,
    language,
    residencyCountry: params.residencyCountry
  });

  if (!env.RESEND_API_KEY) {
    console.info("Safety referral email skipped: RESEND_API_KEY not configured", {
      email: params.email
    });
    return { delivered: false };
  }

  await sendResendEmail({
    to: params.email,
    subject: content.subject,
    html: content.html,
    text: content.text,
    tags: [{ name: "event", value: "patient_safety_referral" }]
  });

  return { delivered: true };
}
