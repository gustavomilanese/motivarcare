import { textByLanguage, type AppLanguage, type LocalizedText } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function AssignProfessionalPromptModal(props: {
  language: AppLanguage;
  onClose: () => void;
  onChooseProfessional: () => void;
}) {
  return (
    <div className="matching-flow-backdrop" role="presentation" onClick={props.onClose}>
      <section
        className="matching-flow-modal assign-professional-prompt-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-professional-prompt-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="matching-flow-header">
          <h3 id="assign-professional-prompt-title">
            {t(props.language, {
              es: "Elegí tu profesional",
              en: "Choose your professional",
              pt: "Escolha seu profissional"
            })}
          </h3>
          <button
            type="button"
            className="matching-flow-close"
            onClick={props.onClose}
            aria-label={t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
          >
            ×
          </button>
        </header>
        <p className="assign-professional-prompt-lead">
          {t(props.language, {
            es: "Para mostrarte precios reales y acreditar sesiones, necesitamos saber con qué profesional vas a trabajar. Su tarifa define los paquetes de 4, 8 y 12 sesiones.",
            en: "To show real prices and credit sessions, we need to know which professional you’ll work with. Their rate defines the 4, 8, and 12 session packages.",
            pt: "Para mostrar precos reais e creditar sessoes, precisamos saber com qual profissional voce vai trabalhar. A tarifa dele define os pacotes de 4, 8 e 12 sessoes."
          })}
        </p>
        <footer className="matching-flow-footer">
          <button type="button" className="matching-flow-secondary" onClick={props.onClose}>
            {t(props.language, { es: "Ahora no", en: "Not now", pt: "Agora nao" })}
          </button>
          <button type="button" className="matching-flow-primary" onClick={props.onChooseProfessional}>
            {t(props.language, {
              es: "Elegir profesional",
              en: "Choose professional",
              pt: "Escolher profissional"
            })}
          </button>
        </footer>
      </section>
    </div>
  );
}
