import { useEffect } from "react";
import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function EmptySessionsVisual() {
  return (
    <svg className="no-sessions-available-visual-svg" viewBox="0 0 88 88" fill="none" aria-hidden>
      <rect x="14" y="18" width="60" height="52" rx="14" fill="currentColor" opacity="0.1" />
      <rect x="14" y="18" width="60" height="16" rx="14" fill="currentColor" opacity="0.18" />
      <rect x="14" y="26" width="60" height="8" fill="currentColor" opacity="0.18" />
      <circle cx="28" cy="26" r="3.2" fill="#fff" opacity="0.95" />
      <circle cx="60" cy="26" r="3.2" fill="#fff" opacity="0.95" />
      <rect x="28" y="44" width="12" height="10" rx="3" fill="currentColor" opacity="0.22" />
      <rect x="46" y="44" width="12" height="10" rx="3" fill="currentColor" opacity="0.12" />
      <circle cx="58" cy="60" r="13" fill="#fff" />
      <circle cx="58" cy="60" r="12" stroke="currentColor" strokeWidth="2.4" strokeOpacity="0.55" />
      <path
        d="M58 54.5v6.2l4.4 2.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.78"
      />
    </svg>
  );
}

/** Aviso al intentar reservar sin créditos: luego se abre el catálogo de paquetes. */
export function NoSessionsAvailableModal(props: {
  language: AppLanguage;
  onClose: () => void;
  onContinueToPackages: () => void;
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
    <div
      className="matching-flow-backdrop no-sessions-available-backdrop"
      role="presentation"
      onClick={props.onClose}
    >
      <section
        className="matching-flow-modal no-sessions-available-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="no-sessions-available-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="matching-flow-close no-sessions-available-close"
          onClick={props.onClose}
          aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
        >
          ×
        </button>

        <div className="no-sessions-available-visual" aria-hidden>
          <span className="no-sessions-available-visual-ring">
            <EmptySessionsVisual />
          </span>
        </div>

        <div className="no-sessions-available-copy">
          <p className="no-sessions-available-kicker">
            {t(props.language, {
              es: "Tu saldo",
              en: "Your balance",
              pt: "Seu saldo"
            })}
          </p>
          <h2 id="no-sessions-available-title" className="no-sessions-available-title">
            {t(props.language, {
              es: "Sin sesiones para reservar",
              en: "No sessions to book",
              pt: "Sem sessoes para reservar"
            })}
          </h2>
          <p className="no-sessions-available-lead">
            {t(props.language, {
              es: "Sumá un paquete y seguí con tu acompañamiento cuando quieras.",
              en: "Add a package and keep going with your care whenever you’re ready.",
              pt: "Adicione um pacote e continue seu acompanhamento quando quiser."
            })}
          </p>
        </div>

        <div className="no-sessions-available-actions">
          <button
            type="button"
            className="no-sessions-available-primary"
            onClick={props.onContinueToPackages}
          >
            {t(props.language, {
              es: "Ver paquetes disponibles",
              en: "View available packages",
              pt: "Ver pacotes disponiveis"
            })}
          </button>
          <button type="button" className="no-sessions-available-secondary" onClick={props.onClose}>
            {t(props.language, { es: "Ahora no", en: "Not now", pt: "Agora nao" })}
          </button>
        </div>
      </section>
    </div>
  );
}
