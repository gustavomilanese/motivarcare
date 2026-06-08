import { replaceTemplate, textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import type { NotificationStore } from "./storage.js";
import type {
  BuildPortalNotificationsParams,
  PatientNotificationBooking,
  PatientNotificationChatThread,
  PatientNotificationExercise,
  PatientNotificationMessage,
  PatientNotificationStateSlice,
  PortalNotificationItem,
  PortalNotificationKind
} from "./types.js";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function formatNotificationMeta(params: { isoDate: string; language: AppLanguage }): string {
  return new Intl.DateTimeFormat(params.language === "es" ? "es-AR" : params.language === "pt" ? "pt-BR" : "en-US", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(params.isoDate));
}

export function formatSessionWhen(params: { isoDate: string; language: AppLanguage; timeZone?: string }): string {
  return new Intl.DateTimeFormat(params.language === "es" ? "es-AR" : params.language === "pt" ? "pt-BR" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: params.timeZone
  }).format(new Date(params.isoDate));
}

export function kindLabel(language: AppLanguage, kind: PortalNotificationKind): string {
  const labels: Record<PortalNotificationKind, LocalizedText> = {
    chat: { es: "Chat", en: "Chat", pt: "Chat" },
    "session-soon": { es: "Sesión pronto", en: "Session soon", pt: "Sessão em breve" },
    "session-upcoming": { es: "Próxima sesión", en: "Upcoming session", pt: "Próxima sessão" },
    "session-cancelled": { es: "Sesión cancelada", en: "Session cancelled", pt: "Sessão cancelada" },
    "credits-low": { es: "Créditos", en: "Credits", pt: "Créditos" },
    "credits-empty": { es: "Créditos", en: "Credits", pt: "Créditos" },
    "payment-failed": { es: "Pago", en: "Payment", pt: "Pagamento" },
    "professional-assigned": { es: "Profesional", en: "Therapist", pt: "Profissional" },
    "exercise-new": { es: "Ejercicio", en: "Exercise", pt: "Exercício" },
    "diary-checkin": { es: "Diario", en: "Diary", pt: "Diário" },
    "email-verify": { es: "Cuenta", en: "Account", pt: "Conta" },
    "calendar-connect": { es: "Calendario", en: "Calendar", pt: "Calendário" }
  };
  return t(language, labels[kind]);
}

function parseChatNotificationContent(params: { rawBody: string; language: AppLanguage }): {
  title: string;
  body: string;
  detail: string;
  kind: "chat" | "session-cancelled";
} {
  const text = params.rawBody.replace(/\s+/g, " ").trim();
  const reasonMatch = text.match(/(?:Motivo|Reason)[:：]\s*(.+)$/i);
  const reason = reasonMatch?.[1]?.trim() ?? "";
  const coreText = reasonMatch ? text.slice(0, reasonMatch.index).trim().replace(/[.\s]+$/, "") : text;
  const cancelledMatch = coreText.match(/^Tu profesional\s+(.+?)\s+cancel[oó]\s+tu sesi[oó]n(?:\s+de\s+(.+))?$/i);

  if (cancelledMatch) {
    const professionalName = cancelledMatch[1]?.trim() ?? "";
    const when = cancelledMatch[2]?.trim() ?? "";
    const title = t(params.language, {
      es: "Sesión cancelada",
      en: "Session cancelled",
      pt: "Sessão cancelada"
    });
    const body = when
      ? replaceTemplate(
          t(params.language, {
            es: "{professional} canceló tu sesión del {when}.",
            en: "{professional} cancelled your session scheduled for {when}.",
            pt: "{professional} cancelou sua sessão de {when}."
          }),
          { professional: professionalName, when }
        )
      : replaceTemplate(
          t(params.language, {
            es: "{professional} canceló tu sesión.",
            en: "{professional} cancelled your session.",
            pt: "{professional} cancelou sua sessão."
          }),
          { professional: professionalName }
        );
    return {
      kind: "session-cancelled",
      title,
      body,
      detail: reason
        ? replaceTemplate(
            t(params.language, {
              es: "Motivo: {reason}",
              en: "Reason: {reason}",
              pt: "Motivo: {reason}"
            }),
            { reason }
          )
        : ""
    };
  }

  const rescheduledMatch = coreText.match(/^Tu profesional\s+(.+?)\s+reprogram[oó]\s+tu sesi[oó]n(?:\s+de\s+(.+?)\s+a\s+(.+))?$/i);
  if (rescheduledMatch) {
    const professionalName = rescheduledMatch[1]?.trim() ?? "";
    const previousWhen = rescheduledMatch[2]?.trim() ?? "";
    const nextWhen = rescheduledMatch[3]?.trim() ?? "";
    const title = t(params.language, {
      es: "Sesión reprogramada",
      en: "Session rescheduled",
      pt: "Sessão reagendada"
    });
    const body = previousWhen && nextWhen
      ? replaceTemplate(
          t(params.language, {
            es: "{professional} reprogramó tu sesión de {from} a {to}.",
            en: "{professional} moved your session from {from} to {to}.",
            pt: "{professional} reagendou sua sessão de {from} para {to}."
          }),
          { professional: professionalName, from: previousWhen, to: nextWhen }
        )
      : replaceTemplate(
          t(params.language, {
            es: "{professional} reprogramó tu sesión.",
            en: "{professional} rescheduled your session.",
            pt: "{professional} reagendou sua sessão."
          }),
          { professional: professionalName }
        );
    return {
      kind: "chat",
      title,
      body,
      detail: reason
        ? replaceTemplate(
            t(params.language, {
              es: "Motivo: {reason}",
              en: "Reason: {reason}",
              pt: "Motivo: {reason}"
            }),
            { reason }
          )
        : ""
    };
  }

  return {
    kind: "chat",
    title: t(params.language, {
      es: "Mensaje del profesional",
      en: "Message from your professional",
      pt: "Mensagem do profissional"
    }),
    body: coreText || text,
    detail: reason
      ? replaceTemplate(
          t(params.language, {
            es: "Motivo: {reason}",
            en: "Reason: {reason}",
            pt: "Motivo: {reason}"
          }),
          { reason }
        )
      : ""
  };
}

