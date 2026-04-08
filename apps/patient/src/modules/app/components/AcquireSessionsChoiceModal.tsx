import { useEffect } from "react";
import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function IconBundleStack() {
  return (
    <svg className="acquire-sessions-choice-icon" viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect x="6" y="8" width="28" height="8" rx="2.5" fill="currentColor" opacity="0.22" />
      <rect x="6" y="16" width="28" height="8" rx="2.5" fill="currentColor" opacity="0.45" />
      <rect x="6" y="24" width="28" height="8" rx="2.5" fill="currentColor" opacity="0.78" />
    </svg>
  );
}

function IconSingleSession() {
  return (
    <svg className="acquire-sessions-choice-icon" viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect x="11" y="11" width="18" height="18" rx="4" fill="currentColor" opacity="0.88" />
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
          <h2 id="acquire-sessions-choice-title" className="acquire-sessions-choice-title">
            {t(props.language, {
              es: "Sumar sesiones",
              en: "Add sessions",
              pt: "Adicionar sessões"
            })}
          </h2>
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
              <span className="acquire-sessions-choice-card-ring">
                <IconBundleStack />
              </span>
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
              <span className="acquire-sessions-choice-card-ring">
                <IconSingleSession />
              </span>
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
