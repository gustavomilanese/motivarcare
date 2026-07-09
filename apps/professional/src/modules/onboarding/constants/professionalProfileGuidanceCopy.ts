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

/** Aviso al marcar terapia de pareja (click en ámbitos de atención). */
export const PROFESSIONAL_COUPLES_THERAPY_MEET_NOTICE_BULLETS: readonly LocalizedText[] = [
  {
    es: "En llamadas de Google Meet con 3 o más personas, la versión gratuita permite hasta 45 minutos.",
    en: "On Google Meet calls with 3 or more people, the free version allows up to 45 minutes.",
    pt: "Em chamadas do Google Meet com 3 ou mais pessoas, a versao gratuita permite ate 45 minutos."
  },
  {
    es: "Para sesiones de 60 minutos o más, es necesario usar una cuenta con Google Workspace.",
    en: "For 60-minute sessions or longer, you need an account with Google Workspace.",
    pt: "Para sessoes de 60 minutos ou mais, e necessario usar uma conta com Google Workspace."
  }
];

/** @deprecated Usar aviso al click; ya no se repite en el modal de avance. */
export const PROFESSIONAL_IDENTITY_ADVANCE_COUPLES_BULLETS = PROFESSIONAL_COUPLES_THERAPY_MEET_NOTICE_BULLETS;

export const PROFESSIONAL_PAYOUT_SETUP_LEAD: LocalizedText = {
  es: "Ingresá tus datos bancarios para que podamos transferirte el pago correspondiente a las sesiones realizadas durante el mes.",
  en: "Enter your bank details so we can transfer the payment for the sessions you complete during the month.",
  pt: "Informe seus dados bancarios para que possamos transferir o pagamento das sessoes realizadas durante o mes."
};

export const PROFESSIONAL_PAYOUT_FISCAL_NOTICE: LocalizedText = {
  es: "Deben coincidir con tu documento y con el titular de la cuenta bancaria. Los usamos para cumplir normativa y liberar tus cobros.",
  en: "These must match your ID and bank account holder. We use them for compliance and to release your payouts.",
  pt: "Devem coincidir com seu documento e com o titular da conta bancaria. Usamos para conformidade e liberar seus recebimentos."
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