function buildChatNotifications(params: {
  language: AppLanguage;
  messages: PatientNotificationMessage[];
  remoteThreads: PatientNotificationChatThread[];
  authToken: string | null;
  store: NotificationStore;
}): PortalNotificationItem[] {
  if (params.authToken) {
    return params.remoteThreads
      .filter((thread) => thread.lastMessage && thread.lastMessage.senderUserId === thread.counterpartUserId)
      .map((thread) => {
        const parsed = parseChatNotificationContent({
          rawBody: thread.lastMessage?.body ?? "",
          language: params.language
        });
        const sortAt = thread.lastMessage?.createdAt ?? new Date().toISOString();
        const id = `chat-${thread.lastMessage?.id ?? thread.id}`;
        return {
          id,
          kind: parsed.kind,
          title: parsed.title,
          body: parsed.body,
          detail: parsed.detail,
          meta: thread.lastMessage?.createdAt
            ? formatNotificationMeta({ isoDate: thread.lastMessage.createdAt, language: params.language })
            : "",
          unread: (thread.unreadCount ?? 0) > 0,
          sortAt,
          action: { type: "chat", professionalId: thread.professionalId }
        } satisfies PortalNotificationItem;
      })
      .filter((item) => !params.store.isDismissed(item.id));
  }

  const byProfessional = new Map<string, PatientNotificationMessage>();
  params.messages
    .filter((message) => message.sender === "professional")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .forEach((message) => {
      if (!byProfessional.has(message.professionalId)) {
        byProfessional.set(message.professionalId, message);
      }
    });

  return Array.from(byProfessional.entries()).map(([professionalId, message]) => {
    const parsed = parseChatNotificationContent({ rawBody: message.text, language: params.language });
    return {
      id: `chat-${message.id}`,
      kind: parsed.kind,
      title: parsed.title,
      body: parsed.body,
      detail: parsed.detail,
      meta: formatNotificationMeta({ isoDate: message.createdAt, language: params.language }),
      unread: !message.read,
      sortAt: message.createdAt,
      action: { type: "chat", professionalId }
    } satisfies PortalNotificationItem;
  }).filter((item) => !params.store.isDismissed(item.id));
}

