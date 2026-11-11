import { type AppLanguage } from "@therapy/i18n-config";
import {
  intakeWideChoiceIcon,
  intakeWideChoiceProvisional,
  intakeWideChoiceTone
} from "../lib/intakeWideChoiceIcons";
import { intakeOptionLabel } from "../lib/intakeOptionLabels";

export function IntakeIconTiles(props: {
  language: AppLanguage;
  options: string[];
  value: string;
  columns?: 2 | 3;
  onSelect: (option: string) => void;
}) {
  const columns = props.columns ?? 2;
  return (
    <div
      className={`intake-icon-tiles intake-icon-tiles--${columns}`}
      role="group"
      aria-label={props.options.join(", ")}
    >
      <ul className="intake-icon-tiles-list">
        {props.options.map((option) => {
          const active = props.value === option;
          const provisional = intakeWideChoiceProvisional(option);
          return (
            <li key={option} className={provisional ? "intake-icon-tiles-item is-wide" : "intake-icon-tiles-item"}>
              <button
                type="button"
                className={`intake-icon-tile${active ? " is-active" : ""}${provisional ? " is-provisional" : ""}`}
                aria-pressed={active}
                onClick={() => props.onSelect(option)}
              >
                <span
                  className={`intake-icon-tile-ico intake-icon-tile-ico--${intakeWideChoiceTone(option)}`}
                  aria-hidden="true"
                >
                  {intakeWideChoiceIcon(option)}
                </span>
                <strong>{intakeOptionLabel(props.language, option)}</strong>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
