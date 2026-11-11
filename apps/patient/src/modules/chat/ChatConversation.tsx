import type { RefObject, SyntheticEvent } from "react";
import type { AppLanguage } from "@therapy/i18n-config";
import { ChatComposer } from "./components/ChatComposer";
import { ChatMessageList } from "./components/ChatMessageList";
import { ChatProfessionalSwitch } from "./components/ChatProfessionalSwitch";
import { ChatThreadHeader } from "./components/ChatThreadHeader";
import type { ChatSharedEntry, ChatTimelineItem } from "./chatTimeline";

export function ChatConversation(props: {
  language: AppLanguage;
  mobile?: boolean;
  professionalName: string | null;
  givenName: string;
  photoSrc: string | null;
  canReserve?: boolean;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  professionals: Array<{ id: string; name: string; unread: number }>;
  activeProfessionalId: string | null;
  onSelectProfessional: (professionalId: string) => void;
  items: ChatTimelineItem[];
  emptyLabel: string | null;
  sessionNotice: { title: string; meta: string } | null;
  onOpenSession: () => void;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  canSend: boolean;
  shareEntries: ChatSharedEntry[];
  sharedEntryIds: string[];
  onShareEntry: (entry: ChatSharedEntry) => void;
  threadRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <section className="chat-ds-conv">
      <ChatThreadHeader
        language={props.language}
        mobile={props.mobile}
        name={props.professionalName}
        photoSrc={props.photoSrc}
        onImageFallback={props.onImageFallback}
      />
      <ChatProfessionalSwitch
        professionals={props.professionals}
        activeId={props.activeProfessionalId}
        onSelect={props.onSelectProfessional}
      />
      <ChatMessageList
        language={props.language}
        items={props.items}
        emptyLabel={props.emptyLabel}
        sessionNotice={props.sessionNotice}
        onOpenSession={props.onOpenSession}
        threadRef={props.threadRef}
      />
      <ChatComposer
        language={props.language}
        givenName={props.givenName}
        enabled={Boolean(props.professionalName)}
        draft={props.draft}
        canSend={props.canSend}
        shareEntries={props.shareEntries}
        sharedEntryIds={props.sharedEntryIds}
        onDraftChange={props.onDraftChange}
        onSend={props.onSend}
        onShareEntry={props.onShareEntry}
      />
    </section>
  );
}
