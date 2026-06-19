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
  | "patient-emotional-diary-load"
  | "patient-emotional-diary-summary"
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
  "patient-emotional-diary-load": {
    es: "No pudimos cargar el diario emocional compartido. Intentá de nuevo.",
    en: "We couldn’t load the shared emotional diary. Try again.",
    pt: "Nao foi possivel carregar o diario emocional compartilhado. Tente de novo."
  },
  "patient-emotional-diary-summary": {
    es: "No pudimos generar el resumen de sesión del diario. Intentá de nuevo.",
    en: "We couldn’t generate the diary session summary. Try again.",
    pt: "Nao foi possivel gerar o resumo de sessao do diario. Tente de novo."
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

function verifyResendDeliveryIssueMessage(language: AppLanguage, raw: string): string | null {
  const n = raw.trim();
  if (
    /503/.test(n)
    || /RESEND_API_KEY/i.test(n)
    || /not configured/i.test(n)
    || /EMAIL_NOT_CONFIGURED/i.test(n)
    || /SERVICE_UNAVAILABLE/i.test(n)
  ) {
    return t(language, {
      es: "El envío de correos no está configurado en el servidor. Avisá al equipo técnico para que configure Resend (RESEND_API_KEY y EMAIL_FROM) en Railway.",
      en: "Email delivery isn’t configured on the server. Ask your tech team to set up Resend (RESEND_API_KEY and EMAIL_FROM) on Railway.",
      pt: "O envio de e-mails nao esta configurado no servidor. Avise a equipe tecnica para configurar Resend (RESEND_API_KEY e EMAIL_FROM) no Railway."
    });
  }
  if (
    /502/.test(n)
    || /403/.test(n)
    || /Domain not verified/i.test(n)
    || /EMAIL_DELIVERY_FAILED/i.test(n)
    || /Resend HTTP/i.test(n)
  ) {
    return t(language, {
      es: "Resend rechazó el envío: el dominio de EMAIL_FROM no está verificado en Resend (revisá Domains y los DNS, o usá un remitente ya verificado). Avisá al equipo técnico.",
      en: "Resend rejected the send: the EMAIL_FROM domain isn’t verified in Resend (check Domains and DNS, or use a verified sender). Contact your tech team.",
      pt: "O Resend rejeitou o envio: o dominio de EMAIL_FROM nao esta verificado no Resend (confira Domains e DNS). Avise a equipe tecnica."
    });
  }
  return null;
}

/** Tras el redirect de Google OAuth (`?calendar_sync=…` en la URL del portal pro). */
export function friendlyCalendarOAuthReturnMessage(
  language: AppLanguage,
  params: { status: "error" | "cancelled"; reason: string | null; detail?: string | null }
): string {
  if (params.status === "cancelled") {
    return t(language, {
      es: "No conectamos Google Calendar en este paso. Podés tocar «Conectar ahora» de nuevo, o hacerlo más tarde desde Ajustes.",
      en: "We didn’t connect Google Calendar this time. Tap “Connect now” again, or do it later from Settings.",
      pt: "Nao conectamos o Google Calendar neste passo. Toque em «Conectar agora» de novo ou faca depois em Ajustes."
    });
  }
  const r = (params.reason ?? "").trim();
  if (r === "missing_refresh_token") {
    return t(language, {
      es: "Google no devolvió permiso de acceso prolongado (suele pasar si ya habías autorizado la app). En Google: Cuenta → Seguridad → Acceso de terceros, revocá «MotivarCare» y probá «Conectar ahora» otra vez; o probá en una ventana de incógnito.",
      en: "Google didn’t return long-lived access (common if you already authorized the app). In your Google account, revoke MotivarCare under third-party access, then try “Connect again”—or use a private/incognito window.",
      pt: "O Google nao devolveu acesso prolongado (comum se voce ja autorizou o app). Na conta Google, revogue o acesso do MotivarCare em apps de terceiros e tente «Conectar» de novo, ou use uma janela anonima."
    });
  }
  if (r === "google_token_network_error") {
    return t(language, {
      es: "Google respondió pero la conexión se cortó antes de terminar (fallo de red entre el servidor y Google). Probá «Conectar ahora» otra vez en unos segundos; suele funcionar al segundo intento.",
      en: "Google responded but the connection dropped before finishing (network issue between our server and Google). Try “Connect now” again in a few seconds—it often works on the second try.",
      pt: "O Google respondeu, mas a conexao caiu antes de terminar (falha de rede entre o servidor e o Google). Tente «Conectar agora» de novo em alguns segundos."
    });
  }
  if (r === "oauth_exchange_failed") {
    const detail = (params.detail ?? "").trim();
    if (detail) {
      return t(language, {
        es: `No pudimos cerrar la conexión con Google (${detail}). Si administrás el entorno, revisá GOOGLE_CLIENT_ID/SECRET en Railway y la URI https://api.motivarcare.com/api/auth/google/calendar/callback en Google Cloud. Podés seguir con «Lo hago después».`,
        en: `We couldn’t finish the Google connection (${detail}). If you manage this environment, check GOOGLE_CLIENT_ID/SECRET on Railway and callback URI https://api.motivarcare.com/api/auth/google/calendar/callback in Google Cloud. You can continue with “I’ll do it later”.`,
        pt: `Nao foi possivel concluir a conexao com o Google (${detail}). Se voce administra o ambiente, confira GOOGLE_CLIENT_ID/SECRET no Railway e a URI https://api.motivarcare.com/api/auth/google/calendar/callback na Google Cloud. Pode seguir com «Depois eu faco».`
      });
    }
    return t(language, {
      es: "No pudimos cerrar la conexión con Google (credenciales o URI de redirección del API). Si administrás el entorno, revisá GOOGLE_CLIENT_ID/SECRET y que la URI de callback sea exactamente https://api.motivarcare.com/api/auth/google/calendar/callback en Google Cloud. Podés seguir sin calendario con «Lo hago después».",
      en: "We couldn’t finish the Google connection (credentials or API redirect URI). If you manage this environment, check GOOGLE_CLIENT_ID/SECRET and set the callback URI to exactly https://api.motivarcare.com/api/auth/google/calendar/callback in Google Cloud. You can continue without calendar via “I’ll do it later”.",
      pt: "Nao foi possivel concluir a conexao com o Google (credenciais ou URI de callback da API). Se voce administra o ambiente, confira GOOGLE_CLIENT_ID/SECRET e a URI https://api.motivarcare.com/api/auth/google/calendar/callback na Google Cloud. Pode seguir sem calendario com «Depois eu faco»."
    });
  }
  if (r === "redirect_uri_mismatch") {
    return t(language, {
      es: "Google rechazó la URI de redirección. En Google Cloud → Credenciales OAuth, agregá exactamente: https://api.motivarcare.com/api/auth/google/calendar/callback (no uses app.motivarcare.com). Luego probá «Conectar ahora» de nuevo.",
      en: "Google rejected the redirect URI. In Google Cloud → OAuth credentials, add exactly: https://api.motivarcare.com/api/auth/google/calendar/callback (not app.motivarcare.com). Then try “Connect now” again.",
      pt: "O Google rejeitou a URI de redirecionamento. Em Google Cloud → credenciais OAuth, adicione exatamente: https://api.motivarcare.com/api/auth/google/calendar/callback (nao use app.motivarcare.com). Depois tente «Conectar agora»."
    });
  }
  if (r === "invalid_client") {
    return t(language, {
      es: "Las credenciales OAuth de Google no son válidas en el servidor (GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en Railway). Revisá que coincidan con Google Cloud y redeployá el API.",
      en: "Google OAuth credentials on the server are invalid (GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET on Railway). Match them to Google Cloud and redeploy the API.",
      pt: "As credenciais OAuth do Google no servidor sao invalidas (GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET no Railway). Confira no Google Cloud e redeploy da API."
    });
  }
  if (r === "invalid_grant") {
    return t(language, {
      es: "El código de autorización de Google expiró o ya se usó. Probá «Conectar ahora» de nuevo en una sola pestaña.",
      en: "Google’s authorization code expired or was already used. Try “Connect now” again in a single tab.",
      pt: "O codigo de autorizacao do Google expirou ou ja foi usado. Tente «Conectar agora» de novo em uma unica aba."
    });
  }
  if (r === "unauthorized_client") {
    return t(language, {
      es: "Google rechazó el cliente OAuth (GOOGLE_CLIENT_ID incorrecto o tipo de app incompatible). Revisá que el Client ID de Railway sea el mismo «Web application» de Google Cloud.",
      en: "Google rejected the OAuth client (wrong GOOGLE_CLIENT_ID or incompatible app type). Ensure Railway uses the same Web application Client ID from Google Cloud.",
      pt: "O Google rejeitou o cliente OAuth (GOOGLE_CLIENT_ID incorreto). Confira se o Railway usa o mesmo Client ID Web do Google Cloud."
    });
  }
  if (r === "google_userinfo_failed") {
    return t(language, {
      es: "Google autorizó el calendario pero no pudimos leer tu email de perfil. Probá de nuevo o conectá más tarde desde Ajustes.",
      en: "Google authorized calendar access but we couldn’t read your profile email. Try again or connect later from Settings.",
      pt: "O Google autorizou o calendario, mas nao foi possivel ler seu e-mail de perfil. Tente de novo ou conecte depois em Ajustes."
    });
  }
  if (r === "calendar_connection_persist_failed") {
    return t(language, {
      es: "Google respondió bien pero no pudimos guardar la conexión en el servidor. Probá de nuevo en unos minutos.",
      en: "Google responded OK but we couldn’t save the connection on the server. Try again in a few minutes.",
      pt: "O Google respondeu bem, mas nao foi possivel salvar a conexao no servidor. Tente de novo em alguns minutos."
    });
  }
  if (r === "missing_code") {
    return t(language, {
      es: "La respuesta de Google llegó incompleta. Probá «Conectar ahora» de nuevo.",
      en: "Google’s response was incomplete. Try “Connect now” again.",
      pt: "A resposta do Google veio incompleta. Tente «Conectar agora» de novo."
    });
  }
  if (r === "session_mismatch") {
    return t(language, {
      es: "La cuenta con la que volviste no coincide con tu sesión actual. Cerrá otras pestañas o volvé a iniciar sesión e intentá de nuevo.",
      en: "The account you returned with doesn’t match your current session. Close other tabs or sign in again and retry.",
      pt: "A conta com que voce voltou nao coincide com a sessao atual. Feche outras abas ou entre de novo e tente outra vez."
    });
  }
  if (r === "access_denied") {
    return t(language, {
      es: "Google no recibió el permiso necesario. Probá de nuevo o conectá el calendario más tarde desde Ajustes.",
      en: "Google didn’t get the permission needed. Try again or connect your calendar later from Settings.",
      pt: "O Google nao recebeu a permissao necessaria. Tente de novo ou conecte o calendario depois em Ajustes."
    });
  }
  return t(language, {
    es: "No pudimos completar la conexión con Google Calendar. Probá de nuevo en un rato o desde Ajustes, o seguí con «Lo hago después».",
    en: "We couldn’t finish connecting Google Calendar. Try again shortly or from Settings, or continue with “I’ll do it later”.",
    pt: "Nao foi possivel concluir a conexao com o Google Calendar. Tente em breve ou em Ajustes, ou continue com «Depois eu faco»."
  });
}

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
    if (context === "verify-resend") {
      const delivery = verifyResendDeliveryIssueMessage(language, raw);
      if (delivery) {
        return delivery;
      }
    }
  }
  return t(language, SURFACE[context]);
}
