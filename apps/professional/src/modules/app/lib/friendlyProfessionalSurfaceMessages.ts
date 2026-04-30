import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function softNetworkOrHttp(language: AppLanguage, raw: string): string | null {
  const n = raw.trim();
  if (/Cannot reach API at/i.test(n)) {
    return t(language, {
      es: "No pudimos conectar con el servidor. Revisá tu conexión, esperá unos segundos o volvé a intentar.",
      en: "We couldn’t reach the server. Check your connection, wait a few seconds, or try again.",
      pt: "Nao foi possivel conectar ao servidor. Verifique a conexao, aguarde e tente novamente."
    });
  }
  if (n.startsWith("HTTP ")) {
    return t(language, {
      es: "Hubo una demora en el servicio. Probá de nuevo en un ratito; si persiste, avisá al equipo técnico.",
      en: "The service took longer than expected. Try again shortly; if it persists, contact your tech team.",
      pt: "O servico demorou mais que o esperado. Tente em instantes; se persistir, avise a equipe tecnica."
    });
  }
  return null;
}

export function professionalAuthSurfaceMessage(raw: string, language: AppLanguage): string {
  const n = raw.trim();
  const net = softNetworkOrHttp(language, n);
  if (net) {
    return net;
  }
  if (n === "Invalid credentials") {
    return t(language, {
      es: "El email o la contraseña no coinciden. Revisá mayúsculas, probá de nuevo o usá «Crear cuenta» si recién te registrás.",
      en: "Email or password doesn’t match. Check caps, try again, or use sign-up if you’re new.",
      pt: "Email ou senha nao confere. Verifique maiusculas ou cadastre-se se for novo."
    });
  }
  if (n === "Email already in use") {
    return t(language, {
      es: "Ese email ya tiene cuenta. Iniciá sesión o recuperá la contraseña si no la recordás.",
      en: "That email already has an account. Sign in or reset your password.",
      pt: "Esse email ja tem conta. Entre ou redefina a senha."
    });
  }
  if (n === "Unauthorized" || n === "Invalid or expired token") {
    return t(language, {
      es: "Tu sesión venció. Volvé a iniciar sesión con tu email y contraseña.",
      en: "Your session expired. Sign in again with your email and password.",
      pt: "Sua sessao expirou. Entre novamente."
    });
  }
  if (n === "User account is disabled") {
    return t(language, {
      es: "Tu cuenta está desactivada. Escribinos a soporte para reactivarla.",
      en: "Your account is deactivated. Contact support to re-enable it.",
      pt: "Sua conta esta desativada. Fale com o suporte."
    });
  }
  if (/[^\x00-\x7F]/.test(n) || n.length >= 48) {
    return n;
  }
  return t(language, {
    es: "No pudimos validar el acceso. Revisá tus datos o intentá de nuevo en un momento.",
    en: "We couldn’t validate access. Check your details or try again shortly.",
    pt: "Nao foi possivel validar o acesso. Confira os dados ou tente em instantes."
  });
}

const COPY = {
  authValidationEmail: {
    es: "Necesitamos un email válido y contraseña de al menos 8 caracteres. Corregí los campos y reintentá.",
    en: "We need a valid email and a password of at least 8 characters. Fix the fields and retry.",
    pt: "Precisamos de email valido e senha com pelo menos 8 caracteres."
  },
  authValidationName: {
    es: "Agregá tu nombre completo como figura en tu matrícula o práctica; así los pacientes te reconocen.",
    en: "Please add your full name as it appears professionally so patients recognize you.",
    pt: "Preencha seu nome completo profissional."
  },
  portalRoleMismatch: {
    es: "Esta cuenta no corresponde al portal profesional. Usá el acceso de paciente o el email con el que te registraste como profesional.",
    en: "This account isn’t for the professional portal. Use patient access or the email you used as a professional.",
    pt: "Esta conta nao e do portal profissional."
  }
} satisfies Record<string, LocalizedText>;

