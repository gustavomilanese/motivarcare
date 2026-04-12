import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/* ─── Red compartida (HTTP / red / DB hints) ─── */

function softNetworkOrServer(language: AppLanguage, raw: string): string | null {
  const n = raw.trim();
  if (/Cannot reach API at/i.test(n)) {
    return t(language, {
      es: "No pudimos conectar con el servidor. Revisá tu Wi‑Fi o datos, probá de nuevo en unos segundos o volvé más tarde.",
      en: "We couldn’t reach the server. Check Wi‑Fi or mobile data, try again shortly, or come back later.",
      pt: "Nao foi possivel conectar ao servidor. Verifique Wi‑Fi ou dados, tente em instantes ou volte mais tarde."
    });
  }
  if (n.startsWith("HTTP ")) {
    return t(language, {
      es: "Hubo una demora en nuestros sistemas. Por favor intentá de nuevo en un ratito.",
      en: "Our systems took longer than usual. Please try again in a little while.",
      pt: "Nossos sistemas demoraram mais que o usual. Tente novamente daqui a pouco."
    });
  }
  if (
    n.includes("La base de datos está desactualizada") ||
    n.includes("db:sync") ||
    n.includes("P2022")
  ) {
    return t(language, {
      es: "Estamos acomodando algo en el servicio. Probá de nuevo en unos minutos; si sigue igual, escribinos y te ayudamos.",
      en: "We’re fixing something on our side. Try again in a few minutes; if it keeps happening, contact us and we’ll help.",
      pt: "Estamos ajustando algo do nosso lado. Tente em alguns minutos; se persistir, fale conosco."
    });
  }
  return null;
}

/* ─── Reservas (POST /bookings, etc.) ─── */

const BOOKING_DEFAULT: LocalizedText = {
  es: "En este momento no pudimos completar tu reserva. Podés probar con otro horario o intentar de nuevo en unos minutos.",
  en: "We couldn’t complete your booking just now. You can try another time or come back in a few minutes.",
  pt: "Nao conseguimos concluir sua reserva agora. Tente outro horario ou volte daqui a pouco."
};

export function friendlyBookingFailureMessage(raw: string, language: AppLanguage): string {
  const normalized = raw.trim();
  if (!normalized) {
    return t(language, BOOKING_DEFAULT);
  }

  const net = softNetworkOrServer(language, normalized);
  if (net) {
    return net;
  }

  if (normalized === "Professional already booked at that time") {
    return t(language, {
      es: "Ese horario acaba de ocuparse. Elegí otro que te quede bien cerca, o refrescá la lista de horarios.",
      en: "That time was just taken. Pick another nearby slot, or refresh the time list.",
      pt: "Esse horario acabou de ser reservado. Escolha outro proximo ou atualize a lista de horarios."
    });
  }

  if (normalized === "Another request is booking that slot right now. Please retry.") {
    return t(language, {
      es: "Alguien más está eligiendo ese mismo momento. Esperá unos segundos y tocá de nuevo, o elegí otro horario cercano.",
      en: "Someone else is booking that same moment. Wait a few seconds and tap again, or choose another nearby time.",
      pt: "Outra pessoa esta reservando esse horario. Aguarde alguns segundos e toque de novo, ou escolha outro proximo."
    });
  }

  if (normalized === "Selected time is no longer available") {
    return t(language, {
      es: "Ese horario ya no está libre. Volvé al calendario y elegí otra opción.",
      en: "That slot is no longer free. Go back to the calendar and choose another option.",
      pt: "Esse horario nao esta mais livre. Volte ao calendario e escolha outra opcao."
    });
  }

  if (normalized === "This day is blocked by vacation.") {
    return t(language, {
      es: "Ese día el profesional no ofrece turnos. Probá con otra fecha en el calendario.",
      en: "That day isn’t offered by this therapist. Try another date on the calendar.",
      pt: "Nesse dia o profissional nao oferece horarios. Tente outra data no calendario."
    });
  }

  if (/^Bookings must be scheduled at least \d+ hours in advance\b/.test(normalized)) {
    return t(language, {
      es: "Para cuidar el tiempo del profesional, hay que agendar con al menos un día de anticipación (a veces un poco más). Elegí una fecha más adelante en el calendario.",
      en: "To respect your therapist’s time, bookings need at least a day’s notice (sometimes more). Pick a later date in the calendar.",
      pt: "Para respeitar o profissional, o agendamento precisa de pelo menos um dia de antecedencia (as vezes mais). Escolha uma data mais tarde no calendario."
    });
  }

  if (normalized.startsWith("Booking blocked by intake risk triage")) {
    return t(language, {
      es: "Para acompañarte mejor, esta reserva tiene que ser vista por el equipo primero. Te vamos a escribir por email con los próximos pasos; también podés escribirnos vos si necesitás algo urgente.",
      en: "To support you safely, our team needs to review this booking first. We’ll email you with next steps—you can also message us if something is urgent.",
      pt: "Para apoiar voce com seguranca, nossa equipe precisa revisar esta reserva primeiro. Enviaremos um e-mail com os proximos passos; voce tambem pode nos chamar se for urgente."
    });
  }

  if (normalized === "Another request is updating that slot right now. Please retry.") {
    return t(language, {
      es: "Ese horario se está actualizando. Esperá un momento y volvé a intentar, o elegí otro turno.",
      en: "That slot is being updated. Wait a moment and try again, or pick another time.",
      pt: "Esse horario esta sendo atualizado. Aguarde um instante e tente de novo, ou escolha outro horario."
    });
  }

  if (
    normalized === "Patient profile not found" ||
    normalized === "Professional not found" ||
    normalized === "Only patients can create bookings"
  ) {
    return t(language, BOOKING_DEFAULT);
  }

  const looksLikeOurTone =
    /[^\x00-\x7F]/.test(normalized) ||
    normalized.length >= 56 ||
    /(sesión|sesiones|reserva|reservar|paquete|horario|profesional|volvé|elegí|podés|completar|demora|conexión)/i.test(
      normalized
    );

  if (looksLikeOurTone) {
    return normalized;
  }

  return t(language, BOOKING_DEFAULT);
}

