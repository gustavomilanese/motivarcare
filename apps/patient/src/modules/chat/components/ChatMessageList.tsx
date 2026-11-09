import type { RefObject } from "react";
import { Link } from "react-router-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import type { EmotionalDiaryMood } from "@therapy/types";
import { IconDiario, IconVideo, MoodFace } from "../../home/calm/calmIcons";
import type { ChatTimelineItem } from "../chatTimeline";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const MOOD_FACE: Record<EmotionalDiaryMood, EmotionalDiaryMood> = {
  very_bad: "very_bad",
  bad: "bad",
  regular: "regular",
  good: "good",
  very_good: "very_good"
};

export function ChatMessageList(props: {
  language: AppLanguage;
  items: ChatTimelineItem[];
  emptyLabel: string | null;
  sessionNotice: { title: string; meta: string } | null;
  onOpenSession: () => void;
  threadRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="chat-ds-thread" ref={props.threadRef}>
      {props.emptyLabel ? <p className="chat-ds-empty">{props.emptyLabel}</p> : null}
      {props.items.map((item) => (
        <ChatTimelineRow key={item.id} item={item} language={props.language} />
      ))}
      {props.sessionNotice ? (
        <div className="chat-ds-session">
          <IconVideo size={18} />
          <span>
            <b>{props.sessionNotice.title}</b>
            {` · ${props.sessionNotice.meta}`}
          </span>
          <button type="button" onClick={props.onOpenSession}>
            {t(props.language, { es: "Ver detalle", en: "View details", pt: "Ver detalhe" })}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ChatTimelineRow(props: { item: ChatTimelineItem; language: AppLanguage }) {
  const item = props.item;
  if (item.kind === "day") {
    return <span className="chat-ds-day">{item.label}</span>;
  }
  if (item.kind === "text") {
    return (
      <article id={`chat-msg-${item.id}`} className={item.outgoing ? "chat-ds-msg is-out" : "chat-ds-msg is-in"}>
        <p>{item.body}</p>
        <time>
          {item.timeLabel}
          {item.seen ? t(props.language, { es: " · Visto", en: " · Seen", pt: " · Visto" }) : ""}
        </time>
      </article>
    );
  }
  if (item.kind === "diary") {
    return (
      <article id={`chat-msg-${item.id}`} className="chat-ds-msg is-out">
        <Link className="chat-ds-attach" to="/diario/registros">
          <span className="chat-ds-attach-face" aria-hidden="true">
            {item.mood ? <MoodFace face={MOOD_FACE[item.mood]} /> : <IconDiario size={20} />}
          </span>
          <span>
            <b>
              {t(props.language, {
                es: "Compartiste una entrada de tu diario",
                en: "You shared a diary entry",
                pt: "Você compartilhou uma entrada do diário"
              })}
            </b>
            <span>
              {item.title}
              {item.meta ? ` · ${item.meta}` : ""}
            </span>
          </span>
        </Link>
        <time>{item.timeLabel}</time>
      </article>
    );
  }
  return (
    <article id={`chat-msg-${item.id}`} className="chat-ds-msg is-out">
      <Link className="chat-ds-attach" to="/diario/registros">
        <IconDiario size={20} />
        <span>
          <b>{item.title}</b>
          <span>{t(props.language, { es: "Para tu profesional", en: "For your professional", pt: "Para seu profissional" })}</span>
        </span>
      </Link>
      <time>{item.timeLabel}</time>
    </article>
  );
}
