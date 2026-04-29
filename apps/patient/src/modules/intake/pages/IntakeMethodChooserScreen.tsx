import { type AppLanguage, textByLanguage } from "@therapy/i18n-config";

/**
 * Pantalla "puerta" del intake: el paciente elige entre el wizard clásico
 * (preguntas paso a paso) o el chat conversacional asistido por IA (beta).
 *
 * No conoce nada de auth/api: el padre pasa los callbacks y decide
 * qué pantalla mostrar después según la elección.
 */
export function IntakeMethodChooserScreen(props: {
  language: AppLanguage;
  onChooseClassic: () => void;
  onChooseChat: () => void;
  onBack?: () => void;
  /**
   * `true` si ya hay una sesión de chat activa que el paciente puede retomar.
   * Cuando es `true`, mostramos un texto de "Continuá la conversación" en vez de "Empezá".
   */
  hasActiveChatSession?: boolean;
}) {
  const { language } = props;
  const t = (values: { es: string; en: string; pt: string }) => textByLanguage(language, values);

  return (
    <div className="intake-shell intake-shell--chooser">
      <section className="intake-card intake-card--chooser">
        <header className="intake-chooser-header">
          {props.onBack ? (
            <button type="button" className="intake-chooser-back" onClick={props.onBack}>
              {t({ es: "← Volver", en: "← Back", pt: "← Voltar" })}
            </button>
          ) : null}
          <h1 className="intake-chooser-title">
            {t({
              es: "¿Cómo querés hacer la entrevista?",
              en: "How would you like to do the intake?",
              pt: "Como você quer fazer a entrevista?"
            })}
          </h1>
        </header>

        <div className="intake-chooser-grid">
          <article className="intake-chooser-option intake-chooser-option--classic">
            <div className="intake-chooser-option-badge">
              {t({ es: "Tradicional", en: "Traditional", pt: "Tradicional" })}
            </div>
            <button
              type="button"
              className="intake-chooser-option-cta intake-chooser-option-cta--classic"
              onClick={props.onChooseClassic}
            >
              {t({ es: "Empezar cuestionario", en: "Start questionnaire", pt: "Começar questionário" })}
            </button>
          </article>

          <article className="intake-chooser-option intake-chooser-option--chat">
            <div className="intake-chooser-option-badge intake-chooser-option-badge--beta">
              {t({ es: "Beta · IA", en: "Beta · AI", pt: "Beta · IA" })}
            </div>
            <button
              type="button"
              className="intake-chooser-option-cta intake-chooser-option-cta--chat"
              onClick={props.onChooseChat}
            >
              {props.hasActiveChatSession
                ? t({ es: "Continuar conversación", en: "Continue conversation", pt: "Continuar conversa" })
                : t({ es: "Iniciar chat con IA", en: "Start AI chat", pt: "Iniciar chat com IA" })}
            </button>
          </article>
        </div>
      </section>
    </div>
  );
}
