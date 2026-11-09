import type { SyntheticEvent } from "react";
import type { AppLanguage } from "@therapy/i18n-config";
import { ProfessionalChangeSupportPanel } from "../app/components/ProfessionalChangeSupportPanel";
import { ChatNextSessionCard } from "./components/ChatNextSessionCard";
import { ChatProfileCard } from "./components/ChatProfileCard";
import { ChatSharedList } from "./components/ChatSharedList";

export function ChatContextPanel(props: {
  language: AppLanguage;
  name: string;
  meta: string;
  photoSrc: string;
  ratingLabel: string | null;
  onOpenProfile: () => void;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  session: { when: string; meta: string; credits: string | null } | null;
  shared: Array<{ id: string; title: string }>;
  authToken: string | null;
  patientName: string | null;
  patientEmail: string | null;
}) {
  return (
    <aside className="chat-ds-panel">
      <ChatProfileCard
        language={props.language}
        name={props.name}
        meta={props.meta}
        photoSrc={props.photoSrc}
        ratingLabel={props.ratingLabel}
        onOpenProfile={props.onOpenProfile}
        onImageFallback={props.onImageFallback}
      />
      {props.session ? (
        <ChatNextSessionCard
          language={props.language}
          when={props.session.when}
          meta={props.session.meta}
          credits={props.session.credits}
        />
      ) : null}
      <ChatSharedList language={props.language} items={props.shared} />
      <ProfessionalChangeSupportPanel
        language={props.language}
        authToken={props.authToken}
        patientName={props.patientName}
        patientEmail={props.patientEmail}
        assignedProfessionalName={props.name}
        triggerStyle="profile-button"
      />
    </aside>
  );
}
