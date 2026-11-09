import { useEffect } from "react";
import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";
import { IconCerrar, IconSesiones } from "../../home/calm/calmIcons";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
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
          <IconCerrar size={18} />
        </button>

        <div className="no-sessions-available-visual" aria-hidden>
          <span className="no-sessions-available-mancha">
            <svg className="no-sessions-available-mancha-blob" viewBox="0 0 100 100">
              <path
                d="M82 64c-6 18-26 28-44 24S8 68 10 48 28 12 50 12s38 34 32 52z"
                fill="#2F6B51"
                opacity="0.85"
              />
            </svg>
            <IconSesiones size={26} />
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
