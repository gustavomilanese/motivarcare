import { type RefObject, useEffect, useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { EmotionalDiaryEntry } from "@therapy/types";
import { fetchDiaryEntries } from "../../emotional-diary/services/emotionalDiaryApi";
import {
  calmGivenName,
  formatClock,
  formatWeekday,
  isSameZonedDay,
  sessionLengthMinutes
} from "../../home/calm/calmHomeFormat";
import { canPatientSelfChangeProfessional } from "../../app/lib/canPatientSelfChangeProfessional";
import { countAvailablePatientSessions } from "../../app/lib/countAvailablePatientSessions";
import { professionalAccessibleName } from "../../app/lib/professionalDisplayName";
import { professionalPhotoSrc } from "../../app/services/api";
import type { ApiChatMessage, ApiChatThread, Booking, Message, PatientAppState, Professional } from "../../app/types";
import { buildChatTimeline, parseDiaryEntryShare, type ChatSharedEntry } from "../chatTimeline";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function useSharedDiaryEntries(authToken: string | null) {
  const [entries, setEntries] = useState<EmotionalDiaryEntry[]>([]);
  useEffect(() => {
    if (!authToken) {
      setEntries([]);
      return;
    }
    let active = true;
    void fetchDiaryEntries(authToken, "published")
      .then((rows) => {
        if (active) setEntries(rows.filter((entry) => entry.shareWithPsychologist && !entry.isPrivate));
      })
      .catch(() => {
        if (active) setEntries([]);
      });
    return () => {
      active = false;
    };
  }, [authToken]);
  return entries;
}

export function useChatViewModel(params: {
  state: PatientAppState;
  language: AppLanguage;
  sessionUserId: string;
  professionalPhotoMap: Record<string, string>;
  remoteMode: boolean;
  threadProfessional: Professional | null;
  threadMessages: Message[];
  apiMessages: ApiChatMessage[];
  apiThreadByProfessional: Map<string, ApiChatThread>;
  sharedEntries: EmotionalDiaryEntry[];
  pendingUnreadFocus: boolean;
  activeProfessionalId: string | null;
  threadRef: RefObject<HTMLDivElement | null>;
}) {
  const timeZone = params.state.profile.timezone || "UTC";
  const professional = params.threadProfessional;
  const givenName = professional ? calmGivenName(professional) : "";
  const professionalName = professional ? professionalAccessibleName(professional) : null;
  const photoSrc = professional
    ? professionalPhotoSrc(
        (params.remoteMode ? params.apiThreadByProfessional.get(professional.id)?.counterpartPhotoUrl?.trim() : undefined) ||
          params.professionalPhotoMap[professional.id] ||
          null
      )
    : "";

  const rawMessages = params.remoteMode
    ? params.apiMessages.map((message) => ({
        id: message.id,
        body: message.body,
        createdAt: message.createdAt,
        outgoing: message.senderUserId === params.sessionUserId,
        read: Boolean(message.readAt)
      }))
    : params.threadMessages.map((message) => ({
        id: message.id,
        body: message.text,
        createdAt: message.createdAt,
        outgoing: message.sender === "patient",
        read: message.read
      }));

  const sharedForTimeline: ChatSharedEntry[] = params.sharedEntries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    mood: entry.mood,
    createdAt: entry.createdAt,
    publishedAt: entry.publishedAt
  }));

  const timeline = useMemo(
    () =>
      professional
        ? buildChatTimeline({
            messages: rawMessages,
            sharedEntries: sharedForTimeline,
            timeZone,
            language: params.language
          })
        : [],
    [professional, rawMessages, sharedForTimeline, timeZone, params.language]
  );

  const sentEntryIds = rawMessages.flatMap((message) => {
    const parsed = message.outgoing ? parseDiaryEntryShare(message.body) : null;
    return parsed ? [parsed.entryId] : [];
  });

  const upcomingBooking = useMemo(() => nextBooking(params.state.bookings, professional?.id ?? null), [
    params.state.bookings,
    professional?.id
  ]);

  const sessionNotice = upcomingBooking ? sessionCopy(upcomingBooking, timeZone, params.language) : null;
  const availableSessions = countAvailablePatientSessions({
    creditsRemaining: params.state.subscription.creditsRemaining,
    trialRebookAvailable: params.state.trialRebookAvailable
  });
  const creditsLabel =
    sessionNotice && availableSessions > 0 && givenName
      ? sessionsWithName(availableSessions, givenName, params.language)
      : null;

  const timelineKey = timeline.map((item) => item.id).join("|");
  useEffect(() => {
    if (params.pendingUnreadFocus) return;
    const node = params.threadRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [timelineKey, params.pendingUnreadFocus, params.activeProfessionalId, params.threadRef]);

  const specialty = professional?.specialties?.find(Boolean);
  const profileMeta = professional ? [professional.title, specialty || professional.approach].filter(Boolean).join(" · ") : "";
  const ratingLabel =
    professional && professional.rating > 0
      ? `★ ${new Intl.NumberFormat(params.language === "en" ? "en-US" : params.language === "pt" ? "pt-BR" : "es-AR", {
          maximumFractionDigits: 1
        }).format(professional.rating)}`
      : null;

  return {
    timeZone,
    givenName,
    professionalName,
    photoSrc,
    timeline,
    sentEntryIds,
    sharedForTimeline,
    upcomingBooking,
    sessionNotice,
    creditsLabel,
    sharedPanel: params.sharedEntries.map((entry) => ({
      id: entry.id,
      title: entry.title.trim() || t(params.language, { es: "Entrada del diario", en: "Diary entry", pt: "Entrada do diário" })
    })),
    emptyLabel: emptyCopy(Boolean(professional), timeline.length, params.language),
    profileMeta,
    ratingLabel,
    canSelfChange: canPatientSelfChangeProfessional({
      creditsRemaining: params.state.subscription.creditsRemaining,
      trialRebookAvailable: params.state.trialRebookAvailable,
      bookings: params.state.bookings,
      assignedProfessionalId: params.state.assignedProfessionalId
    })
  };
}

