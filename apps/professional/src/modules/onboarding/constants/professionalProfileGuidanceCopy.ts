import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

export function proGuidanceCopy(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export const PROFESSIONAL_FOCUS_AREAS_AI_NOTICE: LocalizedText = {
  es: "Nuestro sistema IA analizará los parámetros escogidos para alcanzar el match más adecuado con sus potenciales clientes. Le pedimos que sea lo más exhaustivo posible a la hora de escoger sus áreas de atención.",
  en: "Our AI system will analyze the options you choose to find the best match with potential clients. Please be as thorough as possible when selecting your areas of focus.",
  pt: "Nosso sistema de IA analisara os parametros escolhidos para encontrar o match mais adequado com seus potenciais clientes. Pedimos que seja o mais completo possivel ao escolher suas areas de atencao."
};

/** Resumen breve para el modal de confirmación al avanzar (web onboarding). */
export const PROFESSIONAL_IDENTITY_ADVANCE_AI_BULLET: LocalizedText = {
  es: "Tu selección orienta el emparejamiento con pacientes — elegí solo lo que realmente atendés.",
  en: "Your selection guides patient matching — choose only what you actually work with.",
  pt: "Sua selecao orienta o match com pacientes — escolha apenas o que voce realmente atende."
};

/** Avisos de terapia de pareja (solo profesionales): popup al confirmar, no banner inline. */
export const PROFESSIONAL_IDENTITY_ADVANCE_COUPLES_BULLETS: readonly LocalizedText[] = [
  {
    es: "Con 3 o más personas en la llamada, Google Meet gratuito dura hasta 45 minutos.",
    en: "With 3 or more people on the call, free Google Meet lasts up to 45 minutes.",
    pt: "Com 3 ou mais pessoas na chamada, o Google Meet gratuito dura ate 45 minutos."
  },
  {
    es: "Si la pareja se conecta desde distintos dispositivos o ubicaciones, deben compartir el enlace de Meet generado para la sesión.",
    en: "If the couple joins from different devices or locations, they must share the Meet link generated for the session.",
    pt: "Se o casal entrar de dispositivos ou locais diferentes, devem compartilhar o link do Meet gerado para a sessao."
  },
  {
    es: "Quien tenga la suscripción de Google Workspace activa podrá compartir ese enlace; vos también podrás compartirlo para sesiones de hasta 60 minutos con Meet Pro.",
    en: "Whoever has an active Google Workspace subscription can share that link; you can also share it for sessions up to 60 minutes with Meet Pro.",
    pt: "Quem tiver a assinatura do Google Workspace ativa podera compartilhar esse link; voce tambem podera compartilha-lo para sessoes de ate 60 minutos com Meet Pro."
  }
];

export const PROFESSIONAL_PAYOUT_SETUP_LEAD: LocalizedText = {
  es: "Conectá tu cuenta para recibir pagos de tus sesiones. Podés completarlo ahora o más adelante desde tu perfil.",
  en: "Connect your account to receive payments for your sessions. You can complete this now or later from your profile.",
  pt: "Conecte sua conta para receber pagamentos das suas sessoes. Voce pode concluir agora ou depois no perfil."
};

export const PROFESSIONAL_PAYOUT_FISCAL_NOTICE: LocalizedText = {
  es: "Validamos identidad y datos fiscales (DNI/CUIT u equivalente). Completá el proceso en el proveedor de pagos y cargá acá tu documento.",
  en: "We validate identity and tax data (national ID / tax number). Complete the process with the payment provider and upload your document here.",
  pt: "Validamos identidade e dados fiscais (documento / numero fiscal). Conclua o processo no provedor de pagamentos e envie seu documento aqui."
};

export const PROFESSIONAL_MEDIA_BOTH_REQUIRED_NOTICE: LocalizedText = {
  es: "Necesitamos tu foto y tu video de presentación para continuar. Si subiste uno incorrecto, podés cambiarlo antes de seguir.",
  en: "We need both your photo and presentation video to continue. If you uploaded the wrong file, you can replace it before moving on.",
  pt: "Precisamos da sua foto e do video de apresentacao para continuar. Se enviou o arquivo errado, voce pode substituir antes de seguir."
};

export const PROFESSIONAL_VIDEO_MAX_DURATION_SEC = 120;

/** @deprecated Usar PROFESSIONAL_PAYOUT_FISCAL_NOTICE */
export const PROFESSIONAL_STRIPE_FISCAL_NOTICE = PROFESSIONAL_PAYOUT_FISCAL_NOTICE;

export const PROFESSIONAL_GOOGLE_CALENDAR_SCOPE_POINTS: LocalizedText[] = [
  {
    es: "La sincronización no lee tus horarios libres de Google Calendar personal. Solo usa la disponibilidad que cargás en MotivarCare.",
    en: "Sync does not read free/busy from your personal Google Calendar. It only uses availability you set in MotivarCare.",
    pt: "A sincronizacao nao le os horarios livres do seu Google Calendar pessoal. Usa apenas a disponibilidade que voce define no MotivarCare."
  },
  {
    es: "Al confirmar una sesión, MotivarCare puede crear el evento en tu calendario y generar el enlace de Google Meet.",
    en: "When a session is confirmed, MotivarCare can create the calendar event and generate the Google Meet link.",
    pt: "Ao confirmar uma sessao, o MotivarCare pode criar o evento no calendario e gerar o link do Google Meet."
  },
  {
    es: "Los pacientes ven tus horarios en su zona horaria local.",
    en: "Patients see your available slots in their local time zone.",
    pt: "Os pacientes veem seus horarios no fuso horario local deles."
  }
];

export const PROFESSIONAL_CANCELLATION_POLICY_NOTICE: LocalizedText = {
  es: "Priorizá las reservas confirmadas en MotivarCare. Cambios o cancelaciones frecuentes por parte del profesional afectan la confianza del paciente y pueden limitar visibilidad en la plataforma.",
  en: "Prioritize confirmed MotivarCare bookings. Frequent schedule changes or cancellations by the professional affect patient trust and may limit platform visibility.",
  pt: "Priorize reservas confirmadas no MotivarCare. Cancelamentos ou remarcacoes frequentes por parte do profissional afetam a confianca do paciente e podem limitar a visibilidade na plataforma."
};

export const PROFESSIONAL_PUBLIC_PROFILE_PREFILL_NOTICE: LocalizedText = {
  es: "Este es tu perfil público tal como lo ven los pacientes. Los datos provienen del onboarding; podés editarlos y guardar los cambios.",
  en: "This is your public profile as patients see it. Data comes from onboarding—you can edit and save changes.",
  pt: "Este e seu perfil publico como os pacientes veem. Os dados vem do onboarding; voce pode editar e salvar."
};
