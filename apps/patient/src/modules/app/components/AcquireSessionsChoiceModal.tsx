import { useEffect } from "react";
import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function AcquireSessionsChoiceModal(props: {
  language: AppLanguage;
  onClose: () => void;
  onChoosePackages: () => void;
  onChooseIndividual: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        props.onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [props.onClose]);

  return (
    <div className="matching-flow-backdrop acquire-sessions-backdrop" role="presentation" onClick={props.onClose}>
      <section
        className="matching-flow-modal acquire-sessions-choice-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="acquire-sessions-choice-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="acquire-sessions-choice-head">
          <h2 id="acquire-sessions-choice-title" className="acquire-sessions-choice-title">
            {t(props.language, {
              es: "¿Cómo querés sumar sesiones?",
              en: "How would you like to add sessions?",
              pt: "Como voce quer adicionar sessoes?"
            })}
          </h2>
          <p className="acquire-sessions-choice-sub">
            {t(props.language, {
              es: "Elegí una opción para continuar.",
              en: "Pick an option to continue.",
              pt: "Escolha uma opcao para continuar."
            })}
          </p>
          <button
            type="button"
            className="matching-flow-close acquire-sessions-choice-close"
            onClick={props.onClose}
            aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
          >
            ×
          </button>
        </header>

        <div className="acquire-sessions-choice-actions">
          <button
            type="button"
            className="acquire-sessions-choice-card"
            onClick={() => {
              props.onChoosePackages();
              props.onClose();
            }}
          >
            <span className="acquire-sessions-choice-card-kicker">
              {t(props.language, { es: "Paquetes", en: "Packages", pt: "Pacotes" })}
            </span>
            <strong className="acquire-sessions-choice-card-title">
              {t(props.language, {
                es: "Varias sesiones con descuento",
                en: "Multi-session bundles",
                pt: "Varias sessões com desconto"
              })}
            </strong>
            <span className="acquire-sessions-choice-card-hint">
              {t(props.language, {
                es: "Ver planes y elegir el que mejor te quede.",
                en: "Browse plans and pick what fits you best.",
                pt: "Ver planos e escolher o que combina com você."
              })}
            </span>
          </button>

          <button
            type="button"
            className="acquire-sessions-choice-card acquire-sessions-choice-card--secondary"
            onClick={() => {
              props.onChooseIndividual();
              props.onClose();
            }}
          >
            <span className="acquire-sessions-choice-card-kicker">
              {t(props.language, { es: "Flexible", en: "Flexible", pt: "Flexível" })}
            </span>
            <strong className="acquire-sessions-choice-card-title">
              {t(props.language, {
                es: "Sesiones individuales",
                en: "Individual sessions",
                pt: "Sessões avulsas"
              })}
            </strong>
            <span className="acquire-sessions-choice-card-hint">
              {t(props.language, {
                es: "Comprá la cantidad exacta que necesites.",
                en: "Buy exactly how many you need.",
                pt: "Compre exatamente a quantidade que precisar."
              })}
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