function buildSessionNotifications(params: {
  language: AppLanguage;
  bookings: PatientNotificationBooking[];
  timeZone: string;
  remindersEnabled: boolean;
  professionalNameById: Map<string, string>;
  store: NotificationStore;
}): PortalNotificationItem[] {
  if (!params.remindersEnabled) {
    return [];
  }

  const now = Date.now();
  const oneHourMs = 60 * 60 * 1000;
  const dayMs = 24 * oneHourMs;
  const items: PortalNotificationItem[] = [];

  params.bookings
    .filter((booking) => booking.status === "confirmed")
    .forEach((booking) => {
      const startsAtMs = new Date(booking.startsAt).getTime();
      const delta = startsAtMs - now;
      if (delta <= 0 || delta > dayMs) {
        return;
      }

      const professionalName = params.professionalNameById.get(booking.professionalId) ?? "";
      const whenLabel = formatSessionWhen({
        isoDate: booking.startsAt,
        language: params.language,
        timeZone: params.timeZone
      });

      if (delta <= oneHourMs) {
        const id = `session-soon-${booking.id}`;
        if (params.store.isDismissed(id)) {
          return;
        }
        items.push({
          id,
          kind: "session-soon",
          title: t(params.language, { es: "Tu sesión empieza pronto", en: "Your session starts soon", pt: "Sua sessão começa em breve" }),
          body: replaceTemplate(
            t(params.language, {
              es: "Tenés sesión con {professional} a las {when}.",
              en: "You have a session with {professional} at {when}.",
              pt: "Você tem sessão com {professional} às {when}."
            }),
            { professional: professionalName, when: whenLabel }
          ),
          detail: "",
          meta: whenLabel,
          unread: true,
          sortAt: booking.startsAt,
          action: { type: "booking", bookingId: booking.id }
        });
        return;
      }

      const id = `session-upcoming-${booking.id}`;
      if (params.store.isDismissed(id)) {
        return;
      }
      items.push({
        id,
        kind: "session-upcoming",
        title: t(params.language, { es: "Sesión mañana o en las próximas horas", en: "Session in the next 24 hours", pt: "Sessão nas próximas 24 horas" }),
        body: replaceTemplate(
          t(params.language, {
            es: "Recordá tu sesión con {professional} el {when}.",
            en: "Remember your session with {professional} on {when}.",
            pt: "Lembre sua sessão com {professional} em {when}."
          }),
          { professional: professionalName, when: whenLabel }
        ),
        detail: "",
        meta: whenLabel,
        unread: true,
        sortAt: booking.startsAt,
        action: { type: "booking", bookingId: booking.id }
      });
    });

  params.bookings
    .filter((booking) => booking.status === "cancelled")
    .forEach((booking) => {
      const startsAtMs = new Date(booking.startsAt).getTime();
      const recentWindow = 7 * dayMs;
      if (startsAtMs < now - recentWindow) {
        return;
      }
      const id = `session-cancelled-${booking.id}`;
      if (params.store.isDismissed(id)) {
        return;
      }
      const professionalName = params.professionalNameById.get(booking.professionalId) ?? "";
      const whenLabel = formatSessionWhen({
        isoDate: booking.startsAt,
        language: params.language,
        timeZone: params.timeZone
      });
      items.push({
        id,
        kind: "session-cancelled",
        title: t(params.language, { es: "Sesión cancelada", en: "Session cancelled", pt: "Sessão cancelada" }),
        body: replaceTemplate(
          t(params.language, {
            es: "Se canceló tu sesión con {professional} del {when}.",
            en: "Your session with {professional} on {when} was cancelled.",
            pt: "Sua sessão com {professional} em {when} foi cancelada."
          }),
          { professional: professionalName, when: whenLabel }
        ),
        detail: "",
        meta: whenLabel,
        unread: true,
        sortAt: booking.startsAt,
        action: { type: "navigate", path: "/sessions" }
      });
    });

  return items;
}

function buildCreditNotifications(params: {
  language: AppLanguage;
  creditsRemaining: number;
  hasAssignedProfessional: boolean;
  store: NotificationStore;
}): PortalNotificationItem[] {
  if (!params.hasAssignedProfessional) {
    return [];
  }

  const items: PortalNotificationItem[] = [];
  const nowIso = new Date().toISOString();

  if (params.creditsRemaining <= 0) {
    const id = "credits-empty";
    if (!params.store.isDismissed(id)) {
      items.push({
        id,
        kind: "credits-empty",
        title: t(params.language, { es: "Sin créditos disponibles", en: "No credits available", pt: "Sem créditos disponíveis" }),
        body: t(params.language, {
          es: "Comprá un paquete para reservar tu próxima sesión.",
          en: "Purchase a package to book your next session.",
          pt: "Compre um pacote para reservar sua próxima sessão."
        }),
        detail: "",
        meta: "",
        unread: true,
        sortAt: nowIso,
        action: { type: "navigate", path: "/sessions?purchase=individual" }
      });
    }
    return items;
  }

  if (params.creditsRemaining === 1) {
    const id = "credits-low";
    if (!params.store.isDismissed(id)) {
      items.push({
        id,
        kind: "credits-low",
        title: t(params.language, { es: "Te queda 1 sesión", en: "You have 1 session left", pt: "Resta 1 sessão" }),
        body: t(params.language, {
          es: "Reservá tu turno o comprá más sesiones antes de quedarte sin créditos.",
          en: "Book your appointment or buy more sessions before you run out.",
          pt: "Reserve seu horário ou compre mais sessões antes de ficar sem créditos."
        }),
        detail: "",
        meta: "",
        unread: true,
        sortAt: nowIso,
        action: { type: "navigate", path: "/sessions" }
      });
    }
  }

  return items;
}

