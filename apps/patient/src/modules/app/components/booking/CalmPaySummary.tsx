import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { IconEscudo, IconFlecha, IconSesiones } from "../../../home/calm/calmIcons";
import { CalmPayMancha } from "./CalmPayMancha";
import type { CalmPayOption } from "./buildCalmPayOptions";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

/** Resumen lateral del checkout calm-pay. */
export function CalmPaySummary(props: {
  language: AppLanguage;
  selected: CalmPayOption;
  slotLabel: string | null;
  blocked: boolean;
  onContinue: () => void;
}) {
  const { selected } = props;

  return (
    <aside className="calm-pay-summary">
      <header className="calm-pay-summary-head">
        <CalmPayMancha>
          <IconSesiones size={22} />
        </CalmPayMancha>
        <div>
          <p className="calm-pay-summary-kicker">
            {t(props.language, { es: "Tu elección", en: "Your choice", pt: "Sua escolha" })}
          </p>
          <h4>{selected.summaryLabel}</h4>
        </div>
      </header>
      {props.slotLabel ? (
        <p className="calm-pay-slot">
          <IconSesiones size={18} />
          <span>{props.slotLabel}</span>
        </p>
      ) : null}
      {selected.list ? (
        <p className="calm-pay-row">
          <span>{t(props.language, { es: "Precio de lista", en: "List price", pt: "Preço de lista" })}</span>
          <span className="calm-pay-list">{selected.list}</span>
        </p>
      ) : null}
      {selected.saving ? (
        <p className="calm-pay-row calm-pay-row--save">
          <span>{selected.saving}</span>
        </p>
      ) : null}
      <p className="calm-pay-total">
        <span>{t(props.language, { es: "Total", en: "Total", pt: "Total" })}</span>
        <b>{selected.total}</b>
      </p>
      <button type="button" className="calm-pay-continue" disabled={props.blocked} onClick={props.onContinue}>
        {t(props.language, { es: "Continuar al pago", en: "Continue to payment", pt: "Continuar para o pagamento" })}
        <IconFlecha size={16} />
      </button>
      <p className="calm-pay-note">
        <IconEscudo size={18} />
        {t(props.language, {
          es: "Es el monto exacto que vas a ver en el pago.",
          en: "This is the exact amount you will see at checkout.",
          pt: "É o valor exato que você vai ver no pagamento."
        })}
      </p>
    </aside>
  );
}
