import type { SyntheticEvent } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { IconFlecha } from "../../home/calm/calmIcons";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ChatProfileCard(props: {
  language: AppLanguage;
  name: string;
  meta: string;
  photoSrc: string;
  ratingLabel: string | null;
  onOpenProfile: () => void;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
}) {
  return (
    <article className="chat-ds-card chat-ds-profile">
      <img src={props.photoSrc} alt="" width={72} height={72} onError={props.onImageFallback} />
      <div>
        <b>{props.name}</b>
        {props.meta ? <span>{props.meta}</span> : null}
        {props.ratingLabel ? <span className="chat-ds-rating">{props.ratingLabel}</span> : null}
      </div>
      <button type="button" className="chat-ds-profile-link" onClick={props.onOpenProfile}>
        {t(props.language, { es: "Ver perfil", en: "View profile", pt: "Ver perfil" })}
        <IconFlecha size={16} />
      </button>
    </article>
  );
}
