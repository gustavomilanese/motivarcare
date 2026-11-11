import type { SyntheticEvent } from "react";
import { Link } from "react-router-dom";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { IconSesiones } from "../../home/calm/calmIcons";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ChatThreadHeader(props: {
  language: AppLanguage;
  mobile?: boolean;
  name: string | null;
  photoSrc: string | null;
  /** Con saldo → Reservar; sin saldo → Comprar (paquetes). */
  canReserve?: boolean;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
}) {
  const canReserve = props.canReserve !== false;
  const replyHint = props.mobile
    ? t(props.language, { es: "Suele responder en el día", en: "Usually replies the same day", pt: "Costuma responder no dia" })
    : t(props.language, {
        es: "Suele responder en el día, de lunes a viernes",
        en: "Usually replies the same day, Monday to Friday",
        pt: "Costuma responder no dia, de segunda a sexta"
      });
  const reserveLabel = t(props.language, { es: "Reservar sesión", en: "Book a session", pt: "Reservar sessão" });
  const buyLabel = t(props.language, { es: "Comprar", en: "Buy", pt: "Comprar" });
  const actionLabel = canReserve ? reserveLabel : buyLabel;
  const actionTo = canReserve ? "/sessions" : "/sessions?flow=checkout";

  return (
    <header className="chat-ds-head">
      {props.photoSrc && props.name ? (
        <img src={props.photoSrc} alt="" width={48} height={48} onError={props.onImageFallback} />
      ) : null}
      <div className="chat-ds-head-copy">
        <b>{props.name ?? t(props.language, { es: "Chat no disponible", en: "Chat unavailable", pt: "Chat indisponível" })}</b>
        <span>
          {props.name
            ? replyHint
            : t(props.language, {
                es: "Cuando tengas un profesional asignado, podés escribirle desde acá.",
                en: "Once a professional is assigned, you can write from here.",
                pt: "Quando houver um profissional, você pode escrever por aqui."
              })}
        </span>
      </div>
      {props.name ? (
        props.mobile ? (
          <Link className="chat-ds-icon-btn" to={actionTo} aria-label={actionLabel}>
            <IconSesiones size={22} />
          </Link>
        ) : (
          <Link className="calm-btn calm-btn--outline chat-ds-reserve" to={actionTo}>
            <IconSesiones size={18} />
            {actionLabel}
          </Link>
        )
      ) : null}
    </header>
  );
}