/* ─── Autenticación ─── */

export function friendlyAuthSurfaceMessage(raw: string, language: AppLanguage): string {
  const n = raw.trim();
  const net = softNetworkOrServer(language, n);
  if (net) {
    return net;
  }
  if (n === "Invalid credentials") {
    return t(language, {
      es: "El email o la contraseña no coinciden. Revisá mayúsculas y espacios, probá de nuevo o tocá «Registrarme» si aún no tenés cuenta.",
      en: "Email or password doesn’t match. Check caps and spaces, try again, or tap «Sign up» if you’re new.",
      pt: "O email ou a senha nao confere. Verifique maiusculas e espacos, tente de novo ou toque em cadastrar se for novo."
    });
  }
  if (n === "Email already in use") {
    return t(language, {
      es: "Ese email ya tiene cuenta. Podés iniciar sesión con la contraseña que usaste, o pedir recuperar acceso si no la recordás.",
      en: "That email already has an account. Sign in with your password, or use password recovery if you don’t remember it.",
      pt: "Esse email ja tem conta. Entre com sua senha ou use a recuperacao de acesso se nao lembrar."
    });
  }
  if (n === "Unauthorized" || n === "Invalid or expired token") {
    return t(language, {
      es: "Tu sesión venció o no es válida. Volvé a iniciar sesión con tu email y contraseña.",
      en: "Your session expired or isn’t valid. Please sign in again with your email and password.",
      pt: "Sua sessao expirou ou nao e valida. Entre novamente com email e senha."
    });
  }
  if (n === "User account is disabled") {
    return t(language, {
      es: "Esta cuenta está desactivada. Escribinos a soporte y te decimos cómo seguir.",
      en: "This account is deactivated. Contact support and we’ll guide you on what to do next.",
      pt: "Esta conta esta desativada. Fale com o suporte para saber como continuar."
    });
  }
  if (n === "User not found") {
    return t(language, {
      es: "No encontramos una cuenta con ese email. Revisá si está bien escrito, o create una cuenta con «Registrarme».",
      en: "We couldn’t find an account with that email. Check the spelling, or create one with «Sign up».",
      pt: "Nao encontramos conta com esse email. Confira a digitacao ou crie uma conta em cadastrar."
    });
  }
  if (n.startsWith("Invalid payload") || n.includes("Invalid credentials payload")) {
    return t(language, {
      es: "Faltan datos o hay algo mal cargado en el formulario. Revisá email y contraseña (mínimo 8 caracteres) y volvé a intentar.",
      en: "Something in the form isn’t complete. Check email and password (at least 8 characters) and try again.",
      pt: "Algo no formulario nao esta completo. Confira email e senha (minimo 8 caracteres) e tente de novo."
    });
  }
  if (looksLikeUserFacingCopy(n)) {
    return n;
  }
  return t(language, {
    es: "No pudimos iniciar sesión justo ahora. Revisá tus datos, probá de nuevo o esperá un minuto y volvé a intentar.",
    en: "We couldn’t sign you in right now. Check your details, try again, or wait a minute and retry.",
    pt: "Nao foi possivel entrar agora. Confira seus dados, tente de novo ou espere um minuto."
  });
}