export function professionalAuthValidationMessage(
  kind: "email" | "name" | "portal-mismatch",
  language: AppLanguage
): string {
  if (kind === "email") {
    return t(language, COPY.authValidationEmail);
  }
  if (kind === "name") {
    return t(language, COPY.authValidationName);
  }
  return t(language, COPY.portalRoleMismatch);
}

export type ProfessionalSurfaceContext =
  | "published-slots-load"
  | "published-slot-delete"
  | "published-agenda-load"
  | "published-reschedule-availability"
  | "published-reschedule-save"
  | "published-cancel-booking"
  | "settings-password"
  | "settings-calendar-connect"
  | "settings-calendar-disconnect"
  | "schedule-slots-load"
  | "schedule-minimum-notice"
  | "schedule-session-rate"
  | "schedule-weekly"
  | "schedule-vacation-save"
  | "schedule-vacation-cancel"
  | "profile-load"
  | "profile-save"
  | "profile-image-type"
  | "profile-image-size"
  | "profile-image-read"
  | "patients-load"
  | "patient-detail-load"
  | "income-load"
  | "dashboard-load"
  | "dashboard-reschedule-availability"
  | "dashboard-reschedule-save"
  | "dashboard-cancel-booking"
  | "chat-threads"
  | "chat-messages"
  | "chat-send"
  | "reset-password-validation"
  | "reset-password-save"
  | "forgot-password-email"
  | "forgot-password-send"
  | "verify-resend"
  | "verify-token-missing"
  | "verify-token-fail"
  | "availability-month-load"
  | "availability-month-save-day"
  | "availability-month-remove-slot"
  | "admin-tab-load"
  | "admin-tab-save"
  | "calendar-onboarding"
  | "calendar-onboarding-not-configured";