function nextBooking(bookings: Booking[], professionalId: string | null) {
  if (!professionalId) return null;
  const now = Date.now();
  return (
    bookings
      .filter(
        (booking) =>
          booking.professionalId === professionalId &&
          booking.status === "confirmed" &&
          new Date(booking.endsAt).getTime() > now
      )
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ?? null
  );
}

function sessionCopy(booking: Booking, timeZone: string, language: AppLanguage) {
  const now = new Date();
  const clock = formatClock(booking.startsAt, timeZone, language);
  const sameDay = isSameZonedDay(new Date(booking.startsAt), now, timeZone);
  const weekday = formatWeekday(booking.startsAt, timeZone, language);
  const minutes = sessionLengthMinutes(booking.startsAt, booking.endsAt);
  const title = sameDay
    ? t(language, { es: `Sesión de hoy, ${clock}`, en: `Session today, ${clock}`, pt: `Sessão de hoje, ${clock}` })
    : t(language, {
        es: `Sesión del ${weekday.toLowerCase()}, ${clock}`,
        en: `Session on ${weekday}, ${clock}`,
        pt: `Sessão de ${weekday.toLowerCase()}, ${clock}`
      });
  const meta = minutes
    ? t(language, { es: `videollamada de ${minutes} min`, en: `${minutes}-min video call`, pt: `videochamada de ${minutes} min` })
    : t(language, { es: "videollamada", en: "video call", pt: "videochamada" });
  const when = sameDay
    ? t(language, { es: `Hoy, ${clock}`, en: `Today, ${clock}`, pt: `Hoje, ${clock}` })
    : `${weekday}, ${clock}`;
  return { title, meta, when };
}

function sessionsWithName(count: number, name: string, language: AppLanguage): string {
  if (count === 1) {
    return t(language, {
      es: `1 sesión disponible con ${name}`,
      en: `1 session available with ${name}`,
      pt: `1 sessão disponível com ${name}`
    });
  }
  return t(language, {
    es: `${count} sesiones disponibles con ${name}`,
    en: `${count} sessions available with ${name}`,
    pt: `${count} sessões disponíveis com ${name}`
  });
}

function emptyCopy(hasProfessional: boolean, itemCount: number, language: AppLanguage): string | null {
  if (!hasProfessional) {
    return t(language, {
      es: "Cuando tengas un profesional asignado, podés escribirle desde acá.",
      en: "Once a professional is assigned, you can write from here.",
      pt: "Quando houver um profissional, você pode escrever por aqui."
    });
  }
  if (itemCount === 0) {
    return t(language, {
      es: "Todavía no hay mensajes en esta conversación.",
      en: "There are no messages in this conversation yet.",
      pt: "Ainda não há mensagens nesta conversa."
    });
  }
  return null;
}