function looksLikeUserFacingCopy(normalized: string): boolean {
  return (
    /[^\x00-\x7F]/.test(normalized) ||
    normalized.length >= 48 ||
    /(cuenta|contraseña|email|sesión|portal|volvé|elegí|revisá|probá|tocá)/i.test(normalized)
  );
}

/* ─── Intake / perfil clínico ─── */

export function friendlyIntakeSaveMessage(raw: string, language: AppLanguage): string {
  const n = raw.trim();
  const net = softNetworkOrServer(language, n);
  if (net) {
    return net;
  }
  if (n === "Intake already completed") {
    return t(language, {
      es: "Este cuestionario ya estaba guardado. Podés seguir al inicio del portal o cerrar sesión y volver a entrar si algo no se actualiza en pantalla.",
      en: "This questionnaire was already saved. Continue to the portal home, or sign out and back in if the screen looks out of date.",
      pt: "Este questionario ja estava salvo. Siga para o inicio do portal ou saia e entre de novo se a tela parecer desatualizada."
    });
  }
  if (n === "Only patients can submit intake") {
    return t(language, {
      es: "Necesitás estar registrado como paciente para guardar esto. Si ves este mensaje raro, cerrá sesión y entrá de nuevo.",
      en: "You need to be signed in as a patient to save this. If this looks odd, sign out and sign back in.",
      pt: "Voce precisa estar logado como paciente para salvar. Se parecer estranho, saia e entre novamente."
    });
  }
  if (looksLikeUserFacingCopy(n)) {
    return n;
  }
  return t(language, {
    es: "No pudimos guardar tus respuestas en este momento. Tus datos siguen en pantalla: revisá la conexión y tocá enviar de nuevo, o probá en unos minutos.",
    en: "We couldn’t save your answers right now. They’re still on screen—check your connection and submit again, or try in a few minutes.",
    pt: "Nao foi possivel salvar suas respostas agora. Elas ainda estao na tela: confira a conexao e envie de novo, ou tente em alguns minutos."
  });
}

/* ─── Chat ─── */

export type ChatSurfaceKind = "threads" | "messages" | "open" | "send";

export function friendlyChatSurfaceMessage(kind: ChatSurfaceKind, raw: string, language: AppLanguage): string {
  const n = raw.trim();
  const net = softNetworkOrServer(language, n);
  if (net) {
    return net;
  }
  if (kind === "threads") {
    return t(language, {
      es: "No pudimos cargar la lista de conversaciones. Tirá hacia abajo si tu teléfono lo permite, o entrá de nuevo al chat en un ratito.",
      en: "We couldn’t load your conversations. Pull to refresh if you can, or open chat again shortly.",
      pt: "Nao foi possivel carregar suas conversas. Puxe para atualizar ou abra o chat de novo em instantes."
    });
  }
  if (kind === "messages") {
    return t(language, {
      es: "No pudimos cargar los mensajes de esta conversación. Probá tocando otro chat y volviendo acá, o esperá unos segundos y abrilo de nuevo.",
      en: "We couldn’t load this conversation. Try selecting another chat and back, or reopen it in a few seconds.",
      pt: "Nao foi possivel carregar as mensagens. Tente outra conversa e volte, ou reabra em alguns segundos."
    });
  }
  if (kind === "open") {
    return t(language, {
      es: "No pudimos abrir el chat con ese profesional. Volvé a la lista, elegí otro contacto y volvé a elegir este, o esperá un momento y probá de nuevo.",
      en: "We couldn’t open chat with that therapist. Go back to the list, pick another contact and this one again, or wait a moment and retry.",
      pt: "Nao foi possivel abrir o chat com esse profissional. Volte na lista, escolha outro contato e este de novo, ou espere um pouco."
    });
  }
  if (kind === "send") {
    return t(language, {
      es: "Este mensaje no salió. Tu texto sigue en el cuadro: revisá la conexión y tocá enviar otra vez.",
      en: "This message didn’t send. Your text is still in the box—check your connection and tap send again.",
      pt: "Esta mensagem nao foi enviada. O texto continua na caixa: confira a conexao e envie de novo."
    });
  }
  return t(language, {
    es: "Algo falló con el chat. Probá refrescar o volver más tarde.",
    en: "Something went wrong with chat. Try refreshing or coming back later.",
    pt: "Algo deu errado no chat. Atualize ou volte mais tarde."
  });
}

