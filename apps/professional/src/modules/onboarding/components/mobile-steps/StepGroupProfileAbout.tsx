import { useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfessionalAboutInfoIntroStep(props: { language: AppLanguage; onBack: () => void; onContinue: () => void }) {
  return (
    <div className="pro-register-intro-shell">
      <section className="pro-about-info-card">
        <header className="pro-form-step-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <div className="pro-form-step-progress" aria-hidden="true">
            <span className="active progress-photo" />
          </div>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-about-copy">
          <h1>
            {t(props.language, {
              es: "En la siguiente pantalla agregará información sobre usted.",
              en: "In the next screen, you will add information about yourself.",
              pt: "Na proxima tela, voce adicionara informacoes sobre voce."
            })}
          </h1>

          <p>
            {t(props.language, {
              es: "El texto debería tener entre 1000 y 1500 caracteres, y al menos 500.",
              en: "The information should be around 1,000 to 1,500 characters, but at least 500 characters.",
              pt: "A informacao deve ter aproximadamente entre 1.000 e 1.500 caracteres, mas no minimo 500."
            })}
          </p>

          <p>{t(props.language, { es: "Incluya en el texto respuestas a estos puntos:", en: "Answer the following points in your text:", pt: "Responda aos seguintes pontos no seu texto:" })}</p>
          <ul>
            <li>{t(props.language, { es: "Por qué eligió la psicología como profesión y cuánto tiempo lleva en este campo.", en: "Why you chose psychology and how long you have worked in this field.", pt: "Por que escolheu psicologia e ha quanto tempo atua na area." })}</li>
            <li>{t(props.language, { es: "Con que metodo trabaja, para que sirve y para quien sera util.", en: "What method you use, what it helps with, and who it is useful for.", pt: "Com qual metodo voce trabalha, para que serve e para quem e util." })}</li>
            <li>{t(props.language, { es: "Quien es su cliente y cual es su objetivo al trabajar con el cliente.", en: "Who your client is and your therapeutic goal when working with clients.", pt: "Quem e seu cliente e qual e seu objetivo terapeutico com ele." })}</li>
            <li>{t(props.language, { es: "Información personal única que desee compartir para generar confianza.", en: "A unique personal detail you want to share to build trust.", pt: "Alguma informacao pessoal unica que deseje compartilhar para gerar confianca." })}</li>
            <li>{t(props.language, { es: "Cierre con una invitación para que potenciales clientes programen una cita con usted.", en: "Finish with an invitation for potential clients to book a session with you.", pt: "Finalize com um convite para que clientes potenciais agendem uma sessao com voce." })}</li>
          </ul>
        </div>

        <div className="pro-about-example">
          <strong>{t(props.language, { es: "Ejemplo", en: "Example", pt: "Exemplo" })}</strong>
          <article>
            <span aria-hidden="true">“</span>
            <p>
              {t(props.language, {
                es: "Hola, soy Maria, psicoterapeuta con enfoque Gestalt. Trabajo hace años acompañando a personas que atraviesan ansiedad y cambios vitales. Mi objetivo es crear un espacio seguro donde puedas entender lo que te pasa y construir herramientas para sentirte mejor. Si te resuena este enfoque, te invito a reservar una primera sesión.",
                en: "Hi, I'm Maria, a psychotherapist with a Gestalt approach. I have spent years supporting people through anxiety and life transitions. My goal is to create a safe space where you can understand what you're experiencing and build practical tools to feel better. If this resonates with you, I invite you to book a first session.",
                pt: "Oi, eu sou Maria, psicoterapeuta com abordagem Gestalt. Ha anos acompanho pessoas em processos de ansiedade e mudancas de vida. Meu objetivo e criar um espaco seguro para compreender o que voce esta vivendo e construir ferramentas praticas para se sentir melhor. Se essa abordagem fizer sentido para voce, eu te convido para agendar uma primeira sessao."
              })}
            </p>
          </article>
        </div>

        <button className="pro-primary pro-register-intro-cta" type="button" onClick={props.onContinue}>
          {t(props.language, { es: "Seguimos", en: "Continue", pt: "Continuar" })}
        </button>
      </section>
    </div>
  );
}

export function ProfessionalAboutStep(props: {
  language: AppLanguage;
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [showError, setShowError] = useState(false);
  const minLength = 500;
  const maxLength = 1500;
  const charCount = props.value.length;
  const hasContent = props.value.trim().length > 0;
  const canContinue = charCount >= minLength;

  const handleContinue = () => {
    if (!canContinue) {
      setShowError(true);
      return;
    }

    setShowError(false);
    props.onContinue();
  };

  return (
    <div className="pro-register-intro-shell">
      <section className="pro-form-step-card">
        <header className="pro-form-step-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <div className="pro-form-step-progress" aria-hidden="true">
            <span className="active progress-photo" />
          </div>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-about-step-head">
          <h1>{t(props.language, { es: "Acerca de mi", en: "About me", pt: "Sobre mim" })}</h1>
          <small>{charCount}/{maxLength}</small>
        </div>

        <label className={`pro-about-step-field ${showError ? "error" : ""}`}>
          <textarea
            value={props.value}
            onChange={(event) => {
              const nextValue = event.target.value.slice(0, maxLength);
              props.onChange(nextValue);
              if (showError && nextValue.length >= minLength) {
                setShowError(false);
              }
            }}
            placeholder={t(props.language, {
              es: "Acerca de mi",
              en: "About me",
              pt: "Sobre mim"
            })}
          />
        </label>

        <button className="pro-primary pro-register-intro-cta" type="button" onClick={handleContinue} disabled={!hasContent}>
          {t(props.language, { es: "Guardar y continuar", en: "Save and continue", pt: "Salvar e continuar" })}
        </button>

        {showError ? (
          <div className="pro-password-error-sheet" role="alert">
            <p>{t(props.language, { es: "El texto debe tener al menos 500 caracteres.", en: "Text must contain at least 500 characters.", pt: "O texto deve conter pelo menos 500 caracteres." })}</p>
            <button type="button" onClick={() => setShowError(false)}>
              {t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function ProfessionalTherapyDescriptionInfoStep(props: { language: AppLanguage; onBack: () => void; onContinue: () => void }) {
  return (
    <div className="pro-register-intro-shell">
      <section className="pro-about-info-card">
        <header className="pro-form-step-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <div className="pro-form-step-progress" aria-hidden="true">
            <span className="active progress-photo" />
          </div>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-about-copy">
          <h1>
            {t(props.language, {
              es: "Que puedes esperar en terapia conmigo?",
              en: "What can you expect from therapy with me?",
              pt: "O que voce pode esperar da terapia comigo?"
            })}
          </h1>

          <p>
            {t(props.language, {
              es: "Aproximadamente el 50% de nuestros clientes no han tenido experiencia trabajando con un psicólogo antes, por lo que en este punto es importante tranquilizar al cliente y explicarle de qué se trata la terapia con usted.",
              en: "Around 50% of clients have never worked with a psychologist before, so this step should reassure them and explain what therapy with you will be like.",
              pt: "Cerca de 50% dos clientes nunca fizeram terapia antes. Nesta etapa, e importante tranquiliza-los e explicar como e o processo com voce."
            })}
          </p>

          <p>
            {t(props.language, {
              es: "La información debe ser voluminosa: aproximadamente entre 1000 y 1500 caracteres, pero al menos 500 caracteres.",
              en: "The text should be substantial: around 1,000 to 1,500 characters, but at least 500 characters.",
              pt: "A informacao deve ser completa: aproximadamente entre 1.000 e 1.500 caracteres, mas no minimo 500."
            })}
          </p>

          <p>{t(props.language, { es: "Revele las respuestas a las siguientes preguntas en el texto:", en: "Include answers to the following points:", pt: "Inclua respostas para os seguintes pontos:" })}</p>
          <ul>
            <li>{t(props.language, { es: "Qué esperar de la primera sesión.", en: "What to expect in the first session.", pt: "O que esperar da primeira sessao." })}</li>
            <li>{t(props.language, { es: "Formato de trabajo, frecuencia y cantidad promedio de sesiones.", en: "Work format, frequency, and estimated number of sessions.", pt: "Formato de trabalho, frequencia e numero medio de sessoes." })}</li>
            <li>{t(props.language, { es: "Si recomienda tareas o lectura entre sesiones.", en: "Whether you recommend exercises or reading between sessions.", pt: "Se recomenda tarefas ou leituras entre as sessoes." })}</li>
            <li>{t(props.language, { es: "Termine con una invitación para que potenciales clientes agenden una cita.", en: "Finish with an invitation for potential clients to book a session.", pt: "Finalize com um convite para agendar uma sessao." })}</li>
          </ul>
        </div>

        <div className="pro-about-example">
          <strong>{t(props.language, { es: "Ejemplo", en: "Example", pt: "Exemplo" })}</strong>
          <article>
            <span aria-hidden="true">“</span>
            <p>
              {t(props.language, {
                es: "La primera sesión es una introducción: conversamos sobre su situación actual, objetivos y expectativas. Definimos una frecuencia de trabajo y un plan de acompañamiento. En ocasiones propongo ejercicios simples o lecturas para continuar el proceso entre sesiones. Si siente que este enfoque puede ayudarle, le invito a reservar su primera cita.",
                en: "The first session is an introduction: we discuss your current situation, goals, and expectations. Then we define session frequency and a support plan. In some cases I suggest practical exercises or short readings between sessions. If this approach feels right for you, I invite you to book your first appointment.",
                pt: "A primeira sessao e uma introducao: conversamos sobre sua situacao atual, objetivos e expectativas. Depois definimos a frequencia e um plano de acompanhamento. Em alguns casos, proponho exercicios ou leituras curtas entre sessoes. Se essa abordagem fizer sentido para voce, te convido a agendar sua primeira consulta."
              })}
            </p>
          </article>
        </div>

        <button className="pro-primary pro-register-intro-cta" type="button" onClick={props.onContinue}>
          {t(props.language, { es: "Seguimos", en: "Continue", pt: "Continuar" })}
        </button>
      </section>
    </div>
  );
}

export function ProfessionalTherapyDescriptionStep(props: {
  language: AppLanguage;
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [showError, setShowError] = useState(false);
  const minLength = 500;
  const maxLength = 1500;
  const charCount = props.value.length;
  const hasContent = props.value.trim().length > 0;
  const canContinue = charCount >= minLength;

  const handleContinue = () => {
    if (!canContinue) {
      setShowError(true);
      return;
    }

    setShowError(false);
    props.onContinue();
  };

  return (
    <div className="pro-register-intro-shell">
      <section className="pro-form-step-card">
        <header className="pro-form-step-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <div className="pro-form-step-progress" aria-hidden="true">
            <span className="active progress-photo" />
          </div>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-about-step-head">
          <h1>{t(props.language, { es: "Qué puedes esperar en terapia conmigo?", en: "What can you expect from therapy with me?", pt: "O que voce pode esperar da terapia comigo?" })}</h1>
          <small>{charCount}/{maxLength}</small>
        </div>

        <label className={`pro-about-step-field ${showError ? "error" : ""}`}>
          <textarea
            value={props.value}
            onChange={(event) => {
              const nextValue = event.target.value.slice(0, maxLength);
              props.onChange(nextValue);
              if (showError && nextValue.length >= minLength) {
                setShowError(false);
              }
            }}
            placeholder={t(props.language, {
              es: "Cómo es la terapia conmigo?",
              en: "How is therapy with me?",
              pt: "Como e a terapia comigo?"
            })}
          />
        </label>

        <button className="pro-primary pro-register-intro-cta" type="button" onClick={handleContinue} disabled={!hasContent}>
          {t(props.language, { es: "Guardar y continuar", en: "Save and continue", pt: "Salvar e continuar" })}
        </button>

        {showError ? (
          <div className="pro-password-error-sheet" role="alert">
            <p>{t(props.language, { es: "El texto debe tener al menos 500 caracteres.", en: "Text must contain at least 500 characters.", pt: "O texto deve conter pelo menos 500 caracteres." })}</p>
            <button type="button" onClick={() => setShowError(false)}>
              {t(props.language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function ProfessionalSummaryInfoStep(props: { language: AppLanguage; onBack: () => void; onContinue: () => void }) {
  const examples = [
    {
      es: "Mi conocimiento y experiencia en el trabajo con el cuerpo y la mente te ayudarán a convertirte en una persona más completa y feliz. La empatía y la curiosidad me permiten estar ahí y apoyarte en este proceso. Te invito a conocerme.",
      en: "My knowledge and experience working with mind and body will help you become a more complete and happier person. Empathy and curiosity allow me to support you through this process. I invite you to get to know me.",
      pt: "Meu conhecimento e experiencia com mente e corpo vao te ajudar a se tornar uma pessoa mais completa e feliz. Empatia e curiosidade me permitem apoiar voce nesse processo. Te convido a me conhecer."
    },
    {
      es: "Estoy atenta a cada persona, porque cada historia es única. Mi vocación es acompañar procesos reales para que puedas vivir con más calma, claridad y sentido.",
      en: "I am attentive to each person because every story is unique. My vocation is to support real processes so you can live with more calm, clarity, and purpose.",
      pt: "Estou atenta a cada pessoa, porque cada historia e unica. Minha vocacao e acompanhar processos reais para que voce viva com mais calma, clareza e sentido."
    },
    {
      es: "Por mi experiencia, sé que la psicoterapia puede ayudar a resolver dudas, ordenar emociones y tomar decisiones importantes. Soy una profesional cercana, responsable y comprometida con tu proceso.",
      en: "From my experience, psychotherapy can help resolve doubts, organize emotions, and make important decisions. I am a close, responsible professional committed to your process.",
      pt: "Pela minha experiencia, sei que a psicoterapia pode ajudar a resolver duvidas, organizar emocoes e tomar decisoes importantes. Sou uma profissional proxima, responsavel e comprometida com seu processo."
    }
  ];

  return (
    <div className="pro-register-intro-shell">
      <section className="pro-about-info-card">
        <header className="pro-form-step-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <div className="pro-form-step-progress" aria-hidden="true">
            <span className="active progress-photo" />
          </div>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-about-copy">
          <h1>{t(props.language, { es: "Breve descripción", en: "Short description", pt: "Breve descricao" })}</h1>
          <p>
            {t(props.language, {
              es: "Una descripción breve consta de 2 o 3 frases con un máximo de 250 caracteres. Los clientes la ven en su perfil antes de abrirlo. Puede ser una cita o una frase que anime a los clientes a abrir su perfil y ver información sobre usted.",
              en: "A short description has 2 or 3 sentences with up to 250 characters. Clients see it on your profile before opening it. It can be a quote or a sentence that encourages them to open your profile and learn more about you.",
              pt: "Uma breve descricao tem 2 ou 3 frases com ate 250 caracteres. Os clientes veem isso no seu perfil antes de abri-lo. Pode ser uma frase que os incentive a abrir seu perfil e saber mais sobre voce."
            })}
          </p>
        </div>

        <div className="pro-summary-examples">
          <strong>{t(props.language, { es: "Ejemplos", en: "Examples", pt: "Exemplos" })}</strong>
          {examples.map((example) => (
            <article key={example.es} className="pro-summary-example-card">
              <span aria-hidden="true">“</span>
              <p>{t(props.language, example)}</p>
            </article>
          ))}
        </div>

        <button className="pro-primary pro-register-intro-cta" type="button" onClick={props.onContinue}>
          {t(props.language, { es: "Seguimos", en: "Continue", pt: "Continuar" })}
        </button>
      </section>
    </div>
  );
}

export function ProfessionalSummaryStep(props: {
  language: AppLanguage;
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const maxLength = 250;
  const charCount = props.value.length;
  const hasContent = props.value.trim().length > 0;

  return (
    <div className="pro-register-intro-shell">
      <section className="pro-form-step-card">
        <header className="pro-form-step-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <div className="pro-form-step-progress" aria-hidden="true">
            <span className="active progress-photo" />
          </div>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-about-step-head">
          <h1>{t(props.language, { es: "Breve descripción", en: "Short description", pt: "Breve descricao" })}</h1>
          <small>{charCount}/{maxLength}</small>
        </div>

        <label className="pro-about-step-field">
          <textarea
            value={props.value}
            onChange={(event) => props.onChange(event.target.value.slice(0, maxLength))}
            placeholder={t(props.language, {
              es: "Breve descripcion",
              en: "Short description",
              pt: "Breve descricao"
            })}
          />
        </label>

        <button className="pro-primary pro-register-intro-cta" type="button" disabled={!hasContent} onClick={props.onContinue}>
          {t(props.language, { es: "Guardar y continuar", en: "Save and continue", pt: "Salvar e continuar" })}
        </button>
      </section>
    </div>
  );
}

