import { useEffect, useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import {
  PROFESSIONAL_CLIENT_PROBLEM_QUESTIONNAIRE,
  professionalProblemSelectionHasCrisisSentimiento,
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

function optionValueSet(block: ProblemQuestionBlock): Set<string> {
  return new Set(block.options.map((o) => o.valueEs));
}

function otherEntryForBlock(block: ProblemQuestionBlock, values: string[]): string | null {
  if (!block.otherValuePrefixEs) {
    return null;
  }
  const hit = values.find((v) => v.startsWith(block.otherValuePrefixEs));
  if (!hit) {
    return null;
  }
  return hit.slice(block.otherValuePrefixEs.length).trim();
}

function stripBlockOptionValues(block: ProblemQuestionBlock, values: string[]): string[] {
  const allowed = optionValueSet(block);
  return values.filter((v) => !allowed.has(v));
}

export function ProfessionalWorkAreasByClientProblemStep(props: {
  language: AppLanguage;
  values: string[];
  onChange: (values: string[]) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [otherForcedOpen, setOtherForcedOpen] = useState<Partial<Record<ProblemQuestionBlock["id"], boolean>>>({});
  const [crisisGate, setCrisisGate] = useState(false);

  useEffect(() => {
    if (props.values.length === 0) {
      setOtherForcedOpen({});
    }
  }, [props.values.length]);

  useEffect(() => {
    if (crisisGate && !professionalProblemSelectionHasCrisisSentimiento(props.values)) {
      setCrisisGate(false);
    }
  }, [props.values, crisisGate]);

  const otherDrafts = useMemo(() => {
    const drafts: Record<string, string> = {};
    for (const block of PROFESSIONAL_CLIENT_PROBLEM_QUESTIONNAIRE) {
      drafts[block.id] = otherEntryForBlock(block, props.values) ?? "";
    }
    return drafts;
  }, [props.values]);

  const setOtherDraft = (block: ProblemQuestionBlock, text: string) => {
    if (!block.otherValuePrefixEs) {
      return;
    }
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

  const toggleMultiOption = (block: ProblemQuestionBlock, valueEs: string) => {
    const allowed = optionValueSet(block);
    const exclusive = block.exclusiveOptionValueEs;
    if (exclusive && valueEs === exclusive) {
      const withoutBlock = props.values.filter((v) => {
        if (block.otherValuePrefixEs && v.startsWith(block.otherValuePrefixEs)) {
          return false;
        }
        return !allowed.has(v);
      });
      props.onChange([...withoutBlock, exclusive]);
      setOtherForcedOpen((current) => ({ ...current, [block.id]: false }));
      return;
    }
    const base = exclusive ? props.values.filter((v) => v !== exclusive) : props.values;
    const nextValues = base.includes(valueEs) ? base.filter((item) => item !== valueEs) : [...base, valueEs];
    props.onChange(nextValues);
  };

  const chooseSingle = (block: ProblemQuestionBlock, valueEs: string) => {
    const without = stripBlockOptionValues(block, props.values);
    props.onChange([...without, valueEs]);
  };

  const otherHasSavedText = (block: ProblemQuestionBlock) =>
    (otherEntryForBlock(block, props.values) ?? "").length > 0;

  const otherUiOpen = (block: ProblemQuestionBlock) =>
    Boolean(block.otherLabel && (otherForcedOpen[block.id] || otherHasSavedText(block)));

  const toggleOtherChip = (block: ProblemQuestionBlock) => {
    if (!block.otherValuePrefixEs || !block.otherLabel) {
      return;
    }
    if (otherUiOpen(block)) {
      setOtherForcedOpen((current) => ({ ...current, [block.id]: false }));
      props.onChange(props.values.filter((v) => !v.startsWith(block.otherValuePrefixEs!)));
      return;
    }
    if (block.exclusiveOptionValueEs) {
      props.onChange(props.values.filter((v) => v !== block.exclusiveOptionValueEs));
    }
    setOtherForcedOpen((current) => ({ ...current, [block.id]: true }));
  };

  const otherChipSelected = (block: ProblemQuestionBlock) =>
    Boolean(block.otherLabel && (otherForcedOpen[block.id] || otherHasSavedText(block)));

  const tryContinue = () => {
    if (!professionalProblemSelectionIsComplete(props.values)) {
      return;
    }
    if (professionalProblemSelectionHasCrisisSentimiento(props.values)) {
      setCrisisGate(true);
      return;
    }
    props.onContinue();
  };

  if (crisisGate) {
    return (
      <div className="pro-register-intro-shell">
        <section className="pro-profile-select-card pro-crisis-gate-card">
          <header className="pro-form-step-head">
            <button className="pro-register-intro-back" type="button" onClick={() => setCrisisGate(false)} aria-label="Back">
              ←
            </button>
            <div className="pro-form-step-progress" aria-hidden="true">
              <span className="active progress-photo" />
            </div>
            <span className="pro-register-intro-info" aria-hidden="true">i</span>
          </header>

          <div className="pro-crisis-gate-body">
            <h1 className="pro-crisis-gate-title">
              {t(props.language, {
                es: "Tu bienestar es lo primero",
                en: "Your wellbeing comes first",
                pt: "Seu bem-estar vem em primeiro lugar"
              })}
            </h1>
            <p className="pro-crisis-gate-lead">
              {t(props.language, {
                es: "Si estás en peligro inmediato o tenés pensamientos de hacerte daño, buscá ayuda ahora. No estás solo/a.",
                en: "If you are in immediate danger or having thoughts of hurting yourself, seek help now. You are not alone.",
                pt: "Se voce estiver em perigo imediato ou tiver pensamentos de se machucar, busque ajuda agora. Voce nao esta so/a."
              })}
            </p>
            <ul className="pro-crisis-gate-list">
              <li>
                {t(props.language, {
                  es: "Emergencias: llamá al número local (p. ej. 911, 112 o el de tu país) o acudí a la guardia más cercana.",
                  en: "Emergencies: call your local emergency number or go to the nearest ER.",
                  pt: "Emergencias: ligue para o numero local ou va a emergencia mais proxima."
                })}
              </li>
              <li>
                {t(props.language, {
                  es: "Argentina — Línea 135 (CABA y GBA) / 143 atención en crisis y prevención del suicidio.",
                  en: "Argentina — 135 (CABA/GBA) / 143 crisis and suicide prevention line.",
                  pt: "Argentina — Linha 135 / 143."
                })}
              </li>
              <li>
                {t(props.language, {
                  es: "México — SAPTEL 55 5259 8121 (CDMX) u orientación en tu estado.",
                  en: "Mexico — SAPTEL 55 5259 8121 (Mexico City) or local guidance.",
                  pt: "Mexico — SAPTEL 55 5259 8121."
                })}
              </li>
            </ul>
            <p className="pro-crisis-gate-foot">
              {t(props.language, {
                es: "Para seguir con el registro, volvé al cuestionario y elegí otra opción en “¿Cómo te sentís hoy?”.",
                en: "To continue signing up, go back and choose another answer under “How are you feeling today?”.",
                pt: "Para continuar o cadastro, volte e escolha outra opcao em “Como voce se sente hoje?”."
              })}
            </p>
          </div>

          <button className="pro-primary pro-register-intro-cta" type="button" onClick={() => setCrisisGate(false)}>
            {t(props.language, {
              es: "Volver al cuestionario",
              en: "Back to questionnaire",
              pt: "Voltar ao questionario"
            })}
          </button>
        </section>
      </div>
    );
  }

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
                es: "Contanos un poco más",
                en: "Tell us a bit more",
                pt: "Conte-nos um pouco mais"
              })}
            </h1>
            <p>
              {t(props.language, {
                es: "Estas respuestas ayudan a orientar la experiencia. Donde diga, podés marcar varias opciones.",
                en: "These answers help shape the experience. Where indicated, you can select several options.",
                pt: "Essas respostas ajudam a orientar a experiencia. Onde indicado, voce pode marcar varias opcoes."
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
          {PROFESSIONAL_CLIENT_PROBLEM_QUESTIONNAIRE.map((block) => {
            const role = block.selectionMode === "single" ? "radiogroup" : undefined;
            return (
              <section key={block.id} className="pro-problem-section" role={role} aria-labelledby={`pro-q-${block.id}`}>
                <h2 id={`pro-q-${block.id}`}>{t(props.language, block.title)}</h2>
                {block.hint ? <p className="pro-problem-section-hint">{t(props.language, block.hint)}</p> : null}
                <div className="pro-profile-check-list">
                  {block.options.map((option) => {
                    const checked = props.values.includes(option.valueEs);
                    const label = t(props.language, option.label);
                    const desc = option.description ? t(props.language, option.description) : null;
                    const crisisClass = option.isCrisis ? " pro-problem-crisis-option" : "";
                    return (
                      <button
                        key={option.valueEs}
                        className={`pro-profile-check-item${crisisClass} ${checked ? "selected" : ""}`}
                        type="button"
                        role={block.selectionMode === "single" ? "radio" : undefined}
                        aria-checked={checked}
                        aria-pressed={block.selectionMode === "multi" ? checked : undefined}
                        onClick={() =>
                          block.selectionMode === "single"
                            ? chooseSingle(block, option.valueEs)
                            : toggleMultiOption(block, option.valueEs)
                        }
                      >
                        <span className="pro-profile-checkbox" aria-hidden="true" />
                        <span className="pro-problem-option-text">
                          <span className="pro-problem-option-label">{label}</span>
                          {desc ? <span className="pro-problem-option-desc">{desc}</span> : null}
                        </span>
                      </button>
                    );
                  })}
                  {block.otherLabel && block.otherValuePrefixEs ? (
                    <button
                      type="button"
                      className={`pro-profile-check-item ${otherChipSelected(block) ? "selected" : ""}`}
                      onClick={() => toggleOtherChip(block)}
                      aria-pressed={otherChipSelected(block)}
                    >
                      <span className="pro-profile-checkbox" aria-hidden="true" />
                      <span>{t(props.language, block.otherLabel)}</span>
                    </button>
                  ) : null}
                </div>
                {block.otherLabel && block.otherValuePrefixEs && otherUiOpen(block) ? (
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
            );
          })}
        </div>

        <button
          className="pro-primary pro-register-intro-cta"
          type="button"
          disabled={!professionalProblemSelectionIsComplete(props.values)}
          onClick={tryContinue}
        >
          {t(props.language, { es: "Guardar y continuar", en: "Save and continue", pt: "Salvar e continuar" })}
        </button>
      </section>
    </div>
  );
}
