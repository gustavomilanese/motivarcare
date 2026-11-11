import { type AppLanguage } from "@therapy/i18n-config";
import { intakeApproachIcon, intakeApproachTone } from "../lib/intakeApproachIcons";
import { intakeOptionLabel, intakeOptionSubtext } from "../lib/intakeOptionLabels";

export function IntakeApproachCards(props: {
  language: AppLanguage;
  options: string[];
  optionSubtexts?: string[];
  selected: ReadonlySet<string>;
  exclusiveOptionEs?: string;
  onToggle: (option: string) => void;
}) {
  return (
    <div className="intake-approach" role="group" aria-multiselectable>
      <ul className="intake-approach-mosaic">
        {props.options.map((option, index) => {
          const isExclusive = Boolean(props.exclusiveOptionEs && option === props.exclusiveOptionEs);
          const pressed = props.selected.has(option);
          const sub = props.optionSubtexts?.[index] ?? intakeOptionSubtext(props.language, option);
          return (
            <li
              key={option}
              className={isExclusive ? "intake-approach-cell intake-approach-cell--wide" : "intake-approach-cell"}
            >
              <button
                type="button"
                className={`intake-approach-tile${pressed ? " is-active" : ""}${isExclusive ? " is-provisional" : ""}`}
                aria-pressed={pressed}
                onClick={() => props.onToggle(option)}
              >
                <span
                  className={`intake-approach-ico intake-approach-ico--${intakeApproachTone(index)}`}
                  aria-hidden="true"
                >
                  {intakeApproachIcon(option, 24)}
                </span>
                <strong>{intakeOptionLabel(props.language, option)}</strong>
                {sub ? <em>{sub}</em> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