function buildAccountNotifications(params: {
  language: AppLanguage;
  state: Pick<
    PatientNotificationStateSlice,
    "emailVerificationRequired" | "assignedProfessionalId" | "assignedProfessionalName" | "session"
  >;
  showCalendarReconnectCta: boolean;
  store: NotificationStore;
}): PortalNotificationItem[] {
  const items: PortalNotificationItem[] = [];
  const nowIso = new Date().toISOString();

  if (params.state.emailVerificationRequired && !params.state.session?.emailVerified) {
    const id = "email-verify";
    if (!params.store.isDismissed(id)) {
      items.push({
        id,
        kind: "email-verify",
        title: t(params.language, { es: "Verificá tu email", en: "Verify your email", pt: "Verifique seu email" }),
        body: t(params.language, {
          es: "Confirmá tu correo para activar recordatorios y avisos importantes.",
          en: "Confirm your email to enable reminders and important alerts.",
          pt: "Confirme seu email para ativar lembretes e avisos importantes."
        }),
        detail: "",
        meta: "",
        unread: true,
        sortAt: nowIso,
        action: { type: "profile", tab: "settings" }
      });
    }
  }

  const assignedId = params.state.assignedProfessionalId?.trim() ?? "";
  if (assignedId) {
    const seenId = params.store.readSeenAssignedProfessionalId();
    if (seenId !== assignedId) {
      const id = `professional-assigned-${assignedId}`;
      if (!params.store.isDismissed(id)) {
        items.push({
          id,
          kind: "professional-assigned",
          title: t(params.language, { es: "Profesional asignado", en: "Therapist assigned", pt: "Profissional atribuído" }),
          body: replaceTemplate(
            t(params.language, {
              es: "{name} es tu profesional. Podés escribirle por chat cuando quieras.",
              en: "{name} is your therapist. You can message them anytime.",
              pt: "{name} é seu profissional. Você pode escrever no chat quando quiser."
            }),
            { name: params.state.assignedProfessionalName ?? "" }
          ),
          detail: "",
          meta: "",
          unread: true,
          sortAt: nowIso,
          action: { type: "chat", professionalId: assignedId }
        });
      }
    }
  }

  if (params.showCalendarReconnectCta) {
    const id = "calendar-connect";
    if (!params.store.isDismissed(id)) {
      items.push({
        id,
        kind: "calendar-connect",
        title: t(params.language, { es: "Conectá Google Calendar", en: "Connect Google Calendar", pt: "Conecte o Google Calendar" }),
        body: t(params.language, {
          es: "Sincronizá tus sesiones para recibirlas en tu calendario personal.",
          en: "Sync your sessions to see them in your personal calendar.",
          pt: "Sincronize suas sessões para vê-las no seu calendário pessoal."
        }),
        detail: "",
        meta: "",
        unread: true,
        sortAt: nowIso,
        action: { type: "navigate", path: "/" }
      });
    }
  }

  const paymentNotice = params.store.readPaymentFailureNotice();
  if (paymentNotice && !params.store.isDismissed(paymentNotice.id)) {
    items.push({
      id: paymentNotice.id,
      kind: "payment-failed",
      title: t(params.language, { es: "Pago no completado", en: "Payment not completed", pt: "Pagamento não concluído" }),
      body: paymentNotice.message || t(params.language, {
        es: "No pudimos procesar el pago. Revisá tu tarjeta e intentá de nuevo.",
        en: "We couldn't process the payment. Check your card and try again.",
        pt: "Não foi possível processar o pagamento. Verifique seu cartão e tente novamente."
      }),
      detail: "",
      meta: formatNotificationMeta({ isoDate: paymentNotice.createdAt, language: params.language }),
      unread: true,
      sortAt: paymentNotice.createdAt,
      action: { type: "navigate", path: "/sessions?purchase=individual" }
    });
  }

  return items;
}

