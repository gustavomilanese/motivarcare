import { useEffect } from "react";
import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function IconBundleStack() {
  return (
    <svg className="acquire-sessions-choice-icon" viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="6" y="10" width="36" height="9" rx="3" fill="currentColor" opacity="0.2" />
      <rect x="6" y="20" width="36" height="9" rx="3" fill="currentColor" opacity="0.45" />
      <rect x="6" y="30" width="36" height="9" rx="3" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

function IconSingleSession() {
  return (
    <svg className="acquire-sessions-choice-icon" viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect
        x="12"
        y="12"
        width="24"
        height="24"
        rx="5"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.88"
      />
    </svg>
  );
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
          <p className="acquire-sessions-choice-kicker">
            {t(props.language, {
              es: "Comprar créditos",
              en: "Buy credits",
              pt: "Comprar créditos"
            })}
          </p>
          <h2 id="acquire-sessions-choice-title" className="acquire-sessions-choice-title">
            {t(props.language, {
              es: "Sumar sesiones",
              en: "Add sessions",
              pt: "Adicionar sessões"
            })}
          </h2>
          <p className="acquire-sessions-choice-lead">
            {t(props.language, {
              es: "Dos formas simples de seguir tu proceso.",
              en: "Two simple ways to continue your care.",
              pt: "Duas formas simples de continuar seu processo."
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
            className="acquire-sessions-choice-card acquire-sessions-choice-card--packages"
            onClick={() => {
              props.onChoosePackages();
              props.onClose();
            }}
          >
            <span className="acquire-sessions-choice-card-visual" aria-hidden>
              <span className="acquire-sessions-choice-card-squircle acquire-sessions-choice-card-squircle--packages">
                <IconBundleStack />
              </span>
            </span>
            <span className="acquire-sessions-choice-card-label-pill acquire-sessions-choice-card-label-pill--packages">
              {t(props.language, { es: "Paquetes", en: "Bundles", pt: "Pacotes" })}
            </span>
            <span className="acquire-sessions-choice-card-copy">
              <span className="acquire-sessions-choice-card-title">
                {t(props.language, {
                  es: "Paquete",
                  en: "Bundle",
                  pt: "Pacote"
                })}
              </span>
              <span className="acquire-sessions-choice-card-hint">
                {t(props.language, {
                  es: "Varias sesiones juntas",
                  en: "Several sessions together",
                  pt: "Várias sessões juntas"
                })}
              </span>
            </span>
          </button>

          <button
            type="button"
            className="acquire-sessions-choice-card acquire-sessions-choice-card--individual"
            onClick={() => {
              props.onChooseIndividual();
              props.onClose();
            }}
          >
            <span className="acquire-sessions-choice-card-visual" aria-hidden>
              <span className="acquire-sessions-choice-card-squircle acquire-sessions-choice-card-squircle--individual">
                <IconSingleSession />
              </span>
            </span>
            <span className="acquire-sessions-choice-card-label-pill acquire-sessions-choice-card-label-pill--individual">
              {t(props.language, { es: "Flexible", en: "Flexible", pt: "Flexível" })}
            </span>
            <span className="acquire-sessions-choice-card-copy">
              <span className="acquire-sessions-choice-card-title">
                {t(props.language, {
                  es: "Individual",
                  en: "Individual",
                  pt: "Avulsa"
                })}
              </span>
              <span className="acquire-sessions-choice-card-hint">
                {t(props.language, {
                  es: "Cantidad a tu medida",
                  en: "Choose the exact amount",
                  pt: "Quantidade que precisar"
                })}
              </span>
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
