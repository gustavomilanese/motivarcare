import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ChatNextSessionCard(props: {
  language: AppLanguage;
  when: string;
  meta: string;
  credits: string | null;
}) {
  return (
    <article className="chat-ds-card chat-ds-next">
      <h3>{t(props.language, { es: "Próxima sesión", en: "Next session", pt: "Próxima sessão" })}</h3>
      <b>{props.when}</b>
      <span>{props.meta}</span>
      {props.credits ? <span className="chat-ds-credits">{props.credits}</span> : null}
    </article>
  );
}
