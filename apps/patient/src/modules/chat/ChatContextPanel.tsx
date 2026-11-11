import type { SyntheticEvent } from "react";
import type { AppLanguage } from "@therapy/i18n-config";
import { ChatNextSessionCard } from "./components/ChatNextSessionCard";
import { ChatProfileCard } from "./components/ChatProfileCard";

export function ChatContextPanel(props: {
  language: AppLanguage;
  name: string;
  meta: string;
  photoSrc: string;
  ratingLabel: string | null;
  onOpenProfile: () => void;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  session: { when: string; meta: string; credits: string | null } | null;
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
    </aside>
  );
}