const SURFACE: Record<ProfessionalSurfaceContext, LocalizedText> = {
  "published-slots-load": {
    es: "No pudimos cargar los horarios publicados. Refrescá la página o probá de nuevo en unos segundos.",
    en: "We couldn’t load published slots. Refresh the page or try again shortly.",
    pt: "Nao foi possivel carregar os horarios publicados. Atualize a pagina."
  },
  "published-slot-delete": {
    es: "No pudimos quitar ese horario. Si sigue visible, recargá la agenda o intentá otra vez.",
    en: "We couldn’t remove that slot. Reload the schedule or try again.",
    pt: "Nao foi possivel remover o horario. Recarregue a agenda."
  },
  "published-agenda-load": {
    es: "La agenda no cargó. Revisá la conexión y tocá para actualizar, o entrá de nuevo a esta pantalla.",
    en: "The agenda didn’t load. Check your connection and refresh, or open this screen again.",
    pt: "A agenda nao carregou. Verifique a conexao e atualize."
  },
  "published-reschedule-availability": {
    es: "No pudimos traer horarios libres para reprogramar. Volvé atrás y abrí de nuevo la reserva, o probá más tarde.",
    en: "We couldn’t load open times to reschedule. Go back and open the booking again, or try later.",
    pt: "Nao foi possivel carregar horarios para reagendar. Volte e abra a reserva de novo."
  },
  "published-reschedule-save": {
    es: "No se guardó la nueva fecha. Elegí otro horario o reintentá; la reserva anterior sigue vigente hasta que se confirme el cambio.",
    en: "The new time wasn’t saved. Pick another slot or retry; the old time stays until the change succeeds.",
    pt: "A nova data nao foi salva. Escolha outro horario ou tente de novo."
  },
  "published-cancel-booking": {
    es: "No pudimos cancelar la sesión desde acá. Refrescá la lista o contactá soporte si el paciente ya no debería verla.",
    en: "We couldn’t cancel the session here. Refresh the list or contact support if it should be gone.",
    pt: "Nao foi possivel cancelar a sessao aqui. Atualize a lista ou fale com o suporte."
  },
  "settings-password": {
    es: "La contraseña no se actualizó. Revisá la actual y la nueva (mínimo 8 caracteres) y volvé a guardar.",
    en: "Password didn’t update. Check current and new password (8+ chars) and save again.",
    pt: "A senha nao foi atualizada. Confira a atual e a nova (min. 8 caracteres)."
  },
  "settings-calendar-connect": {
    es: "No pudimos abrir Google Calendar. Probá de nuevo, revisá que el navegador no bloquee ventanas, o seguí sin calendario por ahora.",
    en: "We couldn’t start Google Calendar. Retry, check pop-up blockers, or continue without calendar for now.",
    pt: "Nao foi possivel abrir o Google Calendar. Tente de novo ou continue sem calendario."
  },
  "settings-calendar-disconnect": {
    es: "No pudimos desvincular el calendario. Reintentá en un momento; mientras tanto los turnos en la app siguen igual.",
    en: "We couldn’t disconnect the calendar. Try again shortly; bookings in the app stay as they are.",
    pt: "Nao foi possivel desvincular o calendario. Tente em instantes."
  },
  "schedule-slots-load": {
    es: "No cargaron los bloques de agenda. Actualizá la página o volvé al menú Agenda y entrá otra vez.",
    en: "Schedule blocks didn’t load. Refresh or open Agenda again from the menu.",
    pt: "Os blocos da agenda nao carregaram. Atualize ou abra a Agenda de novo."
  },
  "schedule-minimum-notice": {
    es: "No guardamos el aviso mínimo de reserva. Revisá el número de horas (entero razonable) y guardá de nuevo.",
    en: "Minimum booking notice didn’t save. Enter a sensible whole number of hours and save again.",
    pt: "O aviso minimo nao foi salvo. Use um numero inteiro de horas e salve de novo."
  },
  "schedule-session-rate": {
    es: "No guardamos el valor por sesión. Ingresá un monto válido en USD o probá más tarde.",
    en: "Session rate didn’t save. Enter a valid USD amount or try later.",
    pt: "O valor da sessao nao foi salvo. Informe um valor valido."
  },
  "schedule-weekly": {
    es: "No se guardó tu horario semanal. Revisá que no haya solapes raros y tocá guardar otra vez.",
    en: "Weekly hours didn’t save. Check for odd overlaps and save again.",
    pt: "O horario semanal nao foi salvo. Verifique sobreposicoes e salve de novo."
  },
  "schedule-vacation-save": {
    es: "No pudimos registrar esas fechas de ausencia. Elegí el rango otra vez o probá en unos minutos.",
    en: "We couldn’t save those away dates. Pick the range again or try in a few minutes.",
    pt: "Nao foi possivel salvar as ausencias. Escolha o periodo de novo."
  },
  "schedule-vacation-cancel": {
    es: "No pudimos quitar el bloqueo de vacaciones. Refrescá y reintentá, o editá manualmente los días.",
    en: "We couldn’t remove the vacation block. Refresh and retry, or adjust days manually.",
    pt: "Nao foi possivel remover ferias. Atualize e tente de novo."
  },
  "profile-load": {
    es: "Tu perfil no cargó. Refrescá la página o cerrá sesión y volvé a entrar.",
    en: "Your profile didn’t load. Refresh or sign out and back in.",
    pt: "Seu perfil nao carregou. Atualize ou saia e entre de novo."
  },
  "profile-save": {
    es: "Los cambios no se guardaron. Revisá los campos obligatorios y tocá guardar otra vez; si persiste, copiá el texto en un archivo por las dudas.",
    en: "Changes didn’t save. Check required fields and save again; if it persists, copy text elsewhere just in case.",
    pt: "As alteracoes nao foram salvas. Confira os campos obrigatorios e salve de novo."
  },
  "profile-image-type": {
    es: "Elegí una imagen JPG, PNG o WEBP. Si no querés cambiar la foto, cancelá y seguí.",
    en: "Choose a JPG, PNG, or WEBP image—or cancel to keep your current photo.",
    pt: "Escolha JPG, PNG ou WEBP, ou cancele para manter a foto."
  },
  "profile-image-size": {
    es: "La imagen pesa más de 4 MB. Comprimila en tu teléfono o elegí otra más chica.",
    en: "That image is over 4 MB. Compress it or pick a smaller file.",
    pt: "A imagem passa de 4 MB. Comprima ou escolha outra menor."
  },
  "profile-image-read": {
    es: "No pudimos leer ese archivo. Probá con otra foto o subila desde otra carpeta.",
    en: "We couldn’t read that file. Try another photo or pick from another folder.",
    pt: "Nao foi possivel ler o arquivo. Tente outra foto."
  },
  "patients-load": {
    es: "La lista de pacientes no cargó. Actualizá la pantalla o probá de nuevo cuando tengas mejor señal.",
    en: "Patients list didn’t load. Refresh or try again with a better connection.",
    pt: "A lista de pacientes nao carregou. Atualize ou tente com melhor sinal."
  },
  "patient-detail-load": {
    es: "No pudimos cargar la ficha de este paciente. Volvé a la lista o intentá de nuevo.",
    en: "We couldn’t load this patient’s details. Go back to the list or try again.",
    pt: "Nao foi possivel carregar a ficha deste paciente. Volte a lista ou tente de novo."
  },
  "income-load": {
    es: "No pudimos mostrar tus ingresos aún. Reintentá más tarde o revisá filtros de fechas.",
    en: "Earnings couldn’t load yet. Retry later or check your date filters.",
    pt: "Os ganhos ainda nao carregaram. Tente mais tarde."
  },
  "dashboard-load": {
    es: "El panel no cargó. Refrescá o volvé al inicio del portal; tus datos están seguros en el servidor.",
    en: "Dashboard didn’t load. Refresh or return home—your data is safe on the server.",
    pt: "O painel nao carregou. Atualize ou volte ao inicio."
  },
  "dashboard-reschedule-availability": {
    es: "No trajimos horarios para mover la sesión. Cerrá el modal y abrilo de nuevo, o probá otro día.",
    en: "We couldn’t load times to move the session. Close the modal and reopen, or try another day.",
    pt: "Nao foi possivel carregar horarios para remarcar. Feche e abra o modal de novo."
  },
  "dashboard-reschedule-save": {
    es: "No se aplicó el cambio de horario. Elegí otro hueco o intentá de nuevo; la sesión queda como estaba.",
    en: "The time change didn’t apply. Pick another slot or retry—the session stays as before.",
    pt: "A mudanca de horario nao foi aplicada. Escolha outro horario."
  },
  "dashboard-cancel-booking": {
    es: "No pudimos cancelar desde el panel. Actualizá la página o gestioná la sesión desde la agenda publicada.",
    en: "We couldn’t cancel from the dashboard. Refresh or manage the session from your published schedule.",
    pt: "Nao foi possivel cancelar pelo painel. Atualize ou use a agenda publicada."
  },
  "chat-threads": {
    es: "No cargaron las conversaciones. Tirá para actualizar o salí del chat y volvé a entrar.",
    en: "Conversations didn’t load. Pull to refresh or leave chat and open it again.",
    pt: "As conversas nao carregaram. Atualize ou entre no chat de novo."
  },
  "chat-messages": {
    es: "Los mensajes no llegaron. Elegí otro paciente y volvé a este, o esperá unos segundos.",
    en: "Messages didn’t load. Switch patient and back, or wait a few seconds.",
    pt: "As mensagens nao carregaram. Troque de paciente e volte."
  },
  "chat-send": {
    es: "El mensaje no se envió; el texto sigue en el cuadro. Revisá la conexión y tocá enviar otra vez.",
    en: "Message didn’t send—your text is still there. Check connection and send again.",
    pt: "A mensagem nao foi enviada; o texto continua na caixa. Envie de novo."
  },
  "reset-password-validation": {
    es: "Revisá que ambas contraseñas coincidan y tengan al menos 8 caracteres antes de guardar.",
    en: "Make sure both passwords match and are at least 8 characters before saving.",
    pt: "As senhas devem coincidir e ter pelo menos 8 caracteres."
  },
  "reset-password-save": {
    es: "No actualizamos la contraseña. Pedí un nuevo enlace de recuperación o iniciá sesión si ya la cambiaste.",
    en: "Password wasn’t updated. Request a new reset link or sign in if you already changed it.",
    pt: "A senha nao foi atualizada. Pec um novo link ou entre se ja alterou."
  },
  "forgot-password-email": {
    es: "Escribí un email válido para enviarte las instrucciones de recuperación.",
    en: "Enter a valid email so we can send reset instructions.",
    pt: "Informe um email valido para receber as instrucoes."
  },
  "forgot-password-send": {
    es: "No pudimos enviar el correo ahora. Reintentá en unos minutos o verificá que el email sea el correcto.",
    en: "We couldn’t send the email now. Retry in a few minutes or double-check the address.",
    pt: "Nao foi possivel enviar o e-mail agora. Tente em alguns minutos."
  },
  "verify-resend": {
    es: "No pudimos reenviar el mail. Esperá un minuto, revisá spam o iniciá sesión si ya verificaste.",
    en: "We couldn’t resend the email. Wait a minute, check spam, or sign in if you already verified.",
    pt: "Nao foi possivel reenviar o e-mail. Aguarde ou verifique o spam."
  },
  "verify-token-missing": {
    es: "El enlace llegó incompleto. Abrilo desde el correo más reciente o pedí uno nuevo con «Reenviar».",
    en: "The link looks incomplete. Open it from the latest email or request a new one.",
    pt: "O link parece incompleto. Abra pelo e-mail mais recente."
  },
  "verify-token-fail": {
    es: "Ese enlace ya no sirve (venció o se usó). Pedí otro correo o iniciá sesión si tu cuenta ya está activa.",
    en: "That link no longer works (expired or used). Request a new email or sign in if you’re already active.",
    pt: "Esse link nao funciona mais. Pec outro e-mail ou entre na conta."
  },
  "availability-month-load": {
    es: "No cargó el mes en la vista calendario. Cambiá de mes y volvé, o actualizá la página.",
    en: "Calendar month didn’t load. Switch months and back, or refresh.",
    pt: "O mes nao carregou no calendario. Troque de mes ou atualize."
  },
  "availability-month-save-day": {
    es: "No guardamos los cambios de ese día. Revisá horarios sin solapes imposibles y guardá otra vez.",
    en: "That day’s changes didn’t save. Fix impossible overlaps and save again.",
    pt: "As alteracoes do dia nao foram salvas. Corrija sobreposicoes e salve."
  },
  "availability-month-remove-slot": {
    es: "No pudimos borrar ese bloque. Refrescá y probá otra vez, o editá desde la vista semanal.",
    en: "We couldn’t delete that block. Refresh and retry, or edit from the weekly view.",
    pt: "Nao foi possivel remover o bloco. Atualize ou edite na vista semanal."
  },
  "admin-tab-load": {
    es: "No cargó la sección administrativa. Volvé al menú y entrá de nuevo, o refrescá.",
    en: "Admin section didn’t load. Open it again from the menu or refresh.",
    pt: "A secao admin nao carregou. Abra de novo pelo menu."
  },
  "admin-tab-save": {
    es: "Los cambios no se guardaron. Revisá los campos y tocá guardar otra vez.",
    en: "Changes didn’t save. Check fields and save again.",
    pt: "As alteracoes nao foram salvas. Salve de novo."
  },
  "calendar-onboarding": {
    es: "No pudimos abrir Google ahora. Podés continuar igual y conectar el calendario después desde Ajustes.",
    en: "We couldn’t open Google right now. Continue and connect Calendar later from Settings.",
    pt: "Nao foi possivel abrir o Google agora. Continue e conecte depois em Ajustes."
  },
  "calendar-onboarding-not-configured": {
    es: "Google Calendar aún no está disponible en este entorno. Seguí usando la app; podrás vincularlo cuando el equipo lo active.",
    en: "Google Calendar isn’t available in this environment yet. Keep using the app—you can link it when your team enables it.",
    pt: "O Google Calendar ainda nao esta disponivel neste ambiente. Continue usando o app."
  }
};

export function professionalSurfaceMessage(
  context: ProfessionalSurfaceContext,
  language: AppLanguage,
  raw?: string
): string {
  if (raw?.trim()) {
    const net = softNetworkOrHttp(language, raw);
    if (net) {
      return net;
    }
  }
  return t(language, SURFACE[context]);
}
