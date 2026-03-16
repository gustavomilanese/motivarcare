import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfessionalWorkAreasStep(props: {
  language: AppLanguage;
  values: string[];
  onChange: (values: string[]) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const options = [
    { es: "Terapia cognitivo-conductual", en: "Cognitive-behavioral therapy", pt: "Terapia cognitivo-comportamental" },
    { es: "Psicoterapia positiva", en: "Positive psychotherapy", pt: "Psicoterapia positiva" },
    { es: "Arteterapia", en: "Art therapy", pt: "Arteterapia" },
    { es: "Sexologia", en: "Sexology", pt: "Sexologia" },
    { es: "Trastornos alimenticios", en: "Eating disorders", pt: "Transtornos alimentares" },
    { es: "Enfoque integrador", en: "Integrative approach", pt: "Abordagem integrativa" },
    { es: "Psicologia infantil y adolescente", en: "Child and adolescent psychology", pt: "Psicologia infantil e adolescente" },
    { es: "Terapia corporal", en: "Body therapy", pt: "Terapia corporal" },
    { es: "Terapia familiar y de pareja", en: "Family and couples therapy", pt: "Terapia familiar e de casal" },
    { es: "Psicosomatica", en: "Psychosomatic", pt: "Psicossomatica" },
    { es: "Asesoramiento en crisis", en: "Crisis counseling", pt: "Aconselhamento em crise" },
    { es: "Mindfulness", en: "Mindfulness", pt: "Mindfulness" },
    { es: "Mapas asociativos metaforicos", en: "Metaphorical associative maps", pt: "Mapas associativos metaforicos" },
    { es: "Terapia dialectica conductual", en: "Dialectical behavior therapy", pt: "Terapia dialetica comportamental" },
    { es: "Enfoque Gestalt", en: "Gestalt approach", pt: "Abordagem Gestalt" },
    { es: "Symboldrama", en: "Symboldrama", pt: "Symboldrama" },
    { es: "Psicoanalisis", en: "Psychoanalysis", pt: "Psicanalise" },
    { es: "Terapia de arena", en: "Sand therapy", pt: "Terapia de areia" },
    { es: "Analisis transaccional", en: "Transactional analysis", pt: "Analise transacional" }
  ].map((option) => t(props.language, option));

  const toggleOption = (option: string) => {
    const nextValues = props.values.includes(option)
      ? props.values.filter((item) => item !== option)
      : [...props.values, option];
    props.onChange(nextValues);
  };

  return (
    <div className="pro-register-intro-shell">
      <section className="pro-profile-select-card">
        <header className="pro-form-step-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <div className="pro-form-step-progress" aria-hidden="true">
            <span className="active progress-photo" />
          </div>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-profile-select-head">
          <div className="pro-profile-select-copy">
            <h1>{t(props.language, { es: "areas de trabajo", en: "Areas of work", pt: "areas de atuacao" })}</h1>
            <p>
              {t(props.language, {
                es: "Seleccione todo lo que sea relevante para usted. Puede elegir un numero limitado.",
                en: "Select everything relevant to you. You can choose a limited number.",
                pt: "Selecione tudo o que for relevante para voce. Voce pode escolher um numero limitado."
              })}
            </p>
          </div>

          <button
            className="pro-profile-clear"
            type="button"
            onClick={() => props.onChange([])}
            disabled={props.values.length === 0}
          >
            {t(props.language, { es: "Deseleccionar todo", en: "Clear all", pt: "Limpar tudo" })}
          </button>
        </div>

        <div className="pro-profile-check-list">
          {options.map((option) => {
            const checked = props.values.includes(option);

            return (
              <button
                key={option}
                className={`pro-profile-check-item ${checked ? "selected" : ""}`}
                type="button"
                onClick={() => toggleOption(option)}
                aria-pressed={checked}
              >
                <span className="pro-profile-checkbox" aria-hidden="true" />
                <span>{option}</span>
              </button>
            );
          })}
        </div>

        <button
          className="pro-primary pro-register-intro-cta"
          type="button"
          disabled={props.values.length === 0}
          onClick={props.onContinue}
        >
          {t(props.language, { es: "Guardar y continuar", en: "Save and continue", pt: "Salvar e continuar" })}
        </button>
      </section>
    </div>
  );
}

export function ProfessionalWorkLanguagesStep(props: {
  language: AppLanguage;
  values: string[];
  onChange: (values: string[]) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const options = [
    { es: "Ingles", en: "English", pt: "Ingles" },
    { es: "Polaco", en: "Polish", pt: "Polones" },
    { es: "Ucraniano", en: "Ukrainian", pt: "Ucraniano" },
    { es: "Espanol", en: "Spanish", pt: "Espanhol" },
    { es: "Ruso", en: "Russian", pt: "Russo" }
  ].map((option) => t(props.language, option));

  const toggleOption = (option: string) => {
    const nextValues = props.values.includes(option)
      ? props.values.filter((item) => item !== option)
      : [...props.values, option];
    props.onChange(nextValues);
  };

  return (
    <div className="pro-register-intro-shell">
      <section className="pro-profile-select-card">
        <header className="pro-form-step-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <div className="pro-form-step-progress" aria-hidden="true">
            <span className="active progress-photo" />
          </div>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-profile-select-head">
          <div className="pro-profile-select-copy">
            <h1>{t(props.language, { es: "Idiomas en los que trabaja", en: "Working languages", pt: "Idiomas de trabalho" })}</h1>
            <p>
              {t(props.language, {
                es: "Seleccione todo lo que sea relevante para usted. Puede elegir un numero limitado.",
                en: "Select everything relevant to you. You can choose a limited number.",
                pt: "Selecione tudo o que for relevante para voce. Voce pode escolher um numero limitado."
              })}
            </p>
          </div>

          <button
            className="pro-profile-clear"
            type="button"
            onClick={() => props.onChange([])}
            disabled={props.values.length === 0}
          >
            {t(props.language, { es: "Deseleccionar todo", en: "Clear all", pt: "Limpar tudo" })}
          </button>
        </div>

        <div className="pro-profile-check-list">
          {options.map((option) => {
            const checked = props.values.includes(option);

            return (
              <button
                key={option}
                className={`pro-profile-check-item ${checked ? "selected" : ""}`}
                type="button"
                onClick={() => toggleOption(option)}
                aria-pressed={checked}
              >
                <span className="pro-profile-checkbox" aria-hidden="true" />
                <span>{option}</span>
              </button>
            );
          })}
        </div>

        <button
          className="pro-primary pro-register-intro-cta"
          type="button"
          disabled={props.values.length === 0}
          onClick={props.onContinue}
        >
          {t(props.language, { es: "Guardar y continuar", en: "Save and continue", pt: "Salvar e continuar" })}
        </button>
      </section>
    </div>
  );
}

export function ProfessionalWorkAreasByClientProblemStep(props: {
  language: AppLanguage;
  values: string[];
  onChange: (values: string[]) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const sections = [
    {
      title: { es: "Fobias", en: "Phobias", pt: "Fobias" },
      items: [
        { es: "Miedo a volar", en: "Fear of flying", pt: "Medo de voar" },
        { es: "Miedo a conducir", en: "Fear of driving", pt: "Medo de dirigir" },
        { es: "Claustrofobia", en: "Claustrophobia", pt: "Claustrofobia" },
        { es: "Agorafobia", en: "Agoraphobia", pt: "Agorafobia" },
        { es: "Fobia social", en: "Social phobia", pt: "Fobia social" }
      ]
    },
    {
      title: { es: "Ansiedad y panico", en: "Anxiety and panic", pt: "Ansiedade e panico" },
      items: [
        { es: "Ansiedad generalizada", en: "Generalized anxiety", pt: "Ansiedade generalizada" },
        { es: "Ataques de panico", en: "Panic attacks", pt: "Ataques de panico" },
        { es: "Estres cronico", en: "Chronic stress", pt: "Estresse cronico" },
        { es: "Insomnio por ansiedad", en: "Anxiety insomnia", pt: "Insomnia por ansiedade" }
      ]
    },
    {
      title: { es: "Desarrollo personal", en: "Personal development", pt: "Desenvolvimento pessoal" },
      items: [
        { es: "Aumentar la autoestima", en: "Self-esteem", pt: "Autoestima" },
        { es: "Gestion de emociones", en: "Emotional management", pt: "Gestao emocional" },
        { es: "Procrastinacion", en: "Procrastination", pt: "Procrastinacao" },
        { es: "Habitos saludables", en: "Healthy habits", pt: "Habitos saudaveis" }
      ]
    },
    {
      title: { es: "Relaciones de pareja", en: "Couple relationships", pt: "Relacionamentos" },
      items: [
        { es: "Conflictos de pareja", en: "Relationship conflicts", pt: "Conflitos no casal" },
        { es: "Celos y desconfianza", en: "Jealousy and distrust", pt: "Ciumes e desconfianca" },
        { es: "Separacion o divorcio", en: "Separation or divorce", pt: "Separacao ou divorcio" },
        { es: "Dependencia emocional", en: "Emotional dependency", pt: "Dependencia emocional" }
      ]
    },
    {
      title: { es: "Traumas y eventos vitales", en: "Trauma and life events", pt: "Trauma e eventos de vida" },
      items: [
        { es: "Duelo", en: "Grief", pt: "Luto" },
        { es: "Trauma infantil", en: "Childhood trauma", pt: "Trauma infantil" },
        { es: "Violencia psicologica", en: "Psychological abuse", pt: "Violencia psicologica" },
        { es: "Cambios de vida", en: "Life transitions", pt: "Mudancas de vida" }
      ]
    },
    {
      title: { es: "Adicciones", en: "Addictions", pt: "Dependencias" },
      items: [
        { es: "Alcohol", en: "Alcohol", pt: "Alcool" },
        { es: "Sustancias", en: "Substances", pt: "Substancias" },
        { es: "Juego compulsivo", en: "Compulsive gambling", pt: "Jogo compulsivo" },
        { es: "Uso problematico de pantallas", en: "Problematic screen use", pt: "Uso excessivo de telas" }
      ]
    },
    {
      title: { es: "Infancia y adolescencia", en: "Childhood and adolescence", pt: "Infancia e adolescencia" },
      items: [
        { es: "Conducta desafiante", en: "Defiant behavior", pt: "Comportamento desafiador" },
        { es: "Dificultades escolares", en: "School difficulties", pt: "Dificuldades escolares" },
        { es: "Bullying", en: "Bullying", pt: "Bullying" },
        { es: "Vinculo con padres", en: "Parent bond", pt: "Vinculo com os pais" }
      ]
    }
  ].map((section) => ({
    title: t(props.language, section.title),
    items: section.items.map((item) => t(props.language, item))
  }));

  const toggleOption = (option: string) => {
    const nextValues = props.values.includes(option)
      ? props.values.filter((item) => item !== option)
      : [...props.values, option];
    props.onChange(nextValues);
  };

  return (
    <div className="pro-register-intro-shell">
      <section className="pro-profile-select-card pro-problem-select-card">
        <header className="pro-form-step-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <div className="pro-form-step-progress" aria-hidden="true">
            <span className="active progress-photo" />
          </div>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-profile-select-head">
          <div className="pro-profile-select-copy">
            <h1>{t(props.language, { es: "Seleccione con que ayuda trabaja", en: "Select what you help with", pt: "Selecione com o que voce trabalha" })}</h1>
            <p>
              {t(props.language, {
                es: "Marque todo lo que sea relevante para usted.",
                en: "Select everything relevant to your practice.",
                pt: "Marque tudo o que for relevante para sua pratica."
              })}
            </p>
          </div>

          <button
            className="pro-profile-clear"
            type="button"
            onClick={() => props.onChange([])}
            disabled={props.values.length === 0}
          >
            {t(props.language, { es: "Deseleccionar todo", en: "Clear all", pt: "Limpar tudo" })}
          </button>
        </div>

        <div className="pro-problem-sections">
          {sections.map((section) => (
            <section key={section.title} className="pro-problem-section">
              <h2>{section.title}</h2>
              <div className="pro-profile-check-list">
                {section.items.map((option) => {
                  const checked = props.values.includes(option);

                  return (
                    <button
                      key={option}
                      className={`pro-profile-check-item ${checked ? "selected" : ""}`}
                      type="button"
                      onClick={() => toggleOption(option)}
                      aria-pressed={checked}
                    >
                      <span className="pro-profile-checkbox" aria-hidden="true" />
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <button
          className="pro-primary pro-register-intro-cta"
          type="button"
          disabled={props.values.length === 0}
          onClick={props.onContinue}
        >
          {t(props.language, { es: "Guardar y continuar", en: "Save and continue", pt: "Salvar e continuar" })}
        </button>
      </section>
    </div>
  );
}
