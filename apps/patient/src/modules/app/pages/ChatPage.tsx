import { type SyntheticEvent, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { formatShortDate } from "../../home/calm/calmHomeFormat";
import { SessionDetailModal } from "../../booking/components/SessionDetailModal";
import { moodMeta } from "../../emotional-diary/lib/moods";
import { CalmPortalToolbarRow } from "../components/CalmPortalToolbarRow";
import { professionalAccessibleName } from "../lib/professionalDisplayName";
import { ChatContextPanel } from "../../chat/ChatContextPanel";
import { ChatConversation } from "../../chat/ChatConversation";
import { diaryEntryShareBody } from "../../chat/chatTimeline";
import { useChatViewModel, useSharedDiaryEntries } from "../../chat/hooks/useChatViewModel";
import { usePatientChat } from "../../chat/hooks/usePatientChat";
import type { PatientAppState, Professional } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ChatPage(props: {
  state: PatientAppState;
  professionals: Professional[];
  professionalPhotoMap: Record<string, string>;
  language: AppLanguage;
  authToken: string | null;
  sessionUserId: string;
  onSetActiveProfessional: (professionalId: string) => void;
  onSendMessage: (professionalId: string, text: string) => void;
  onMarkRead: (professionalId: string) => void;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  /** Modal desde Inicio: sin toolbar del portal y conversación enfocada. */
  embedded?: boolean;
}) {
  const navigate = useNavigate();
  const threadRef = useRef<HTMLDivElement>(null);
  const [sessionDetailOpen, setSessionDetailOpen] = useState(false);
  const chat = usePatientChat(props);
  const sharedEntries = useSharedDiaryEntries(props.authToken);
  const view = useChatViewModel({
    state: props.state,
    language: props.language,
    sessionUserId: props.sessionUserId,
    professionalPhotoMap: props.professionalPhotoMap,
    remoteMode: chat.remoteMode,
    threadProfessional: chat.threadProfessional,
    threadMessages: chat.threadMessages,
    apiMessages: chat.apiMessages,
    apiThreadByProfessional: chat.apiThreadByProfessional,
    sharedEntries,
    pendingUnreadFocus: chat.pendingUnreadFocus,
    activeProfessionalId: chat.activeProfessionalId,
    threadRef
  });

  const shareEntry = (entry: (typeof view.sharedForTimeline)[number]) => {
    const mood = moodMeta(entry.mood);
    const at = entry.publishedAt || entry.createdAt;
    void chat.sendBody(
      diaryEntryShareBody({
        id: entry.id,
        dateLabel: formatShortDate(at, view.timeZone, props.language),
        moodLabel: t(props.language, { es: mood.labelEs, en: mood.labelEn, pt: mood.labelPt }),
        title: entry.title.trim() || t(props.language, { es: "Entrada del diario", en: "Diary entry", pt: "Entrada do diário" })
      }),
      false
    );
  };

  return (
    <div className={`chat-page-root${props.embedded ? " chat-page-root--embedded" : ""}`}>
      {props.embedded ? null : <CalmPortalToolbarRow mountId="chat-hero-toolbar-mount" mountClassName="chat-hero-toolbar-mount calm-toolbar" />}
      <div className="chat-page-body">
        <div className={`chat-ds${props.embedded ? " chat-ds--embedded" : ""}`}>
          <ChatConversation
            language={props.language}
            mobile={chat.mobileLayout}
            professionalName={view.professionalName}
            givenName={view.givenName}
            photoSrc={view.photoSrc || null}
            canReserve={view.availableSessions > 0}
            onImageFallback={props.onImageFallback}
            professionals={
              props.embedded
                ? []
                : chat.availableProfessionals.map((professional) => ({
                    id: professional.id,
                    name: professionalAccessibleName(professional),
                    unread: chat.remoteMode
                      ? chat.apiThreadByProfessional.get(professional.id)?.unreadCount ?? 0
                      : chat.unreadCount(props.state.messages, professional.id)
                  }))
            }
            activeProfessionalId={chat.activeProfessionalId}
            onSelectProfessional={(professionalId) => {
              void chat.selectProfessional(professionalId);
            }}
            items={view.timeline}
            emptyLabel={view.emptyLabel}
            sessionNotice={view.sessionNotice}
            onOpenSession={() => setSessionDetailOpen(true)}
            draft={chat.draft}
            onDraftChange={chat.setDraft}
            onSend={() => {
              void chat.sendBody(chat.draft, true);
            }}
            canSend={Boolean(chat.draft.trim() && chat.threadProfessional)}
            shareEntries={view.sharedForTimeline}
            sharedEntryIds={view.sentEntryIds}
            onShareEntry={shareEntry}
            threadRef={threadRef}
          />
          {!props.embedded && chat.threadProfessional ? (
            <ChatContextPanel
              language={props.language}
              name={view.professionalName ?? ""}
              meta={view.profileMeta}
              photoSrc={view.photoSrc}
              ratingLabel={view.ratingLabel}
              onOpenProfile={() => navigate("/mi-profesional")}
              onImageFallback={props.onImageFallback}
              session={
                view.sessionNotice
                  ? { when: view.sessionNotice.when, meta: view.sessionNotice.meta, credits: view.creditsLabel }
                  : null
              }
            />
          ) : null}
        </div>
        {chat.apiError ? <p className="error-text">{chat.apiError}</p> : null}
      </div>

      {sessionDetailOpen && view.upcomingBooking && chat.threadProfessional ? (
        <SessionDetailModal
          booking={view.upcomingBooking}
          timezone={view.timeZone}
          language={props.language}
          patientName={props.state.session?.fullName}
          professional={{
            fullName: chat.threadProfessional.fullName,
            firstName: chat.threadProfessional.firstName,
            lastName: chat.threadProfessional.lastName,
            title: chat.threadProfessional.title,
            approach: chat.threadProfessional.approach,
            photoUrl: view.photoSrc,
            rating: chat.threadProfessional.rating,
            reviewsCount: chat.threadProfessional.reviewsCount
          }}
          noticeHours={chat.threadProfessional.cancellationHours}
          onImageFallback={props.onImageFallback}
          onClose={() => setSessionDetailOpen(false)}
        />
      ) : null}

    </div>
  );
}
