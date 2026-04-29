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
          <p className="intake-chooser-subtitle">
            {t({
              es: "Elegí la modalidad con la que te sientas más cómodo/a. Las dos terminan con el mismo resultado: matchearte con el/la profesional adecuado/a.",
              en: "Pick whichever feels more comfortable. Both end the same way: matching you with the right professional.",
              pt: "Escolha a modalidade com que se sinta mais confortável. As duas terminam igual: encontrar o/a profissional certo/a para você."
            })}
          </p>
        </header>

        <div className="intake-chooser-grid">
          <article className="intake-chooser-option intake-chooser-option--classic">
            <div className="intake-chooser-option-badge">
              {t({ es: "Tradicional", en: "Traditional", pt: "Tradicional" })}
            </div>
            <h2 className="intake-chooser-option-title">
              {t({
                es: "Cuestionario paso a paso",
                en: "Step-by-step questionnaire",
                pt: "Questionário passo a passo"
              })}
            </h2>
            <p className="intake-chooser-option-desc">
              {t({
                es: "8 preguntas con opciones predefinidas. Tarda unos 3-5 minutos. Ideal si preferís lo directo.",
                en: "8 questions with predefined options. Takes about 3-5 minutes. Best if you prefer something direct.",
                pt: "8 perguntas com opções predefinidas. Leva uns 3-5 minutos. Ideal se você prefere o direto."
              })}
            </p>
            <ul className="intake-chooser-option-bullets">
              <li>
                {t({
                  es: "Mismo resultado, formato clásico",
                  en: "Same result, classic format",
                  pt: "Mesmo resultado, formato clássico"
                })}
              </li>
              <li>
                {t({
                  es: "Sin uso de IA",
                  en: "No AI involved",
                  pt: "Sem uso de IA"
                })}
              </li>
            </ul>
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
            <h2 className="intake-chooser-option-title">
              {t({
                es: "Chat conversacional",
                en: "Conversational chat",
                pt: "Chat conversacional"
              })}
            </h2>
            <p className="intake-chooser-option-desc">
              {t({
                es: "Una conversación natural con un asistente. Te hace las mismas preguntas pero podés contar las cosas con tus palabras.",
                en: "A natural conversation with an assistant. Same questions, but you can answer in your own words.",
                pt: "Uma conversa natural com um assistente. As mesmas perguntas, mas você responde com suas palavras."
              })}
            </p>
            <ul className="intake-chooser-option-bullets">
              <li>
                {t({
                  es: "Más conversacional, menos formal",
                  en: "More conversational, less formal",
                  pt: "Mais conversacional, menos formal"
                })}
              </li>
              <li>
                {t({
                  es: "Podés volver más tarde y retomar",
                  en: "You can come back later and resume",
                  pt: "Você pode voltar depois e retomar"
                })}
              </li>
            </ul>
            <button
              type="button"
              className="intake-chooser-option-cta intake-chooser-option-cta--chat"
              onClick={props.onChooseChat}
            >
              {props.hasActiveChatSession
                ? t({ es: "Continuar conversación", en: "Continue conversation", pt: "Continuar conversa" })
                : t({ es: "Iniciar chat con IA", en: "Start AI chat", pt: "Iniciar chat com IA" })}
            </button>
            <p className="intake-chooser-option-fineprint">
              {t({
                es: "Tu conversación se guarda en MotivarCare y se procesa con OpenAI para entender tus respuestas. No la usamos para entrenar modelos. Si preferís, usá el cuestionario tradicional.",
                en: "Your conversation is stored on MotivarCare and processed with OpenAI to understand your answers. We don't use it to train models. If you prefer, use the traditional questionnaire.",
                pt: "Sua conversa é armazenada no MotivarCare e processada com OpenAI para entender suas respostas. Não a usamos para treinar modelos. Se preferir, use o questionário tradicional."
              })}
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
