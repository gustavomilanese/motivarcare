import {
  type AppLanguage,
  type LocalizedText,
  replaceTemplate,
  textByLanguage
} from "@therapy/i18n-config";
import type { ThreadSummary } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function formatNotificationMeta(isoDate: string, language: AppLanguage): string {
  return new Intl.DateTimeFormat(language === "es" ? "es-AR" : language === "pt" ? "pt-BR" : "en-US", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
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
};

function parseNotificationContent(
  language: AppLanguage,
  rawBody: string
): { title: string; body: string; detail: string } {
  const text = rawBody.replace(/\s+/g, " ").trim();
  const reasonMatch = text.match(/(?:Motivo|Reason)[:：]\s*(.+)$/i);
  const reason = reasonMatch?.[1]?.trim() ?? "";
  const coreText = reasonMatch ? text.slice(0, reasonMatch.index).trim().replace(/[.\s]+$/, "") : text;

  const cancelMatch = coreText.match(/^(.+?)\s+cancel[oó]\s+su sesi[oó]n(?:\s+del?\s+(.+))?$/i);
  if (cancelMatch) {
    const patientName =
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
            { name: patientName, when }
          )
        : replaceTemplate(
            t(language, {
              es: "{name} canceló una sesión.",
              en: "{name} cancelled a session.",
              pt: "{name} cancelou uma sessão."
            }),
            { name: patientName }
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
      const parsed = parseNotificationContent(language, thread.lastMessage?.body ?? "");
      return {
        id: thread.lastMessage?.id ?? thread.id,
        patientId: thread.patientId,
        title: parsed.title,
        body: parsed.body,
        detail: parsed.detail,
        meta: thread.lastMessage?.createdAt ? formatNotificationMeta(thread.lastMessage.createdAt, language) : "",
        unread: (thread.unreadCount ?? 0) > 0
      };
    });
}
