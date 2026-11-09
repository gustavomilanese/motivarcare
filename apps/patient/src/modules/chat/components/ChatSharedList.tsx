import { Link } from "react-router-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { IconDiario } from "../../home/calm/calmIcons";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ChatSharedList(props: {
  language: AppLanguage;
  items: Array<{ id: string; title: string }>;
}) {
  return (
    <article className="chat-ds-card">
      <h3>{t(props.language, { es: "Compartido en el chat", en: "Shared in the chat", pt: "Compartilhado no chat" })}</h3>
      {props.items.length === 0 ? (
        <p>
          {t(props.language, {
            es: "Cuando compartas una entrada del diario, va a aparecer acá.",
            en: "Diary entries you share will show up here.",
            pt: "As entradas do diário que você compartilhar aparecem aqui."
          })}
        </p>
      ) : (
        <ul>
          {props.items.map((item) => (
            <li key={item.id}>
              <Link to="/diario/registros">
                <IconDiario size={18} />
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
