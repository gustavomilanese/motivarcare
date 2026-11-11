import type { SortOption, TranslationFn } from "../types";

/** Count + Compatibilidad/Precio · vive en la columna de la lista, no en el rail. */
export function MatchingListSortBar(props: {
  countLabel: string;
  sortMode: string;
  sortOptions: SortOption[];
  onSortModeChange: (value: string) => void;
  t: TranslationFn;
  onDeferTherapistSelection?: () => void;
}) {
  return (
    <div
      className="patient-matching-hero-toolbar"
      role="toolbar"
      aria-label={props.t({ es: "Acciones de la lista", en: "List actions", pt: "Acoes da lista" })}
    >
      {props.countLabel ? <span className="patient-matching-count">{props.countLabel}</span> : null}
      <div className="patient-matching-sort-pills" role="group" aria-label={props.t({ es: "Ordenar por", en: "Sort by", pt: "Ordenar por" })}>
        {props.sortOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`patient-matching-sort-pill ${props.sortMode === option.value ? "is-active" : ""}`}
            aria-pressed={props.sortMode === option.value}
            onClick={() => props.onSortModeChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {props.onDeferTherapistSelection ? (
        <button type="button" className="patient-matching-defer-link" onClick={() => void props.onDeferTherapistSelection?.()}>
          {props.t({
            es: "Más tarde",
            en: "Later",
            pt: "Depois"
          })}
        </button>
      ) : null}
    </div>
  );
}
