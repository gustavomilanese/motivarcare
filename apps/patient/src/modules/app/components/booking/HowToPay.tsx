import { type ReactNode, useState } from "react";
import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { CalmPayOptionCard } from "./CalmPayOptionCard";
import { CalmPaySummary } from "./CalmPaySummary";
import { samePayChoice, type PayChoice } from "./payChoice";
import type { CalmPayOption } from "./buildCalmPayOptions";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function CalmPayChoice(props: {
  language: AppLanguage;
  options: CalmPayOption[];
  slotLabel: string | null;
  blocked: boolean;
  notice?: ReactNode;
  onContinue: (choice: PayChoice) => void;
  onClose: () => void;
}) {
  const [choice, setChoice] = useState<PayChoice | null>(
    () => props.options.find((option) => option.preferred)?.choice ?? props.options[0]?.choice ?? null
  );
  const selected = props.options.find((option) => samePayChoice(option.choice, choice)) ?? props.options[0] ?? null;

  return (
    <div className="calm-pay">
      <div className="calm-pay-head">
        <h3>
          {t(props.language, { es: "Elegí ", en: "Choose ", pt: "Escolha " })}
          <em>{t(props.language, { es: "cómo pagar.", en: "how to pay.", pt: "como pagar." })}</em>
        </h3>
        <button type="button" className="calm-text-link" onClick={props.onClose}>
          {t(props.language, { es: "Salir", en: "Leave", pt: "Sair" })}
        </button>
      </div>
      <p className="calm-pay-lead">
        {t(props.language, {
          es: "Elegí una sesión o un paquete. El monto es el que vas a ver en el pago.",
          en: "Choose one session or a package. The amount is the one you will see at checkout.",
          pt: "Escolha uma sessão ou um pacote. O valor é o que você vai ver no pagamento."
        })}
      </p>
      {props.notice}
      <div className="calm-pay-layout">
        <div
          className="calm-pay-options"
          role="radiogroup"
          aria-label={t(props.language, { es: "Cómo pagar", en: "How to pay", pt: "Como pagar" })}
        >
          {props.options.map((option) => (
            <CalmPayOptionCard
              key={option.key}
              language={props.language}
              option={option}
              selected={samePayChoice(option.choice, selected?.choice ?? null)}
              onSelect={() => setChoice(option.choice)}
            />
          ))}
        </div>
        {selected ? (
          <CalmPaySummary
            language={props.language}
            selected={selected}
            slotLabel={props.slotLabel}
            blocked={props.blocked}
            onContinue={() => props.onContinue(selected.choice)}
          />
        ) : null}
      </div>
    </div>
  );
}
