import {
  type AppLanguage,
  type LocalizedText,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import { DIARY_SESSION_REPORT_CHAT_PREFIX } from "@therapy/types";
import type { ThreadSummary } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function formatNotificationMeta(isoDate: string, language: AppLanguage): string {
  return new Intl.DateTimeFormat(language === "es" ? "es-AR" : language === "pt" ? "pt-BR" : "en-US", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(isoDate));
}

export type PatientMessageNotificationItem = {
  id: string;
  patientId: string;
  title: string;
  body: string;
  detail: string;
  meta: string;
  unread: boolean;
  /** Destino al tocar la notificación. */
  href?: string;
};

function parseNotificationContent(
  language: AppLanguage,
  rawBody: string,
  patientName: string
): { title: string; body: string; detail: string; isDiaryReport?: boolean } {
  const text = rawBody.replace(/\s+/g, " ").trim();

  if (text.startsWith(DIARY_SESSION_REPORT_CHAT_PREFIX)) {
    const rest = text.slice(DIARY_SESSION_REPORT_CHAT_PREFIX.length).trim();
    return {
      title: t(language, {
        es: "Informe del diario emocional",
        en: "Emotional diary report",
        pt: "Relatório do diário emocional"
      }),
      body: replaceTemplate(
        t(language, {
          es: "{name} te envió el informe de su diario.",
          en: "{name} sent you their diary report.",
          pt: "{name} enviou o relatório do diário."
        }),
        { name: patientName || t(language, { es: "Tu paciente", en: "Your patient", pt: "Seu paciente" }) }
      ),
      detail: rest,
      isDiaryReport: true
    };
  }

  const reasonMatch = text.match(/(?:Motivo|Reason)[:：]\s*(.+)$/i);
  const reason = reasonMatch?.[1]?.trim() ?? "";
  const coreText = reasonMatch ? text.slice(0, reasonMatch.index).trim().replace(/[.\s]+$/, "") : text;

  const cancelMatch = coreText.match(/^(.+?)\s+cancel[oó]\s+su sesi[oó]n(?:\s+del?\s+(.+))?$/i);
  if (cancelMatch) {
    const matchedName =
      cancelMatch[1]?.trim() ?? t(language, { es: "Tu paciente", en: "Your patient", pt: "Seu paciente" });
    const when = cancelMatch[2]?.trim() ?? "";
    return {
      title: t(language, {
        es: "Sesión cancelada por paciente",
        en: "Session cancelled by patient",
        pt: "Sessão cancelada pelo paciente"
      }),
      body: when
        ? replaceTemplate(
            t(language, {
              es: "{name} canceló la sesión del {when}.",
              en: "{name} cancelled the session scheduled for {when}.",
              pt: "{name} cancelou a sessão de {when}."
            }),
            { name: matchedName, when }
          )
        : replaceTemplate(
            t(language, {
              es: "{name} canceló una sesión.",
              en: "{name} cancelled a session.",
              pt: "{name} cancelou uma sessão."
            }),
            { name: matchedName }
          ),
      detail: reason
        ? replaceTemplate(
            t(language, {
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
    title: t(language, { es: "Mensaje de paciente", en: "Patient message", pt: "Mensagem de paciente" }),
    body: coreText || text,
    detail: reason
      ? replaceTemplate(
          t(language, {
            es: "Motivo: {reason}",
            en: "Reason: {reason}",
            pt: "Motivo: {reason}"
          }),
          { reason }
        )
      : ""
  };
}

export function buildPatientMessageNotificationItems(
  language: AppLanguage,
  remoteThreads: ThreadSummary[]
): PatientMessageNotificationItem[] {
  return remoteThreads
    .filter((thread) => thread.lastMessage && thread.lastMessage.senderUserId === thread.counterpartUserId)
    .sort(
      (a, b) =>
        new Date(b.lastMessage?.createdAt ?? 0).getTime() - new Date(a.lastMessage?.createdAt ?? 0).getTime()
    )
    .map((thread) => {
      const parsed = parseNotificationContent(
        language,
        thread.lastMessage?.body ?? "",
        thread.counterpartName ?? ""
      );
      return {
        id: thread.lastMessage?.id ?? thread.id,
        patientId: thread.patientId,
        title: parsed.title,
        body: parsed.body,
        detail: parsed.detail,
        meta: thread.lastMessage?.createdAt ? formatNotificationMeta(thread.lastMessage.createdAt, language) : "",
        unread: (thread.unreadCount ?? 0) > 0,
        href: parsed.isDiaryReport
          ? `/pacientes/${encodeURIComponent(thread.patientId)}?diaryReport=1`
          : `/chat?patientId=${encodeURIComponent(thread.patientId)}`
      };
    });
}