/* ─── Perfil: foto y calendario ─── */

export function friendlyProfileAvatarErrorMessage(requestError: unknown, language: AppLanguage): string {
  if (requestError instanceof Error && requestError.message === "Failed to fetch") {
    return t(language, {
      es: "No pudimos subir la foto por la conexión. Revisá internet o VPN, probá con otra imagen más liviana o intentá en unos minutos.",
      en: "We couldn’t upload the photo due to the connection. Check internet or VPN, try a smaller image, or try again shortly.",
      pt: "Nao foi possivel enviar a foto por causa da conexao. Verifique internet ou VPN, use uma imagem menor ou tente daqui a pouco."
    });
  }
  const raw = requestError instanceof Error ? requestError.message.trim() : "";
  const net = raw ? softNetworkOrServer(language, raw) : null;
  if (net) {
    return net;
  }
  if (raw && looksLikeUserFacingCopy(raw)) {
    return raw;
  }
  return t(language, {
    es: "No pudimos guardar la foto. Probá con un JPG o PNG de menos de 4 MB, o elegí otra imagen.",
    en: "We couldn’t save the photo. Try a JPG or PNG under 4 MB, or pick a different image.",
    pt: "Nao foi possivel salvar a foto. Use JPG ou PNG menor que 4 MB ou outra imagem."
  });
}

export function friendlyProfileCalendarConnectMessage(
  language: AppLanguage,
  options: { raw: string; notConfigured: boolean }
): string {
  if (options.notConfigured) {
    return t(language, {
      es: "En este entorno Google Calendar todavía no está habilitado para vincular. Podés seguir usando la app sin calendario, o intentar más tarde.",
      en: "Google Calendar linking isn’t enabled in this environment yet. You can keep using the app without it, or try again later.",
      pt: "A vinculacao com o Google Calendar ainda nao esta ativa neste ambiente. Voce pode usar o app sem ela ou tentar depois."
    });
  }
  const net = softNetworkOrServer(language, options.raw);
  if (net) {
    return net;
  }
  return t(language, {
    es: "No pudimos abrir la vinculación con Google. Probá de nuevo, revisá que estés logueado en el navegador, o seguí sin calendario por ahora.",
    en: "We couldn’t start Google linking. Try again, check you’re signed in to the browser, or continue without calendar for now.",
    pt: "Nao foi possivel iniciar a vinculacao com o Google. Tente de novo, confira o login no navegador ou continue sem calendario."
  });
}

/* ─── Verificación de email ─── */

export function friendlyVerifyEmailResendMessage(raw: string, language: AppLanguage): string {
  const net = softNetworkOrServer(language, raw.trim());
  if (net) {
    return net;
  }
  return t(language, {
    es: "No pudimos reenviar el correo en este momento. Revisá tu bandeja (y spam), esperá un minuto y tocá «Reenviar email», o cerrá sesión y entrá de nuevo.",
    en: "We couldn’t resend the email right now. Check your inbox (and spam), wait a minute and tap «Resend email», or sign out and back in.",
    pt: "Nao foi possivel reenviar o e-mail agora. Verifique a caixa de entrada (e spam), espere um minuto e toque reenviar, ou saia e entre de novo."
  });
}

export function friendlyVerifyEmailTokenMissingMessage(language: AppLanguage): string {
  return t(language, {
    es: "El enlace llegó incompleto (falta información al final). Abrilo de nuevo desde el mail, o pedí un nuevo correo desde «Reenviar email».",
    en: "The link looks incomplete. Open it again from the email, or request a new message with «Resend email».",
    pt: "O link parece incompleto. Abra de novo pelo e-mail ou peca outro em reenviar."
  });
}

