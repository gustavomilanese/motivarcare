import { useEffect, useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import {
  PROFESSIONAL_CLIENT_PROBLEM_QUESTIONNAIRE,
  professionalProblemSelectionIsComplete,
  type ProblemQuestionBlock
} from "../../constants/professionalClientProblemQuestionnaire";

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

function otherEntryForBlock(block: ProblemQuestionBlock, values: string[]): string | null {
  const prefix = block.otherValuePrefixEs;
  const hit = values.find((v) => v.startsWith(prefix));
  if (!hit) {
    return null;
  }
  return hit.slice(prefix.length).trim();
}

export function ProfessionalWorkAreasByClientProblemStep(props: {
  language: AppLanguage;
  values: string[];
  onChange: (values: string[]) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [otherForcedOpen, setOtherForcedOpen] = useState<Partial<Record<ProblemQuestionBlock["id"], boolean>>>({});

  useEffect(() => {
    if (props.values.length === 0) {
      setOtherForcedOpen({});
    }
  }, [props.values.length]);

  const otherDrafts = useMemo(() => {
    const drafts: Record<string, string> = {};
    for (const block of PROFESSIONAL_CLIENT_PROBLEM_QUESTIONNAIRE) {
      drafts[block.id] = otherEntryForBlock(block, props.values) ?? "";
    }
    return drafts;
  }, [props.values]);

  const setOtherDraft = (block: ProblemQuestionBlock, text: string) => {
    const prefix = block.otherValuePrefixEs;
    const without = props.values.filter((v) => !v.startsWith(prefix));
    const trimmed = text.trim();
    if (!trimmed) {
      props.onChange(without);
      return;
    }
    const entry = `${prefix} ${trimmed}`.slice(0, 400);
    props.onChange([...without, entry]);
  };

  const toggleOption = (valueEs: string) => {
    const nextValues = props.values.includes(valueEs)
      ? props.values.filter((item) => item !== valueEs)
      : [...props.values, valueEs];
    props.onChange(nextValues);
  };

  const otherHasSavedText = (block: ProblemQuestionBlock) =>
    (otherEntryForBlock(block, props.values) ?? "").length > 0;

  const otherUiOpen = (block: ProblemQuestionBlock) =>
    Boolean(otherForcedOpen[block.id] || otherHasSavedText(block));

  const toggleOtherChip = (block: ProblemQuestionBlock) => {
    if (otherUiOpen(block)) {
      setOtherForcedOpen((current) => ({ ...current, [block.id]: false }));
      props.onChange(props.values.filter((v) => !v.startsWith(block.otherValuePrefixEs)));
      return;
    }
    setOtherForcedOpen((current) => ({ ...current, [block.id]: true }));
  };

  const otherChipSelected = (block: ProblemQuestionBlock) =>
    Boolean(otherForcedOpen[block.id] || otherHasSavedText(block));

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
            <h1>
              {t(props.language, {
                es: "Cuestionario de enfoque clínico",
                en: "Clinical focus questionnaire",
                pt: "Questionario de foco clinico"
              })}
            </h1>
            <p>
              {t(props.language, {
                es: "Indicá con qué motivos, objetivos y preferencias trabajás en la práctica.",
                en: "Indicate which motives, goals, and preferences you work with in practice.",
                pt: "Indique com quais motivos, objetivos e preferencias voce trabalha na pratica."
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
          {PROFESSIONAL_CLIENT_PROBLEM_QUESTIONNAIRE.map((block) => (
            <section key={block.id} className="pro-problem-section" aria-labelledby={`pro-q-${block.id}`}>
              <h2 id={`pro-q-${block.id}`}>{t(props.language, block.title)}</h2>
              {block.hint ? <p className="pro-problem-section-hint">{t(props.language, block.hint)}</p> : null}
              <div className="pro-profile-check-list">
                {block.options.map((option) => {
                  const checked = props.values.includes(option.valueEs);
                  const label = t(props.language, option.label);
                  return (
                    <button
                      key={option.valueEs}
                      className={`pro-profile-check-item ${checked ? "selected" : ""}`}
                      type="button"
                      onClick={() => toggleOption(option.valueEs)}
                      aria-pressed={checked}
                    >
                      <span className="pro-profile-checkbox" aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={`pro-profile-check-item ${otherChipSelected(block) ? "selected" : ""}`}
                  onClick={() => toggleOtherChip(block)}
                  aria-pressed={otherChipSelected(block)}
                >
                  <span className="pro-profile-checkbox" aria-hidden="true" />
                  <span>{t(props.language, block.otherLabel)}</span>
                </button>
              </div>
              {otherUiOpen(block) ? (
                <label className="pro-problem-other-field">
                  <span className="sr-only">{t(props.language, block.otherLabel)}</span>
                  <textarea
                    rows={2}
                    value={otherDrafts[block.id] ?? ""}
                    placeholder={t(props.language, {
                      es: "Especificá brevemente…",
                      en: "Briefly specify…",
                      pt: "Especifique brevemente…"
                    })}
                    onChange={(event) => setOtherDraft(block, event.target.value)}
                  />
                </label>
              ) : null}
            </section>
          ))}
        </div>

        <button
          className="pro-primary pro-register-intro-cta"
          type="button"
          disabled={!professionalProblemSelectionIsComplete(props.values)}
          onClick={props.onContinue}
        >
          {t(props.language, { es: "Guardar y continuar", en: "Save and continue", pt: "Salvar e continuar" })}
        </button>
      </section>
    </div>
  );
}
