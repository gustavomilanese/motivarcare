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
  es: "El paciente paga a MotivarCare; nosotros retenemos la comisión de la plataforma y te transferimos tu parte neta a la cuenta que indiques acá.",
  en: "Patients pay MotivarCare; we retain the platform fee and transfer your net share to the account you enter here.",
  pt: "O paciente paga ao MotivarCare; retemos a comissao da plataforma e transferimos sua parte liquida para a conta indicada aqui."
};

export const PROFESSIONAL_PAYOUT_FISCAL_NOTICE: LocalizedText = {
  es: "Deben coincidir con tu documento y con el titular de la cuenta bancaria. Los usamos para cumplir normativa y liberar tus cobros.",
  en: "These must match your ID and bank account holder. We use them for compliance and to release your payouts.",
  pt: "Devem coincidir com seu documento e com o titular da conta bancaria. Usamos para conformidade e liberar seus recebimentos."
};

export const PROFESSIONAL_PAYOUT_FLOW_STEPS: ReadonlyArray<{ title: LocalizedText; body: LocalizedText }> = [
  {
    title: { es: "El paciente paga", en: "Patient pays", pt: "Paciente paga" },
    body: {
      es: "Cobra la sesión o paquete con tarjeta u otros medios locales (dLocal en Argentina).",
      en: "They pay for the session or package by card or local methods (dLocal in Argentina).",
      pt: "Paga a sessao ou pacote com cartao ou metodos locais (dLocal na Argentina)."
    }
  },
  {
    title: { es: "MotivarCare liquida", en: "MotivarCare settles", pt: "MotivarCare liquida" },
    body: {
      es: "Al completarse la sesión calculamos tu neto: precio de lista menos comisión de plataforma.",
      en: "When the session is completed we calculate your net: list price minus platform fee.",
      pt: "Ao concluir a sessao calculamos seu liquido: preco de lista menos comissao da plataforma."
    }
  },
  {
    title: { es: "Transferimos a tu banco", en: "We pay your bank", pt: "Transferimos ao seu banco" },
    body: {
      es: "Acumulás saldo pendiente y lo transferimos a tu CBU/CVU/alias o cuenta internacional.",
      en: "You accrue a pending balance and we transfer it to your CBU/CVU/alias or international account.",
      pt: "Voce acumula saldo pendente e transferimos para seu CBU/CVU/alias ou conta internacional."
    }
  }
];

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
