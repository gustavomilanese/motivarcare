export function IntakeChoicePills(props: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  labelFor?: (option: string) => string;
  showLabel?: boolean;
}) {
  return (
    <div className="intake-pill-row">
      {props.showLabel === false ? null : <p className="intake-pill-row-label">{props.label}</p>}
      <div className="intake-option-grid" role="group" aria-label={props.label}>
        {props.options.map((option) => {
          const selected = option === props.value;
          return (
            <button
              key={option}
              type="button"
              className={`intake-option-chip ${selected ? "intake-option-chip--selected" : ""}`}
              aria-pressed={selected}
              onClick={() => props.onChange(option)}
            >
              <span className="intake-option-chip-label">{props.labelFor ? props.labelFor(option) : option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
