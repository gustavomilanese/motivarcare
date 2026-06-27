import type { LocalizedText } from "@therapy/i18n-config";

/** Aviso al elegir terapia de pareja en el onboarding del paciente (videollamada). */
export const PATIENT_COUPLES_THERAPY_MEET_NOTICE_BULLETS: readonly LocalizedText[] = [
  {
    es: "Si en la videollamada se conectan 3 o más personas, la versión gratuita de Google Meet dura hasta 45 minutos.",
    en: "If 3 or more people join the video call, the free version of Google Meet lasts up to 45 minutes.",
    pt: "Se 3 ou mais pessoas entrarem na videochamada, a versao gratuita do Google Meet dura ate 45 minutos."
  },
  {
    es: "Para sesiones completas de 60 minutos, el enlace debe generarse desde una cuenta con Google Meet de pago (Google Workspace).",
    en: "For full 60-minute sessions, the link must be created from a paid Google Meet account (Google Workspace).",
    pt: "Para sessoes completas de 60 minutos, o link deve ser gerado a partir de uma conta com Google Meet pago (Google Workspace)."
  },
  {
    es: "Si cada integrante de la pareja se conecta desde un dispositivo distinto, todos deben usar el mismo enlace de Meet que comparte tu profesional.",
    en: "If each partner joins from a different device, everyone must use the same Meet link your professional shares.",
    pt: "Se cada integrante do casal entrar de um dispositivo diferente, todos devem usar o mesmo link do Meet que seu profissional compartilhar."
  }
];
