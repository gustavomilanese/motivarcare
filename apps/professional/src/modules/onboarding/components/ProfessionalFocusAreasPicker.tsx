import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { PROFESSIONAL_ATTENTION_AREA_COUPLES_ES } from "../constants/professionalAttentionAreas";
import { PROFESSIONAL_ATTENTION_AREA_GROUPS } from "../constants/professionalAttentionAreaGroups";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfessionalFocusAreasPicker(props: {
  language: AppLanguage;
  selected: readonly string[];
  onToggle: (area: string) => void;
  isCurrentStep?: boolean;
  onContinueToTherapy?: () => void;
}) {
  const selectedCount = props.selected.length;
  const canContinue = selectedCount > 0 && Boolean(props.onContinueToTherapy);

  return (
    <div className="pro-web-focus-areas-panel">
      {selectedCount > 0 ? (
        <p className="pro-web-focus-areas-count" aria-live="polite">
          {t(props.language, {
            es: `${selectedCount} seleccionada${selectedCount === 1 ? "" : "s"}`,
            en: `${selectedCount} selected`,
            pt: `${selectedCount} selecionada${selectedCount === 1 ? "" : "s"}`
          })}
        </p>
      ) : null}

      <div className="pro-web-focus-groups">
        {PROFESSIONAL_ATTENTION_AREA_GROUPS.map((group) => {
          const groupSelected = group.areas.filter((area) => props.selected.includes(area)).length;
          return (
            <section
              className={`pro-web-focus-group${groupSelected > 0 ? " has-selection" : ""}`}
              key={group.id}
              aria-labelledby={`pro-focus-group-${group.id}`}
            >
              <div className="pro-web-focus-group-head">
                <h4 className="pro-web-focus-group-title" id={`pro-focus-group-${group.id}`}>
                  {t(props.language, group.title)}
                </h4>
                {groupSelected > 0 ? (
                  <span className="pro-web-focus-group-count">{groupSelected}</span>
                ) : null}
              </div>
              <div className="pro-web-focus-check-list" role="group" aria-label={t(props.language, group.title)}>
                {group.areas.map((area) => {
                  const active = props.selected.includes(area);
                  const isCouples = area === PROFESSIONAL_ATTENTION_AREA_COUPLES_ES;
                  return (
                    <button
                      key={area}
                      type="button"
                      className={`pro-profile-check-item pro-web-focus-check-item${active ? " selected" : ""}${isCouples ? " pro-web-focus-check-item--couples" : ""}`}
                      aria-pressed={active}
                      onClick={() => props.onToggle(area)}
                    >
                      <span className="pro-profile-checkbox" aria-hidden="true" />
                      <span>{area}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {props.isCurrentStep ? (
        <footer className="pro-web-focus-areas-footer">
          <button
            type="button"
            className={`pro-web-focus-areas-continue${canContinue ? " pro-primary" : " pro-secondary"}`}
            disabled={!canContinue}
            onClick={() => props.onContinueToTherapy?.()}
          >
            {t(props.language, {
              es: "Continuar a tipos de terapia →",
              en: "Continue to therapy types →",
              pt: "Continuar para tipos de terapia →"
            })}
          </button>
        </footer>
      ) : null}
    </div>
  );
}