export function friendlyVerifyEmailTokenFailedMessage(raw: string, language: AppLanguage): string {
  const n = raw.trim().toLowerCase();
  const net = softNetworkOrServer(language, raw.trim());
  if (net) {
    return net;
  }
  if (n.includes("expir") || n.includes("invalid") || n.includes("expired")) {
    return t(language, {
      es: "El enlace caducó o ya no es válido. Pedí un correo nuevo con «Reenviar email» desde la pantalla anterior, o iniciá sesión si ya verificaste.",
      en: "This link expired or isn’t valid anymore. Request a new email from the previous screen, or sign in if you already verified.",
      pt: "O link expirou ou nao e mais valido. Pec um novo e-mail na tela anterior ou entre se ja verificou."
    });
  }
  return t(language, {
    es: "No pudimos confirmar tu correo con ese enlace. Abrilo de nuevo desde el mail más reciente, o tocá «Reenviar email» para uno nuevo.",
    en: "We couldn’t confirm your email with that link. Open the latest email again, or tap «Resend email» for a fresh one.",
    pt: "Nao foi possivel confirmar seu e-mail com esse link. Abra o e-mail mais recente ou peca um novo em reenviar."
  });
}

/* ─── Pagos / paquetes (checkout) ─── */

export function friendlyCheckoutPackageMessage(raw: string, language: AppLanguage): string {
  const n = raw.trim();
  const net = softNetworkOrServer(language, n);
  if (net) {
    return t(language, {
      es: `${net} Lo que elegiste sigue acá: cuando estés listo, probá pagar de nuevo.`,
      en: `${net} What you chose is still here—when you’re ready, try paying again.`,
      pt: `${net} O que voce escolheu continua aqui: quando quiser, tente pagar de novo.`
    });
  }
  if (n === "Individual session product is not configured") {
    return t(language, {
      es: "En este entorno no hay cargado el producto de sesión suelta en el catálogo. Pedile a soporte que ejecute el seed o cree un paquete de 1 crédito global (professionalId vacío).",
      en: "This environment doesn’t have a single-session product configured. Ask support to run the seed or create a global 1-credit package (no professional).",
      pt: "Neste ambiente nao ha produto de sessao avulsa configurado. Pec ao suporte para rodar o seed ou criar pacote de 1 credito global."
    });
  }
  if (n === "Unauthorized" || n === "Missing bearer token" || n === "Invalid or expired token") {
    return t(language, {
      es: "Tu sesión no es válida para cobrar. Volvé a iniciar sesión e intentá de nuevo.",
      en: "Your session isn’t valid for checkout. Sign in again and retry.",
      pt: "Sua sessao nao e valida para pagar. Entre novamente e tente de novo."
    });
  }
  if (n.startsWith("Invalid payload")) {
    return t(language, {
      es: "Los datos del pedido llegaron incompletos. Cerrá el modal, elegí de nuevo la cantidad y probá otra vez.",
      en: "The order data didn’t come through complete. Close the modal, pick the quantity again, and retry.",
      pt: "Os dados do pedido vieram incompletos. Feche o modal, escolha de novo e tente outra vez."
    });
  }
  if (looksLikeUserFacingCopy(n)) {
    return n;
  }
  return t(language, {
    es: "El pago no se completó. Revisá tu método de pago o la conexión, y probá de nuevo; si preferís, elegí otro paquete o volvé más tarde.",
    en: "The payment didn’t go through. Check your payment method or connection and try again; you can also pick another plan or come back later.",
    pt: "O pagamento nao foi concluido. Confira o metodo ou a conexao e tente de novo; ou escolha outro plano ou volte mais tarde."
  });
}

/* ─── Google Calendar (onboarding / perfil) ─── */

export function friendlyCalendarOnboardingMessage(
  language: AppLanguage,
  options: { raw: string; notConfigured: boolean }
): string {
  if (options.notConfigured) {
    return t(language, {
      es: "Todavía no podemos vincular Google Calendar desde esta versión del servicio. Podés seguir con tranquilidad; más adelante lo vas a poder activar desde Perfil cuando esté listo.",
      en: "We can’t link Google Calendar from this version of the service yet. You’re welcome to keep going—you’ll be able to turn it on from Profile when it’s ready.",
      pt: "Ainda nao conseguimos vincular o Google Calendar nesta versao do servico. Pode continuar com calma; depois voce ativa em Perfil quando estiver disponivel."
    });
  }
  const n = options.raw.trim();
  const net = softNetworkOrServer(language, n);
  if (net) {
    return net;
  }
  if (looksLikeUserFacingCopy(n)) {
    return n;
  }
  return t(language, {
    es: "No pudimos abrir la pantalla de Google Calendar. Tu cuenta sigue bien: probá de nuevo en un rato o entralo desde Perfil cuando quieras.",
    en: "We couldn’t open the Google Calendar screen. Your account is fine—try again soon or connect it from Profile when you like.",
    pt: "Nao foi possivel abrir o Google Calendar. Sua conta esta ok — tente em breve ou conecte em Perfil quando quiser."
  });
}
