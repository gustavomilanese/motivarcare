import type { SortOption, TranslationFn } from "../types";

export function MatchingHeader(props: {
  minimal: boolean;
  heading: string;
  description: string;
  countLabel: string;
  sortOpen: boolean;
  onToggleSort: () => void;
  sortMode: string;
  onSortModeChange: (value: string) => void;
  sortOptions: SortOption[];
  t: TranslationFn;
}) {
  return (
    <section className={`content-card patient-matching-hero ${props.minimal ? "minimal" : ""}`}>
      <h2>{props.heading}</h2>
      {props.description ? <p>{props.description}</p> : null}
      {props.countLabel ? <strong className="patient-matching-count">{props.countLabel}</strong> : null}

      <div className="patient-matching-actions">
        <button
          type="button"
          className={props.sortOpen ? "active" : ""}
          onClick={props.onToggleSort}
        >
          <span aria-hidden="true">↕</span>
          {props.t({ es: "Clasificación", en: "Sort", pt: "Classificacao" })}
        </button>
      </div>

      {props.sortOpen ? (
        <div className="patient-sort-sheet" role="dialog" aria-label={props.t({ es: "Ordenar por", en: "Sort by", pt: "Ordenar por" })}>
          <h4>{props.t({ es: "Ordenar por", en: "Sort by", pt: "Ordenar por" })}</h4>
          <div className="patient-sort-options">
            {props.sortOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`patient-sort-option ${props.sortMode === option.value ? "selected" : ""}`}
                onClick={() => props.onSortModeChange(option.value)}
              >
                <span>{option.label}</span>
                <i aria-hidden="true">{props.sortMode === option.value ? "◉" : "○"}</i>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
