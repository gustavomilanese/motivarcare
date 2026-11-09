import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { CalmPayMancha } from "./CalmPayMancha";
import type { CalmPayOption } from "./buildCalmPayOptions";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Una opción de paquete / sesión en el checkout calm-pay. */
export function CalmPayOptionCard(props: {
  language: AppLanguage;
  option: CalmPayOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const { option, selected } = props;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={`calm-pay-option${selected ? " is-on" : ""}${option.preferred ? " is-preferred" : ""}`}
      onClick={props.onSelect}
    >
      <CalmPayMancha>
        <b className="calm-pay-mancha-count">{option.credits}</b>
      </CalmPayMancha>
      <span className="calm-pay-copy">
        <strong>
          {option.title}
          {option.preferred ? (
            <em className="calm-pay-preferred">
              {t(props.language, { es: "Más elegido", en: "Most chosen", pt: "Mais escolhido" })}
            </em>
          ) : null}
          {option.saving ? <em className="calm-pay-saving">{option.saving}</em> : null}
        </strong>
        <span>{option.detail}</span>
      </span>
      <span className="calm-pay-price">
        <b>{option.price}</b>
        <small>{option.note}</small>
      </span>
      <span className="calm-pay-radio" aria-hidden="true" />
    </button>
  );
}