export function buildExerciseNotification(params: {
  language: AppLanguage;
  exercises: PatientNotificationExercise[];
  store: NotificationStore;
}): PortalNotificationItem | null {
  const published = params.exercises.filter((item) => item.status === "published");
  if (published.length === 0) {
    return null;
  }

  const newest = published.reduce((best, item) =>
    new Date(item.publishedAt).getTime() > new Date(best.publishedAt).getTime() ? item : best
  );
  const seenAt = params.store.readSeenExercisesPublishedAt();
  if (seenAt && new Date(seenAt).getTime() >= new Date(newest.publishedAt).getTime()) {
    return null;
  }

  const id = `exercise-new-${newest.id}`;
  if (params.store.isDismissed(id)) {
    return null;
  }

  return {
    id,
    kind: "exercise-new",
    title: t(params.language, { es: "Nuevo ejercicio disponible", en: "New exercise available", pt: "Novo exercício disponível" }),
    body: replaceTemplate(
      t(params.language, {
        es: "Explorá «{title}» en la biblioteca de ejercicios.",
        en: "Explore “{title}” in the exercise library.",
        pt: "Explore «{title}» na biblioteca de exercícios."
      }),
      { title: newest.title }
    ),
    detail: newest.summary,
    meta: formatNotificationMeta({ isoDate: newest.publishedAt, language: params.language }),
    unread: true,
    sortAt: newest.publishedAt,
    action: { type: "exercise", slug: newest.slug }
  };
}

export function buildDiaryCheckinNotification(params: {
  language: AppLanguage;
  lastEntryAt: string | null;
  remindersEnabled: boolean;
  store: NotificationStore;
}): PortalNotificationItem | null {
  if (!params.remindersEnabled) {
    return null;
  }

  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const lastMs = params.lastEntryAt ? new Date(params.lastEntryAt).getTime() : 0;
  if (lastMs > 0 && now - lastMs < weekMs) {
    return null;
  }

  const id = "diary-checkin";
  if (params.store.isDismissed(id)) {
    return null;
  }

  return {
    id,
    kind: "diary-checkin",
    title: t(params.language, { es: "Check-in emocional", en: "Emotional check-in", pt: "Check-in emocional" }),
    body: t(params.language, {
      es: "Hace una semana que no registrás cómo te sentís. ¿Querés escribir en tu diario?",
      en: "It's been a week since your last check-in. Would you like to write in your diary?",
      pt: "Faz uma semana desde seu último registro. Quer escrever no seu diário?"
    }),
    detail: "",
    meta: params.lastEntryAt
      ? formatNotificationMeta({ isoDate: params.lastEntryAt, language: params.language })
      : "",
    unread: true,
    sortAt: new Date().toISOString(),
    action: { type: "navigate", path: "/diario/nueva" }
  };
}

export function buildPortalNotifications(
  params: BuildPortalNotificationsParams & { store: NotificationStore }
): PortalNotificationItem[] {
  const remindersEnabled = params.state.profile.notificationsReminder !== false;

  const merged = [
    ...buildChatNotifications({
      language: params.language,
      messages: params.state.messages,
      remoteThreads: params.remoteThreads,
      authToken: params.state.authToken,
      store: params.store
    }),
    ...buildSessionNotifications({
      language: params.language,
      bookings: params.state.bookings,
      timeZone: params.timeZone,
      remindersEnabled,
      professionalNameById: params.professionalNameById,
      store: params.store
    }),
    ...buildCreditNotifications({
      language: params.language,
      creditsRemaining: params.state.subscription.creditsRemaining,
      hasAssignedProfessional: Boolean(params.state.assignedProfessionalId?.trim()),
      store: params.store
    }),
    ...buildAccountNotifications({
      language: params.language,
      state: params.state,
      showCalendarReconnectCta: params.showCalendarReconnectCta,
      store: params.store
    })
  ];

  const exerciseItem = buildExerciseNotification({
    language: params.language,
    exercises: params.exercises,
    store: params.store
  });
  if (exerciseItem) {
    merged.push(exerciseItem);
  }

  const diaryItem = buildDiaryCheckinNotification({
    language: params.language,
    lastEntryAt: params.lastDiaryEntryAt,
    remindersEnabled,
    store: params.store
  });
  if (diaryItem) {
    merged.push(diaryItem);
  }

  const deduped = new Map<string, PortalNotificationItem>();
  merged.forEach((item) => {
    if (!deduped.has(item.id)) {
      deduped.set(item.id, item);
    }
  });

  return Array.from(deduped.values()).sort(
    (a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime()
  );
}

