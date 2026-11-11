import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import {
  PATIENT_COUPLES_THERAPY_FOCUS_OPTIONS_ES,
  PATIENT_INDIVIDUAL_MAIN_REASON_OPTIONS_ES
} from "../patientClinicalIntakeQuestions";
import {
  detectMainReasonCategory,
  individualMainReasonPieces,
  intakeMainReasonPieces,
  type MainReasonCategory
} from "../lib/patientMainReason";
import { intakeOptionLabel } from "../lib/intakeOptionLabels";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

const OTHER_OPTION_ES = "Otro";

export function PatientMainReasonStep(props: {
  language: AppLanguage;
  title: string;
  help: string;
  mainReason: string;
  couplesFocus: string;
  onCategoryChange: (category: MainReasonCategory) => void;
  onToggleIndividual: (option: string) => void;
  onToggleCouplesFocus: (option: string) => void;
  onOtherDetailChange: (detail: string) => void;
}) {
  const category = detectMainReasonCategory(props.mainReason, props.couplesFocus);
  const individualSelected = individualMainReasonPieces(props.mainReason);
  const couplesSelected = intakeMainReasonPieces(props.couplesFocus);
  const otherDetail = (() => {
    const hit = individualSelected.find((piece) => piece.startsWith(`${OTHER_OPTION_ES}:`));
    return hit ? hit.slice(OTHER_OPTION_ES.length + 1).trim() : "";
  })();
  const showOtherFollowup =
    individualSelected.includes(OTHER_OPTION_ES)
    || individualSelected.some((piece) => piece.startsWith(`${OTHER_OPTION_ES}:`));

  return (
    <article
      className={`question-card question-card--wizard intake-main-reason-step${
        category === "couples" ? " intake-main-reason-step--couples" : ""
      }`}
    >
      <h2 className="intake-question-title">{props.title}</h2>
      <p className="intake-question-help">{props.help}</p>

      <section className="intake-main-reason-block" aria-label={t(props.language, {
        es: "Tipo de terapia",
        en: "Therapy type",
        pt: "Tipo de terapia"
      })}>
        <p className="intake-main-reason-kicker">
          {t(props.language, { es: "Tipo de terapia", en: "Therapy type", pt: "Tipo de terapia" })}
        </p>
        <div className="intake-main-reason-categories" role="tablist" aria-label={props.title}>
          <button
            type="button"
            role="tab"
            aria-selected={category === "individual"}
            className={`intake-main-reason-category${category === "individual" ? " intake-main-reason-category--active" : ""}`}
            onClick={() => props.onCategoryChange("individual")}
          >
            <span className="intake-main-reason-category-label">
              {t(props.language, {
                es: "Terapia individual",
                en: "Individual therapy",
                pt: "Terapia individual"
              })}
            </span>
            <span className="intake-main-reason-category-hint">
              {t(props.language, {
                es: "Para vos",
                en: "For you",
                pt: "Para voce"
              })}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={category === "couples"}
            className={`intake-main-reason-category intake-main-reason-category--couples${
              category === "couples" ? " intake-main-reason-category--active" : ""
            }`}
            onClick={() => props.onCategoryChange("couples")}
          >
            <span className="intake-main-reason-category-label">
              {t(props.language, {
                es: "Terapia de pareja",
                en: "Couples therapy",
                pt: "Terapia de casal"
              })}
            </span>
            <span className="intake-main-reason-category-hint">
              {t(props.language, {
                es: "Con tu pareja",
                en: "With your partner",
                pt: "Com seu par"
              })}
            </span>
          </button>
        </div>
      </section>

      {category === "individual" ? (
        <section className="intake-main-reason-block" aria-labelledby="intake-main-reason-motives-title">
          <p className="intake-main-reason-kicker" id="intake-main-reason-motives-title">
            {t(props.language, { es: "Motivos", en: "Reasons", pt: "Motivos" })}
          </p>
          <div className="intake-main-reason-panel" role="tabpanel">
            <p className="intake-main-reason-panel-lead">
              {t(props.language, {
                es: "Marcá uno o varios. Podés combinarlos.",
                en: "Pick one or more. You can combine them.",
                pt: "Marque um ou mais. Pode combinar."
              })}
            </p>
            <div className="intake-main-reason-tags" role="group" aria-multiselectable>
              {PATIENT_INDIVIDUAL_MAIN_REASON_OPTIONS_ES.map((option) => {
                const selected =
                  individualSelected.includes(option)
                  || (option === OTHER_OPTION_ES
                    && individualSelected.some((piece) => piece.startsWith(`${OTHER_OPTION_ES}:`)));
                return (
                  <button
                    key={option}
                    type="button"
                    className={`intake-reason-tag${selected ? " is-active" : ""}`}
                    aria-pressed={selected}
                    onClick={() => props.onToggleIndividual(option)}
                  >
                    <span className="intake-option-chip-label">{intakeOptionLabel(props.language, option)}</span>
                  </button>
                );
              })}
            </div>
            {showOtherFollowup ? (
              <label className="intake-other-followup">
                <span className="intake-question-help">
                  {t(props.language, {
                    es: "Detalle (obligatorio si elegiste «Otro»)",
                    en: "Details (required if you picked “Other”)",
                    pt: "Detalhes (obrigatorio se escolheu “Outro”)"
                  })}
                </span>
                <textarea
                  className="intake-textarea-touch"
                  rows={3}
                  value={otherDetail}
                  onChange={(event) => props.onOtherDetailChange(event.target.value)}
                  placeholder={t(props.language, {
                    es: "Escribí brevemente…",
                    en: "Briefly describe…",
                    pt: "Descreva brevemente…"
                  })}
                />
              </label>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="intake-main-reason-block" aria-labelledby="intake-main-reason-couples-title">
          <p className="intake-main-reason-kicker" id="intake-main-reason-couples-title">
            {t(props.language, { es: "Enfoque de pareja", en: "Couples focus", pt: "Foco do casal" })}
          </p>
          <div className="intake-main-reason-panel intake-main-reason-panel--couples" role="tabpanel">
            <p className="intake-main-reason-panel-lead">
              {t(props.language, {
                es: "¿Qué aspectos querés trabajar?",
                en: "What aspects do you want to work on?",
                pt: "Quais aspectos voce quer trabalhar?"
              })}
            </p>
            <p className="intake-main-reason-panel-sub">
              {t(props.language, {
                es: "Elegí uno o varios. Nos ayuda a orientar el match.",
                en: "Pick one or more. This helps guide your match.",
                pt: "Escolha um ou mais. Isso ajuda a orientar o match."
              })}
            </p>
            <div className="intake-main-reason-tags" role="group" aria-multiselectable>
              {PATIENT_COUPLES_THERAPY_FOCUS_OPTIONS_ES.map((optionEs) => {
                const isSelected = couplesSelected.includes(optionEs);
                return (
                  <button
                    key={optionEs}
                    type="button"
                    className={`intake-reason-tag${isSelected ? " is-active" : ""}`}
                    aria-pressed={isSelected}
                    onClick={() => props.onToggleCouplesFocus(optionEs)}
                  >
                    <span className="intake-option-chip-label">
                      {intakeOptionLabel(props.language, optionEs)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
